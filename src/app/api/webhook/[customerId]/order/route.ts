import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";

// Validation schema for incoming orders
const orderSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string().optional(),
  customerId: z.string(),
  customerEmail: z.string().email().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      productId: z.string(),
      name: z.string(),
      price: z.number().positive(),
      quantity: z.number().positive(),
      options: z.record(z.string()).optional(),
      sellerId: z.string().optional(),
      sellerName: z.string().optional(),
      taobaoUrl: z.string().url().optional(),
    }),
  ),
  originalTotal: z.number().positive(),
  currency: z.string().default("USD"),
  shippingAddress: z.object({
    name: z.string(),
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
    phone: z.string().optional(),
  }),
  billingAddress: z
    .object({
      name: z.string(),
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
    })
    .optional(),
  promoCode: z
    .object({
      code: z.string(),
      discountAmount: z.number(),
    })
    .optional(),
});

// Helper function to authenticate customer API key
async function authenticateCustomer(customerId: string, apiKey: string) {
  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId, isActive: true },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Check if API key matches
    if (customer.apiKey !== apiKey) {
      return { success: false, error: "Invalid API key" };
    }

    return { success: true, customer };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { customerId: string } },
) {
  try {
    const { customerId } = params;

    // Get API key from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_API_KEY",
          message: "Missing or invalid authorization header",
        },
        { status: 401 },
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

    // Authenticate customer
    const authResult = await authenticateCustomer(customerId, apiKey);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: "INVALID_API_KEY", message: authResult.error },
        { status: 401 },
      );
    }

    const customer = authResult.customer!;

    // Parse request body
    const body = await request.json();

    // Validate order data
    const validationResult = orderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Invalid order data",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const orderData = validationResult.data;

    // Check for duplicate order
    const existingOrder = await db.order.findUnique({
      where: {
        customerId_externalOrderId: {
          customerId,
          externalOrderId: orderData.orderId,
        },
      },
    });

    if (existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_ORDER",
          message: "Order with this ID already exists",
        },
        { status: 409 },
      );
    }

    // Create order in database
    const order = await db.order.create({
      data: {
        externalOrderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        customerId,
        customerEmail: orderData.customerEmail,
        status: "PENDING",
        priority: customer.processingPriority,
        originalTotal: orderData.originalTotal,
        currency: orderData.currency,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        promoCode: orderData.promoCode?.code,
        discountAmount: orderData.promoCode?.discountAmount,
        estimatedProcessingTime: "2-4 hours",
        items: {
          create: orderData.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            originalPrice: item.price,
            quantity: item.quantity,
            options: item.options,
            sellerId: item.sellerId,
            sellerName: item.sellerName,
            taobaoUrl: item.taobaoUrl,
            status: "PENDING",
          })),
        },
      },
    });

    // Create processing log entry
    await db.processingLog.create({
      data: {
        orderId: order.id,
        action: "ORDER_RECEIVED",
        status: "PENDING",
        notes: "Order received via webhook and queued for processing",
        metadata: {
          source: "webhook",
          customerApiKey: apiKey,
          receivedAt: new Date().toISOString(),
          originalData: {
            itemCount: orderData.items.length,
            totalAmount: orderData.originalTotal,
            currency: orderData.currency,
          },
        },
      },
    });

    // Return success response
    return NextResponse.json({
      success: true,
      orderId: order.id,
      externalOrderId: orderData.orderId,
      status: "PENDING",
      message: "Order received and queued for processing",
      estimatedProcessingTime: "2-4 hours",
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "An internal error occurred while processing the order",
      },
      { status: 500 },
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
