import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { webhookService } from "@/server/services/webhook";

// Validation schemas
const orderFilterSchema = z.object({
  customerId: z.string().optional(),
  status: z
    .enum([
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "ON_HOLD",
    ])
    .optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const updateOrderStatusSchema = z.object({
  id: z.string(),
  status: z.enum([
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "ON_HOLD",
  ]),
  notes: z.string().optional(),
});

const processOrderSchema = z.object({
  id: z.string(),
  processedTotal: z.number().positive(),
  processingNotes: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        processedPrice: z.number().positive(),
        status: z.enum([
          "PENDING",
          "VERIFIED",
          "PROCESSING",
          "COMPLETED",
          "FAILED",
          "OUT_OF_STOCK",
        ]),
        notes: z.string().optional(),
        taobaoData: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
});

export const orderRouter = createTRPCRouter({
  // Get all orders with filters
  getAll: protectedProcedure
    .input(orderFilterSchema)
    .query(async ({ ctx, input }) => {
      const where: {
        customerId?: string;
        status?:
          | "PENDING"
          | "PROCESSING"
          | "COMPLETED"
          | "FAILED"
          | "CANCELLED"
          | "ON_HOLD";
        createdAt?: {
          gte?: Date;
          lte?: Date;
        };
      } = {};

      if (input.customerId) {
        where.customerId = input.customerId;
      }

      if (input.status) {
        where.status = input.status;
      }

      if (input.dateFrom || input.dateTo) {
        where.createdAt = {};
        if (input.dateFrom) {
          where.createdAt.gte = input.dateFrom;
        }
        if (input.dateTo) {
          where.createdAt.lte = input.dateTo;
        }
      }

      const [orders, totalCount] = await Promise.all([
        ctx.db.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              select: {
                id: true,
                name: true,
                originalPrice: true,
                processedPrice: true,
                quantity: true,
                status: true,
              },
            },
            _count: {
              select: {
                items: true,
              },
            },
          },
        }),
        ctx.db.order.count({ where }),
      ]);

      return {
        orders: orders.map((order) => ({
          ...order,
          itemCount: order._count.items,
        })),
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Get order by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              currency: true,
              timezone: true,
            },
          },
          items: true,
          processingLog: {
            orderBy: { createdAt: "desc" },
            include: {
              adminUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      return order;
    }),

  // Update order status
  updateStatus: protectedProcedure
    .input(updateOrderStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, status, notes } = input;

      // Check if order exists
      const existingOrder = await ctx.db.order.findUnique({
        where: { id },
      });

      if (!existingOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Update order status
      const updatedOrder = await ctx.db.order.update({
        where: { id },
        data: {
          status,
          processingNotes: notes,
          processedAt: status === "COMPLETED" ? new Date() : undefined,
        },
      });

      // Create processing log entry
      await ctx.db.processingLog.create({
        data: {
          orderId: id,
          adminUserId: ctx.session.user.id,
          action: "STATUS_CHANGED",
          status,
          notes: notes ?? `Status changed to ${status}`,
          metadata: {
            previousStatus: existingOrder.status,
            newStatus: status,
            changedAt: new Date().toISOString(),
          },
        },
      });

      // Trigger webhook for status changes
      try {
        let eventType:
          | "order.completed"
          | "order.failed"
          | "order.status_changed" = "order.status_changed";

        if (status === "COMPLETED") {
          eventType = "order.completed";
        } else if (status === "FAILED") {
          eventType = "order.failed";
        }

        await webhookService.deliverWebhook(
          existingOrder.customerId,
          id,
          eventType,
        );
      } catch (webhookError) {
        // Log webhook error but don't fail the order update
        console.error(
          "Failed to deliver webhook for order status change:",
          webhookError,
        );
      }

      return updatedOrder;
    }),

  // Process order manually
  process: protectedProcedure
    .input(processOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, processedTotal, processingNotes, items } = input;

      // Check if order exists
      const existingOrder = await ctx.db.order.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Update order
      const updatedOrder = await ctx.db.order.update({
        where: { id },
        data: {
          processedTotal,
          processingNotes,
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });

      // Update order items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          await ctx.db.orderItem.update({
            where: { id: item.id },
            data: {
              processedPrice: item.processedPrice,
              status: item.status,
              notes: item.notes,
              taobaoData: item.taobaoData as Prisma.InputJsonValue,
            },
          });
        }
      }

      // Create processing log entry
      await ctx.db.processingLog.create({
        data: {
          orderId: id,
          adminUserId: ctx.session.user.id,
          action: "ORDER_COMPLETED",
          status: "COMPLETED",
          notes: processingNotes ?? "Order processing completed",
          metadata: {
            originalTotal: existingOrder.originalTotal,
            processedTotal,
            itemsProcessed: items?.length ?? 0,
            completedAt: new Date().toISOString(),
          },
        },
      });

      // Trigger webhook for order completion
      try {
        await webhookService.deliverWebhook(
          existingOrder.customerId,
          id,
          "order.completed",
        );
      } catch (webhookError) {
        // Log webhook error but don't fail the order processing
        console.error(
          "Failed to deliver webhook for order completion:",
          webhookError,
        );
      }

      return updatedOrder;
    }),

  // Get order processing history
  getHistory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const processingLog = await ctx.db.processingLog.findMany({
        where: { orderId: input.id },
        orderBy: { createdAt: "desc" },
        include: {
          adminUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return processingLog;
    }),

  // Get order statistics
  getStats: protectedProcedure
    .input(
      z.object({
        customerId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        customerId?: string;
        createdAt?: {
          gte?: Date;
          lte?: Date;
        };
      } = {};

      if (input.customerId) {
        where.customerId = input.customerId;
      }

      if (input.dateFrom || input.dateTo) {
        where.createdAt = {};
        if (input.dateFrom) {
          where.createdAt.gte = input.dateFrom;
        }
        if (input.dateTo) {
          where.createdAt.lte = input.dateTo;
        }
      }

      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        failedOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue,
      ] = await Promise.all([
        ctx.db.order.count({ where }),
        ctx.db.order.count({ where: { ...where, status: "PENDING" } }),
        ctx.db.order.count({ where: { ...where, status: "PROCESSING" } }),
        ctx.db.order.count({ where: { ...where, status: "COMPLETED" } }),
        ctx.db.order.count({ where: { ...where, status: "FAILED" } }),
        ctx.db.order.count({ where: { ...where, status: "CANCELLED" } }),
        ctx.db.order.aggregate({
          where: { ...where, status: "COMPLETED" },
          _sum: { processedTotal: true },
        }),
        ctx.db.order.aggregate({
          where: { ...where, status: "COMPLETED" },
          _avg: { processedTotal: true },
        }),
      ]);

      return {
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        failedOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum.processedTotal ?? 0,
        averageOrderValue: averageOrderValue._avg.processedTotal ?? 0,
        successRate:
          totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        completionRate:
          totalOrders > 0
            ? ((completedOrders + failedOrders + cancelledOrders) /
                totalOrders) *
              100
            : 0,
      };
    }),

  // Start processing an order
  startProcessing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      if (order.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order is not in pending status",
        });
      }

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.id },
        data: {
          status: "PROCESSING",
        },
      });

      // Create processing log entry
      await ctx.db.processingLog.create({
        data: {
          orderId: input.id,
          adminUserId: ctx.session.user.id,
          action: "PROCESSING_STARTED",
          status: "PROCESSING",
          notes: "Order processing started",
          metadata: {
            startedAt: new Date().toISOString(),
            adminUser: ctx.session.user.email,
          },
        },
      });

      return updatedOrder;
    }),
});
