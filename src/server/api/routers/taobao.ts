import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TaobaoService } from "@/server/services/taobao";

// Validation schemas
const verifyProductSchema = z.object({
  url: z.string().url(),
});

const verifyItemSchema = z.object({
  itemId: z.string(),
  taobaoUrl: z.string().url(),
});

const batchVerifySchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      taobaoUrl: z.string().url(),
    }),
  ),
});

const calculatePriceSchema = z.object({
  originalPrice: z.number().positive(),
  exchangeRate: z.number().positive().optional(),
  processingFee: z.number().positive().optional(),
  markup: z.number().min(0).max(1).optional(),
});

export const taobaoRouter = createTRPCRouter({
  // Verify a single Taobao product URL
  verifyProduct: protectedProcedure
    .input(verifyProductSchema)
    .mutation(async ({ input }) => {
      try {
        // Validate URL format
        if (!TaobaoService.validateTaobaoUrl(input.url)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Taobao product URL",
          });
        }

        // Get or create product record
        const product = await TaobaoService.getOrCreateProduct(input.url);

        // Verify product data
        const verificationResult = await TaobaoService.verifyProduct(
          product.taobaoItemId,
        );

        return {
          product,
          verification: verificationResult,
          suggestedPrice: verificationResult.currentPrice
            ? TaobaoService.getSuggestedPrice(verificationResult.currentPrice)
            : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify Taobao product",
          cause: error,
        });
      }
    }),

  // Verify a Taobao item for an order item
  verifyOrderItem: protectedProcedure
    .input(verifyItemSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate URL format
        if (!TaobaoService.validateTaobaoUrl(input.taobaoUrl)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Taobao product URL",
          });
        }

        // Get or create product record
        const product = await TaobaoService.getOrCreateProduct(input.taobaoUrl);

        // Verify product data
        const verificationResult = await TaobaoService.verifyProduct(
          product.taobaoItemId,
        );

        // Update order item with Taobao data
        const updatedItem = await ctx.db.orderItem.update({
          where: { id: input.itemId },
          data: {
            taobaoData: {
              taobaoItemId: product.taobaoItemId,
              verified: verificationResult.verified,
              availability: verificationResult.availability,
              currentPrice: verificationResult.currentPrice,
              lastChecked: verificationResult.lastChecked.toISOString(),
              title: product.title,
              currency: product.currency,
            },
            status: verificationResult.verified ? "VERIFIED" : "FAILED",
          },
        });

        // Create processing log entry
        await ctx.db.processingLog.create({
          data: {
            orderId: updatedItem.orderId,
            adminUserId: ctx.session.user.id,
            action: "ITEM_VERIFIED",
            notes: `Taobao product verified: ${product.title}`,
            metadata: {
              itemId: input.itemId,
              taobaoItemId: product.taobaoItemId,
              verified: verificationResult.verified,
              availability: verificationResult.availability,
              currentPrice: verificationResult.currentPrice,
            },
          },
        });

        return {
          item: updatedItem,
          product,
          verification: verificationResult,
          suggestedPrice: verificationResult.currentPrice
            ? TaobaoService.getSuggestedPrice(verificationResult.currentPrice)
            : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify order item",
          cause: error,
        });
      }
    }),

  // Batch verify multiple Taobao items
  batchVerifyItems: protectedProcedure
    .input(batchVerifySchema)
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const item of input.items) {
        try {
          // Validate URL format
          if (!TaobaoService.validateTaobaoUrl(item.taobaoUrl)) {
            results.push({
              itemId: item.itemId,
              success: false,
              error: "Invalid Taobao product URL",
            });
            continue;
          }

          // Get or create product record
          const product = await TaobaoService.getOrCreateProduct(
            item.taobaoUrl,
          );

          // Verify product data
          const verificationResult = await TaobaoService.verifyProduct(
            product.taobaoItemId,
          );

          // Update order item with Taobao data
          const updatedItem = await ctx.db.orderItem.update({
            where: { id: item.itemId },
            data: {
              taobaoData: {
                taobaoItemId: product.taobaoItemId,
                verified: verificationResult.verified,
                availability: verificationResult.availability,
                currentPrice: verificationResult.currentPrice,
                lastChecked: verificationResult.lastChecked.toISOString(),
                title: product.title,
                currency: product.currency,
              },
              status: verificationResult.verified ? "VERIFIED" : "FAILED",
            },
          });

          // Create processing log entry
          await ctx.db.processingLog.create({
            data: {
              orderId: updatedItem.orderId,
              adminUserId: ctx.session.user.id,
              action: "ITEM_VERIFIED",
              notes: `Taobao product verified: ${product.title}`,
              metadata: {
                itemId: item.itemId,
                taobaoItemId: product.taobaoItemId,
                verified: verificationResult.verified,
                availability: verificationResult.availability,
                currentPrice: verificationResult.currentPrice,
              },
            },
          });

          results.push({
            itemId: item.itemId,
            success: true,
            product,
            verification: verificationResult,
            suggestedPrice: verificationResult.currentPrice
              ? TaobaoService.getSuggestedPrice(verificationResult.currentPrice)
              : null,
          });
        } catch (error) {
          results.push({
            itemId: item.itemId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        results,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
      };
    }),

  // Calculate suggested price for a Taobao item
  calculatePrice: protectedProcedure
    .input(calculatePriceSchema)
    .query(({ input }) => {
      const suggestedPrice = TaobaoService.getSuggestedPrice(
        input.originalPrice,
        {
          exchangeRate: input.exchangeRate,
          processingFee: input.processingFee,
          markup: input.markup,
        },
      );

      const processingFee = TaobaoService.calculateProcessingFee(
        input.originalPrice * (input.exchangeRate ?? 0.14),
      );

      return {
        originalPrice: input.originalPrice,
        exchangeRate: input.exchangeRate ?? 0.14,
        usdPrice: input.originalPrice * (input.exchangeRate ?? 0.14),
        processingFee,
        markup: input.markup ?? 0.1,
        suggestedPrice,
        breakdown: {
          originalCny: input.originalPrice,
          convertedUsd: input.originalPrice * (input.exchangeRate ?? 0.14),
          processingFee,
          subtotal:
            input.originalPrice * (input.exchangeRate ?? 0.14) + processingFee,
          markupAmount:
            (input.originalPrice * (input.exchangeRate ?? 0.14) +
              processingFee) *
            (input.markup ?? 0.1),
          finalPrice: suggestedPrice,
        },
      };
    }),

  // Get Taobao product by item ID
  getProduct: protectedProcedure
    .input(z.object({ taobaoItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.taobaoProduct.findUnique({
        where: { taobaoItemId: input.taobaoItemId },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Taobao product not found",
        });
      }

      return {
        ...product,
        price: product.price ? Number(product.price) : null,
      };
    }),

  // Get all Taobao products with pagination
  getProducts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        verified: z.boolean().optional(),
        availability: z
          .enum(["IN_STOCK", "OUT_OF_STOCK", "LIMITED_STOCK", "UNKNOWN"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        verified?: boolean;
        availability?: string;
      } = {};

      if (input.verified !== undefined) {
        where.verified = input.verified;
      }

      if (input.availability) {
        where.availability = input.availability;
      }

      const [products, totalCount] = await Promise.all([
        ctx.db.taobaoProduct.findMany({
          where,
          orderBy: { lastChecked: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.taobaoProduct.count({ where }),
      ]);

      return {
        products: products.map((product) => ({
          ...product,
          price: product.price ? Number(product.price) : null,
        })),
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Validate Taobao URL
  validateUrl: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(({ input }) => {
      const isValid = TaobaoService.validateTaobaoUrl(input.url);
      const itemId = TaobaoService.extractItemId(input.url);

      return {
        isValid,
        itemId,
        message: isValid
          ? "Valid Taobao product URL"
          : "Invalid Taobao product URL",
      };
    }),
});
