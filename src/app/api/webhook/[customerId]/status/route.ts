import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { statusRateLimit } from "@/lib/rate-limit";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await statusRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { customerId } = await params;

    // Get API key from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          status: "error",
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
        {
          status: "error",
          error: "INVALID_API_KEY",
          message: authResult.error,
        },
        { status: 401 },
      );
    }

    // Return health status
    return NextResponse.json({
      status: "healthy",
      customerId,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      message: "Webhook endpoint is operational",
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "INTERNAL_ERROR",
        message: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
