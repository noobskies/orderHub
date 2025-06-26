import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const endConsumerRouter = createTRPCRouter({
  // Get all end consumers for a specific customer
  getByCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = {
        sourceCustomerId: input.customerId,
        ...(input.search && {
          OR: [
            { email: { contains: input.search, mode: "insensitive" as const } },
            { name: { contains: input.search, mode: "insensitive" as const } },
            { phone: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [endConsumers, total] = await Promise.all([
        ctx.db.endConsumer.findMany({
          where: whereClause,
          include: {
            sourceCustomer: {
              select: { name: true, id: true },
            },
            _count: {
              select: { orders: true },
            },
          },
          orderBy: { lastOrderDate: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.endConsumer.count({ where: whereClause }),
      ]);

      return {
        endConsumers,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get end consumer by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const endConsumer = await ctx.db.endConsumer.findUnique({
        where: { id: input.id },
        include: {
          sourceCustomer: {
            select: { name: true, id: true },
          },
          orders: {
            select: {
              id: true,
              externalOrderId: true,
              status: true,
              originalTotal: true,
              currency: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          _count: {
            select: { orders: true },
          },
        },
      });

      if (!endConsumer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "End consumer not found",
        });
      }

      return endConsumer;
    }),

  // Get end consumer statistics
  getStats: protectedProcedure
    .input(z.object({ customerId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const whereClause = input.customerId
        ? { sourceCustomerId: input.customerId }
        : {};

      const [totalEndConsumers, activeEndConsumers, newThisMonth, topSpenders] =
        await Promise.all([
          // Total end consumers
          ctx.db.endConsumer.count({ where: whereClause }),

          // Active end consumers (ordered in last 30 days)
          ctx.db.endConsumer.count({
            where: {
              ...whereClause,
              lastOrderDate: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          }),

          // New end consumers this month
          ctx.db.endConsumer.count({
            where: {
              ...whereClause,
              createdAt: {
                gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1,
                ),
              },
            },
          }),

          // Top spending end consumers
          ctx.db.endConsumer.findMany({
            where: whereClause,
            select: {
              id: true,
              email: true,
              name: true,
              totalOrderValue: true,
              totalOrderCount: true,
              lastOrderDate: true,
              sourceCustomer: {
                select: { name: true },
              },
            },
            orderBy: { totalOrderValue: "desc" },
            take: 10,
          }),
        ]);

      return {
        totalEndConsumers,
        activeEndConsumers,
        newThisMonth,
        topSpenders,
      };
    }),

  // Update end consumer information
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      try {
        const endConsumer = await ctx.db.endConsumer.update({
          where: { id },
          data: updateData,
          include: {
            sourceCustomer: {
              select: { name: true, id: true },
            },
          },
        });

        return endConsumer;
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "End consumer not found",
        });
      }
    }),

  // Search end consumers across all customers (for admin)
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const endConsumers = await ctx.db.endConsumer.findMany({
        where: {
          OR: [
            { email: { contains: input.query, mode: "insensitive" } },
            { name: { contains: input.query, mode: "insensitive" } },
            { phone: { contains: input.query, mode: "insensitive" } },
          ],
        },
        include: {
          sourceCustomer: {
            select: { name: true, id: true },
          },
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { lastOrderDate: "desc" },
        take: input.limit,
      });

      return endConsumers;
    }),
});
