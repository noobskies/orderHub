import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const analyticsRouter = createTRPCRouter({
  // Get dashboard metrics
  getDashboardMetrics: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, any> = {};

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
        totalCustomers,
        activeCustomers,
        totalRevenue,
        recentOrders,
      ] = await Promise.all([
        ctx.db.order.count({ where }),
        ctx.db.order.count({ where: { ...where, status: "PENDING" } }),
        ctx.db.order.count({ where: { ...where, status: "PROCESSING" } }),
        ctx.db.order.count({ where: { ...where, status: "COMPLETED" } }),
        ctx.db.customer.count(),
        ctx.db.customer.count({ where: { isActive: true } }),
        ctx.db.order.aggregate({
          where: { ...where, status: "COMPLETED" },
          _sum: { processedTotal: true },
        }),
        ctx.db.order.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            customer: {
              select: {
                name: true,
              },
            },
          },
        }),
      ]);

      return {
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        totalCustomers,
        activeCustomers,
        totalRevenue: totalRevenue._sum.processedTotal ?? 0,
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          externalOrderId: order.externalOrderId,
          customerName: order.customer.name,
          status: order.status,
          originalTotal: order.originalTotal,
          createdAt: order.createdAt,
        })),
      };
    }),

  // Get order trends over time
  getOrderTrends: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const orders = await ctx.db.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
          status: true,
          originalTotal: true,
          processedTotal: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Group orders by date
      const ordersByDate: Record<
        string,
        {
          date: string;
          totalOrders: number;
          completedOrders: number;
          revenue: number;
        }
      > = {};

      orders.forEach((order) => {
        const dateKey = order.createdAt.toISOString().split("T")[0]!;
        if (!ordersByDate[dateKey]) {
          ordersByDate[dateKey] = {
            date: dateKey,
            totalOrders: 0,
            completedOrders: 0,
            revenue: 0,
          };
        }

        ordersByDate[dateKey]!.totalOrders++;
        if (order.status === "COMPLETED") {
          ordersByDate[dateKey]!.completedOrders++;
          ordersByDate[dateKey]!.revenue += Number(order.processedTotal ?? 0);
        }
      });

      return Object.values(ordersByDate).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }),

  // Get customer performance metrics
  getCustomerMetrics: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(5).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const customers = await ctx.db.customer.findMany({
        where: { isActive: true },
        include: {
          orders: {
            select: {
              status: true,
              originalTotal: true,
              processedTotal: true,
            },
          },
        },
        take: input.limit,
      });

      return customers
        .map((customer) => {
          const totalOrders = customer.orders.length;
          const completedOrders = customer.orders.filter(
            (order) => order.status === "COMPLETED",
          ).length;
          const totalRevenue = customer.orders
            .filter((order) => order.status === "COMPLETED")
            .reduce((sum, order) => sum + Number(order.processedTotal ?? 0), 0);

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            totalOrders,
            completedOrders,
            totalRevenue,
            successRate:
              totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
    }),

  // Get processing performance metrics
  getProcessingMetrics: protectedProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, any> = {};

      if (input.dateFrom || input.dateTo) {
        where.createdAt = {};
        if (input.dateFrom) {
          where.createdAt.gte = input.dateFrom;
        }
        if (input.dateTo) {
          where.createdAt.lte = input.dateTo;
        }
      }

      const orders = await ctx.db.order.findMany({
        where: {
          ...where,
          processedAt: { not: null },
        },
        select: {
          createdAt: true,
          processedAt: true,
          status: true,
        },
      });

      // Calculate processing times
      const processingTimes = orders
        .filter((order) => order.processedAt)
        .map((order) => {
          const processingTime =
            order.processedAt!.getTime() - order.createdAt.getTime();
          return processingTime / (1000 * 60 * 60); // Convert to hours
        });

      const averageProcessingTime =
        processingTimes.length > 0
          ? processingTimes.reduce((sum, time) => sum + time, 0) /
            processingTimes.length
          : 0;

      const medianProcessingTime =
        processingTimes.length > 0
          ? (processingTimes.sort((a, b) => a - b)[
              Math.floor(processingTimes.length / 2)
            ] ?? 0)
          : 0;

      return {
        totalProcessedOrders: orders.length,
        averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
        medianProcessingTime: Math.round(medianProcessingTime * 100) / 100,
        processingTimeDistribution: {
          under1Hour: processingTimes.filter((time) => time < 1).length,
          under4Hours: processingTimes.filter((time) => time < 4).length,
          under24Hours: processingTimes.filter((time) => time < 24).length,
          over24Hours: processingTimes.filter((time) => time >= 24).length,
        },
      };
    }),
});
