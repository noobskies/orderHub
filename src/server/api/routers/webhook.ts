import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { webhookService } from "@/server/services/webhook";
import { TRPCError } from "@trpc/server";

export const webhookRouter = createTRPCRouter({
  /**
   * Test webhook endpoint for a customer
   */
  testEndpoint: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await webhookService.testWebhookEndpoint(
          input.customerId,
        );
        return result;
      } catch (error) {
        console.error("Error testing webhook endpoint:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to test webhook endpoint",
        });
      }
    }),

  /**
   * Manually trigger webhook delivery for an order
   */
  deliverWebhook: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        orderId: z.string(),
        eventType: z.enum([
          "order.completed",
          "order.failed",
          "order.status_changed",
        ]),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const delivery = await webhookService.deliverWebhook(
          input.customerId,
          input.orderId,
          input.eventType,
        );
        return {
          success: true,
          deliveryId: delivery.id,
          message: "Webhook delivery initiated",
        };
      } catch (error) {
        console.error("Error delivering webhook:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to deliver webhook",
        });
      }
    }),

  /**
   * Retry a failed webhook delivery
   */
  retryDelivery: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await webhookService.attemptDelivery(input.deliveryId);
        return {
          success: true,
          message: "Webhook retry initiated",
        };
      } catch (error) {
        console.error("Error retrying webhook delivery:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retry webhook delivery",
        });
      }
    }),

  /**
   * Get webhook delivery statistics for a customer
   */
  getDeliveryStats: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        days: z.number().min(1).max(90).default(7),
      }),
    )
    .query(async ({ input }) => {
      try {
        const stats = await webhookService.getDeliveryStats(
          input.customerId,
          input.days,
        );
        return stats;
      } catch (error) {
        console.error("Error getting webhook delivery stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get webhook delivery statistics",
        });
      }
    }),

  /**
   * Get webhook deliveries for a customer with pagination
   */
  getDeliveries: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(),
        status: z
          .enum(["PENDING", "SUCCESS", "FAILED", "RETRYING", "ABANDONED"])
          .optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where = {
          ...(input.customerId && { customerId: input.customerId }),
          ...(input.status && { status: input.status }),
        };

        const [deliveries, total] = await Promise.all([
          ctx.db.webhookDelivery.findMany({
            where,
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              order: {
                select: {
                  id: true,
                  externalOrderId: true,
                  orderNumber: true,
                  status: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: input.limit,
            skip: input.offset,
          }),
          ctx.db.webhookDelivery.count({ where }),
        ]);

        return {
          deliveries,
          total,
          hasMore: input.offset + input.limit < total,
        };
      } catch (error) {
        console.error("Error getting webhook deliveries:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get webhook deliveries",
        });
      }
    }),

  /**
   * Get webhook delivery details by ID
   */
  getDeliveryById: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const delivery = await ctx.db.webhookDelivery.findUnique({
          where: { id: input.deliveryId },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                webhookUrl: true,
              },
            },
            order: {
              select: {
                id: true,
                externalOrderId: true,
                orderNumber: true,
                status: true,
                originalTotal: true,
                processedTotal: true,
                currency: true,
              },
            },
          },
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook delivery not found",
          });
        }

        return delivery;
      } catch (error) {
        console.error("Error getting webhook delivery:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get webhook delivery",
        });
      }
    }),

  /**
   * Process retry queue manually
   */
  processRetryQueue: protectedProcedure.mutation(async () => {
    try {
      await webhookService.processRetryQueue();
      return {
        success: true,
        message: "Retry queue processed",
      };
    } catch (error) {
      console.error("Error processing retry queue:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to process retry queue",
      });
    }
  }),

  /**
   * Get webhook secrets for a customer (for regeneration)
   */
  getWebhookSecret: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const webhookSecret = await ctx.db.webhookSecret.findUnique({
          where: { customerId: input.customerId },
        });

        return {
          hasSecret: !!webhookSecret,
          createdAt: webhookSecret?.createdAt,
        };
      } catch (error) {
        console.error("Error getting webhook secret info:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get webhook secret information",
        });
      }
    }),

  /**
   * Regenerate webhook secret for a customer
   */
  regenerateSecret: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Delete existing secret
        await ctx.db.webhookSecret.deleteMany({
          where: { customerId: input.customerId },
        });

        // Create new secret
        const crypto = await import("crypto");
        const newSecret = crypto.randomBytes(32).toString("hex");

        await ctx.db.webhookSecret.create({
          data: {
            customerId: input.customerId,
            secret: newSecret,
          },
        });

        return {
          success: true,
          message: "Webhook secret regenerated successfully",
        };
      } catch (error) {
        console.error("Error regenerating webhook secret:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to regenerate webhook secret",
        });
      }
    }),
});
