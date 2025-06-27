import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

// Taobao URL validation schema
const taobaoUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      const taobaoHosts = [
        "item.taobao.com",
        "detail.tmall.com",
        "world.taobao.com",
        "world.tmall.com",
        "item.tmall.com",
      ];

      try {
        const urlObj = new URL(url);
        return taobaoHosts.some((host) => urlObj.hostname.includes(host));
      } catch {
        return false;
      }
    },
    {
      message: "URL must be a valid Taobao or Tmall product URL",
    },
  );

// Taobao product data schema
export const taobaoProductSchema = z.object({
  taobaoItemId: z.string(),
  url: z.string().url(),
  title: z.string(),
  price: z.number().positive().optional(),
  currency: z.string().default("CNY"),
  availability: z
    .enum(["IN_STOCK", "OUT_OF_STOCK", "LIMITED_STOCK", "UNKNOWN"])
    .default("UNKNOWN"),
  images: z.array(z.string().url()).optional(),
  specifications: z.record(z.string(), z.unknown()).optional(),
  variations: z.record(z.string(), z.array(z.string())).optional(),
});

export type TaobaoProductData = z.infer<typeof taobaoProductSchema>;

export class TaobaoService {
  /**
   * Extract Taobao item ID from URL
   */
  static extractItemId(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // Extract item ID from different Taobao URL formats
      const itemIdRegex = /[?&]id=(\d+)/;
      const itemIdMatch = itemIdRegex.exec(url);
      if (itemIdMatch) {
        return itemIdMatch[1]!;
      }

      // Alternative format: /item.htm?id=123456
      const altRegex = /item\.htm\?.*id=(\d+)/;
      const altMatch = altRegex.exec(url);
      if (altMatch) {
        return altMatch[1]!;
      }

      // Path-based ID extraction for some formats
      const pathRegex = /\/(\d+)\.html?$/;
      const pathMatch = pathRegex.exec(urlObj.pathname);
      if (pathMatch) {
        return pathMatch[1]!;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate if URL is a valid Taobao product URL
   */
  static validateTaobaoUrl(url: string): boolean {
    try {
      taobaoUrlSchema.parse(url);
      return this.extractItemId(url) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Parse Taobao URL and extract basic product information
   * Note: This is a simplified version. In production, you'd use web scraping
   * or Taobao's official API to get real product data.
   */
  static async parseProductUrl(
    url: string,
  ): Promise<Partial<TaobaoProductData>> {
    // Validate URL
    if (!this.validateTaobaoUrl(url)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid Taobao product URL",
      });
    }

    const itemId = this.extractItemId(url);
    if (!itemId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not extract item ID from Taobao URL",
      });
    }

    // In a real implementation, you would:
    // 1. Use Taobao's official API if available
    // 2. Use web scraping with proper rate limiting
    // 3. Cache results to avoid repeated requests
    // 4. Handle different product page formats

    // For now, return basic parsed data
    return {
      taobaoItemId: itemId,
      url: url,
      title: `Taobao Product ${itemId}`, // Placeholder - would be scraped
      price: undefined, // Would be scraped from page
      currency: "CNY",
      availability: "UNKNOWN",
      images: [], // Would be scraped from page
      specifications: {}, // Would be scraped from page
      variations: {}, // Would be scraped from page variations
    };
  }

  /**
   * Get or create Taobao product record in database
   */
  static async getOrCreateProduct(url: string): Promise<{
    id: string;
    taobaoItemId: string;
    url: string;
    title: string;
    price: number | null;
    currency: string;
    availability: string | null;
    verified: boolean;
    lastChecked: Date;
  }> {
    const itemId = this.extractItemId(url);
    if (!itemId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid Taobao URL",
      });
    }

    // Check if product already exists
    let existingProduct = await db.taobaoProduct.findUnique({
      where: { taobaoItemId: itemId },
    });

    if (existingProduct) {
      // Update last checked timestamp
      existingProduct = await db.taobaoProduct.update({
        where: { id: existingProduct.id },
        data: { lastChecked: new Date() },
      });

      // Convert Decimal to number for return type
      return {
        ...existingProduct,
        price: existingProduct.price ? Number(existingProduct.price) : null,
      };
    }

    // Parse product data
    const productData = await this.parseProductUrl(url);

    // Create new product record
    const newProduct = await db.taobaoProduct.create({
      data: {
        taobaoItemId: itemId,
        url: url,
        title: productData.title ?? `Taobao Product ${itemId}`,
        price: productData.price,
        currency: productData.currency ?? "CNY",
        availability: productData.availability,
        images: (productData.images ?? []) as Prisma.InputJsonValue,
        specifications: (productData.specifications ??
          {}) as Prisma.InputJsonValue,
        variations: (productData.variations ?? {}) as Prisma.InputJsonValue,
        verified: false,
        lastChecked: new Date(),
      },
    });

    // Convert Decimal to number for return type
    return {
      ...newProduct,
      price: newProduct.price ? Number(newProduct.price) : null,
    };
  }

  /**
   * Verify product availability and update pricing
   * This would typically involve scraping or API calls
   */
  static async verifyProduct(taobaoItemId: string): Promise<{
    verified: boolean;
    availability: string;
    currentPrice?: number;
    lastChecked: Date;
  }> {
    const product = await db.taobaoProduct.findUnique({
      where: { taobaoItemId },
    });

    if (!product) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Taobao product not found",
      });
    }

    // In a real implementation, this would:
    // 1. Make a request to the product page
    // 2. Parse current price and availability
    // 3. Check if product still exists
    // 4. Update product variations if changed

    // For now, simulate verification
    const mockVerificationResult = {
      verified: true,
      availability: "IN_STOCK" as const,
      currentPrice: product.price ? Number(product.price) * 1.05 : undefined, // Mock price increase
      lastChecked: new Date(),
    };

    // Update product in database
    await db.taobaoProduct.update({
      where: { taobaoItemId },
      data: {
        verified: mockVerificationResult.verified,
        availability: mockVerificationResult.availability,
        price: mockVerificationResult.currentPrice,
        lastChecked: mockVerificationResult.lastChecked,
      },
    });

    return mockVerificationResult;
  }

  /**
   * Calculate processing fee based on Taobao product
   */
  static calculateProcessingFee(
    originalPrice: number,
    options?: {
      feePercentage?: number;
      minimumFee?: number;
      maximumFee?: number;
    },
  ): number {
    const {
      feePercentage = 0.15, // 15% default processing fee
      minimumFee = 2.0, // Minimum $2 fee
      maximumFee = 50.0, // Maximum $50 fee
    } = options ?? {};

    const calculatedFee = originalPrice * feePercentage;

    // Apply minimum and maximum constraints
    return Math.max(minimumFee, Math.min(maximumFee, calculatedFee));
  }

  /**
   * Get suggested processed price for a Taobao item
   */
  static getSuggestedPrice(
    originalPrice: number,
    options?: {
      exchangeRate?: number;
      processingFee?: number;
      markup?: number;
    },
  ): number {
    const {
      exchangeRate = 0.14, // CNY to USD (mock rate)
      processingFee,
      markup = 0.1, // 10% markup
    } = options ?? {};

    // Convert from CNY to USD
    const usdPrice = originalPrice * exchangeRate;

    // Add processing fee
    const fee = processingFee ?? this.calculateProcessingFee(usdPrice);
    const priceWithFee = usdPrice + fee;

    // Add markup
    const finalPrice = priceWithFee * (1 + markup);

    // Round to 2 decimal places
    return Math.round(finalPrice * 100) / 100;
  }

  /**
   * Batch verify multiple Taobao products
   */
  static async batchVerifyProducts(taobaoItemIds: string[]): Promise<
    Array<{
      taobaoItemId: string;
      verified: boolean;
      availability: string;
      currentPrice?: number;
      error?: string;
    }>
  > {
    const results = [];

    for (const itemId of taobaoItemIds) {
      try {
        const result = await this.verifyProduct(itemId);
        results.push({
          taobaoItemId: itemId,
          ...result,
        });
      } catch (error) {
        results.push({
          taobaoItemId: itemId,
          verified: false,
          availability: "UNKNOWN",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }
}
