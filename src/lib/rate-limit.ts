import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
}

export function createRateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyGenerator } = config;

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const now = Date.now();

    // Generate rate limit key
    const key = keyGenerator ? keyGenerator(request) : getDefaultKey(request);

    // Clean up expired entries
    for (const [storeKey, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(storeKey);
      }
    }

    // Get or create rate limit entry
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    const current = rateLimitStore.get(windowKey) ?? {
      count: 0,
      resetTime: now + windowMs,
    };

    // Check if rate limit exceeded
    if (current.count >= maxRequests) {
      return NextResponse.json(
        {
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((current.resetTime - now) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(current.resetTime / 1000).toString(),
            "Retry-After": Math.ceil(
              (current.resetTime - now) / 1000,
            ).toString(),
          },
        },
      );
    }

    // Increment counter
    current.count++;
    rateLimitStore.set(windowKey, current);

    // Add rate limit headers to response (will be added by the calling function)
    return null; // No rate limit exceeded, continue processing
  };
}

function getDefaultKey(request: NextRequest): string {
  // Use IP address as default key
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]!.trim()
    : (request.headers.get("x-real-ip") ?? "unknown");
  return ip;
}

// Webhook-specific rate limiter
export const webhookRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per customer
  keyGenerator: (request) => {
    // Extract customer ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const customerIdIndex = pathParts.indexOf("webhook") + 1;
    const customerId = pathParts[customerIdIndex] ?? "unknown";

    // Combine customer ID with IP for more granular rate limiting
    const ip = getDefaultKey(request);
    return `webhook:${customerId}:${ip}`;
  },
});

// Status endpoint rate limiter (more permissive)
export const statusRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000, // 1000 requests per minute per customer
  keyGenerator: (request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const customerIdIndex = pathParts.indexOf("webhook") + 1;
    const customerId = pathParts[customerIdIndex] ?? "unknown";

    const ip = getDefaultKey(request);
    return `status:${customerId}:${ip}`;
  },
});

// Helper function to add rate limit headers to successful responses
export function addRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  key: string,
): NextResponse {
  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;
  const current = rateLimitStore.get(windowKey);

  if (current) {
    const remaining = Math.max(0, config.maxRequests - current.count);
    const resetTime = Math.ceil(current.resetTime / 1000);

    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", resetTime.toString());
  }

  return response;
}
