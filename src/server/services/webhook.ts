import crypto from "crypto";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import type {
  Order,
  OrderItem,
  Customer,
  WebhookDelivery,
  Prisma,
} from "@prisma/client";

// Types for webhook payloads
export interface WebhookPayload {
  event: "order.completed" | "order.failed" | "order.status_changed";
  orderId: string;
  internalOrderId: string;
  status: string;
  processedAt: string;
  pricing?: {
    originalTotal: number;
    processedTotal?: number;
    processingFee?: number;
    shippingCost?: number;
    notes?: string;
  };
  items: Array<{
    id: string;
    originalPrice: number;
    processedPrice?: number;
    quantity: number;
    status: string;
    taobaoData?: {
      verified: boolean;
      actualPrice?: number;
      availability?: string;
    };
  }>;
  processingNotes?: string;
  metadata: {
    webhookId: string;
    timestamp: string;
    version: string;
  };
}

export interface WebhookTestResult {
  success: boolean;
  status?: number;
  responseTime?: number;
  error?: string;
  responseBody?: string;
}

export class WebhookService {
  private readonly WEBHOOK_VERSION = "1.0.0";
  private readonly WEBHOOK_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 20;

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");
  }

  /**
   * Validate HMAC signature for incoming webhook
   */
  public validateSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  }

  /**
   * Get or create webhook secret for customer
   */
  private async getWebhookSecret(customerId: string): Promise<string> {
    try {
      let webhookSecret = await db.webhookSecret.findUnique({
        where: { customerId },
      });

      if (!webhookSecret) {
        // Generate new secret
        const secret = crypto.randomBytes(32).toString("hex");
        webhookSecret = await db.webhookSecret.create({
          data: {
            customerId,
            secret,
          },
        });
      }

      return webhookSecret.secret;
    } catch (error) {
      console.error("Error getting webhook secret:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get webhook secret",
      });
    }
  }

  /**
   * Create webhook payload from order data
   */
  private async createWebhookPayload(
    order: Order & { items: OrderItem[]; customer: Customer },
    eventType: WebhookPayload["event"],
  ): Promise<WebhookPayload> {
    return {
      event: eventType,
      orderId: order.externalOrderId,
      internalOrderId: order.id,
      status: order.status,
      processedAt: order.processedAt?.toISOString() ?? new Date().toISOString(),
      pricing: {
        originalTotal: Number(order.originalTotal),
        processedTotal: order.processedTotal
          ? Number(order.processedTotal)
          : undefined,
        processingFee:
          order.processedTotal && order.originalTotal
            ? Number(order.processedTotal) - Number(order.originalTotal)
            : undefined,
        notes: order.processingNotes ?? undefined,
      },
      items: order.items.map((item) => ({
        id: item.productId,
        originalPrice: Number(item.originalPrice),
        processedPrice: item.processedPrice
          ? Number(item.processedPrice)
          : undefined,
        quantity: item.quantity,
        status: item.status,
        taobaoData: item.taobaoData
          ? {
              verified: true,
              actualPrice: item.processedPrice
                ? Number(item.processedPrice)
                : undefined,
              availability: "IN_STOCK", // This would come from actual Taobao data
            }
          : undefined,
      })),
      processingNotes: order.processingNotes ?? undefined,
      metadata: {
        webhookId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: this.WEBHOOK_VERSION,
      },
    };
  }

  /**
   * Send HTTP request to webhook URL
   */
  private async sendWebhookRequest(
    url: string,
    payload: WebhookPayload,
    signature: string,
  ): Promise<{
    success: boolean;
    status?: number;
    responseBody?: string;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.WEBHOOK_TIMEOUT,
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "User-Agent": `OrderHub-Webhook/${this.WEBHOOK_VERSION}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();

      return {
        success: response.ok,
        status: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit response body size
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: "Unknown error occurred",
      };
    }
  }

  /**
   * Calculate next retry time using exponential backoff
   */
  private calculateNextRetry(attemptCount: number): Date {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, then 60s for remaining attempts
    const baseDelay = Math.min(Math.pow(2, attemptCount), 60);
    const jitter = Math.random() * 0.1 * baseDelay; // Add 10% jitter
    const delaySeconds = baseDelay + jitter;

    return new Date(Date.now() + delaySeconds * 1000);
  }

  /**
   * Deliver webhook to customer endpoint
   */
  public async deliverWebhook(
    customerId: string,
    orderId: string,
    eventType: WebhookPayload["event"],
  ): Promise<WebhookDelivery> {
    // Get order with customer and items
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    if (!order.customer.webhookNotifications) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Webhook notifications disabled for customer",
      });
    }

    // Create webhook payload
    const payload = await this.createWebhookPayload(order, eventType);

    // Get webhook secret and generate signature
    const secret = await this.getWebhookSecret(customerId);
    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString, secret);

    // Create webhook delivery record
    const delivery = await db.webhookDelivery.create({
      data: {
        customerId,
        orderId,
        eventType,
        webhookUrl: order.customer.webhookUrl,
        payload: payload as unknown as Prisma.InputJsonValue,
        signature,
        status: "PENDING",
        maxRetries: this.MAX_RETRIES,
      },
    });

    // Attempt delivery
    await this.attemptDelivery(delivery.id);

    return delivery;
  }

  /**
   * Attempt webhook delivery
   */
  public async attemptDelivery(deliveryId: string): Promise<void> {
    const delivery = await db.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Webhook delivery not found",
      });
    }

    if (delivery.status === "SUCCESS" || delivery.status === "ABANDONED") {
      return; // Already completed or abandoned
    }

    // Send webhook request
    const result = await this.sendWebhookRequest(
      delivery.webhookUrl,
      delivery.payload as unknown as WebhookPayload,
      delivery.signature,
    );

    const newAttemptCount = delivery.attemptCount + 1;

    if (result.success) {
      // Success - mark as completed
      await db.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SUCCESS",
          httpStatus: result.status,
          responseBody: result.responseBody,
          attemptCount: newAttemptCount,
          completedAt: new Date(),
          nextRetryAt: null,
        },
      });
    } else {
      // Failed - schedule retry or abandon
      const shouldRetry = newAttemptCount < delivery.maxRetries;

      await db.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: shouldRetry ? "RETRYING" : "ABANDONED",
          httpStatus: result.status,
          responseBody: result.responseBody,
          errorMessage: result.error,
          attemptCount: newAttemptCount,
          nextRetryAt: shouldRetry
            ? this.calculateNextRetry(newAttemptCount)
            : null,
          completedAt: shouldRetry ? null : new Date(),
        },
      });

      if (!shouldRetry) {
        console.error(
          `Webhook delivery abandoned after ${newAttemptCount} attempts:`,
          {
            deliveryId,
            customerId: delivery.customerId,
            orderId: delivery.orderId,
            error: result.error,
          },
        );
      }
    }
  }

  /**
   * Process retry queue - find and retry failed webhooks
   */
  public async processRetryQueue(): Promise<void> {
    const pendingRetries = await db.webhookDelivery.findMany({
      where: {
        status: "RETRYING",
        nextRetryAt: {
          lte: new Date(),
        },
      },
      take: 50, // Process up to 50 retries at once
    });

    for (const delivery of pendingRetries) {
      try {
        await this.attemptDelivery(delivery.id);
      } catch (error) {
        console.error(`Error processing webhook retry ${delivery.id}:`, error);
      }
    }
  }

  /**
   * Test webhook endpoint connectivity
   */
  public async testWebhookEndpoint(
    customerId: string,
  ): Promise<WebhookTestResult> {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return {
        success: false,
        error: "Customer not found",
      };
    }

    // Create test payload
    const testPayload: WebhookPayload = {
      event: "order.status_changed",
      orderId: "test_order_123",
      internalOrderId: "test_internal_456",
      status: "COMPLETED",
      processedAt: new Date().toISOString(),
      items: [
        {
          id: "test_item_1",
          originalPrice: 29.99,
          processedPrice: 32.5,
          quantity: 1,
          status: "COMPLETED",
        },
      ],
      processingNotes: "This is a test webhook",
      metadata: {
        webhookId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: this.WEBHOOK_VERSION,
      },
    };

    // Generate signature
    const secret = await this.getWebhookSecret(customerId);
    const payloadString = JSON.stringify(testPayload);
    const signature = this.generateSignature(payloadString, secret);

    // Send test request
    const startTime = Date.now();
    const result = await this.sendWebhookRequest(
      customer.webhookUrl,
      testPayload,
      signature,
    );
    const responseTime = Date.now() - startTime;

    return {
      success: result.success,
      status: result.status,
      responseTime,
      error: result.error,
      responseBody: result.responseBody,
    };
  }

  /**
   * Get webhook delivery statistics for a customer
   */
  public async getDeliveryStats(customerId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await db.webhookDelivery.groupBy({
      by: ["status"],
      where: {
        customerId,
        createdAt: {
          gte: since,
        },
      },
      _count: {
        status: true,
      },
    });

    const totalDeliveries = await db.webhookDelivery.count({
      where: {
        customerId,
        createdAt: {
          gte: since,
        },
      },
    });

    const successCount =
      stats.find((s) => s.status === "SUCCESS")?._count.status ?? 0;
    const successRate =
      totalDeliveries > 0 ? (successCount / totalDeliveries) * 100 : 0;

    return {
      totalDeliveries,
      successCount,
      successRate: Math.round(successRate * 100) / 100,
      statusBreakdown: stats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}

// Export singleton instance
export const webhookService = new WebhookService();
