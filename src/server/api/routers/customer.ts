import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  webhookUrl: z.string().url("Valid webhook URL is required"),
  currency: z.string().default("USD"),
  timezone: z.string().default("UTC"),
  processingPriority: z
    .enum(["LOW", "NORMAL", "HIGH", "URGENT"])
    .default("NORMAL"),
  emailNotifications: z.boolean().default(true),
  webhookNotifications: z.boolean().default(true),
});

const updateCustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  processingPriority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  emailNotifications: z.boolean().optional(),
  webhookNotifications: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Helper function to generate API key
function generateApiKey(): string {
  return `orderhub_${randomBytes(32).toString("hex")}`;
}

export const customerRouter = createTRPCRouter({
  // Get all customers
  getAll: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const customers = await ctx.db.customer.findMany({
        where: input.includeInactive ? {} : { isActive: true },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      return customers.map((customer) => ({
        ...customer,
        // Don't expose API secret in responses
        apiSecret: undefined,
        orderCount: customer._count.orders,
      }));
    }),

  // Get customer by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findUnique({
        where: { id: input.id },
        include: {
          orders: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              externalOrderId: true,
              status: true,
              originalTotal: true,
              currency: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      return {
        ...customer,
        // Don't expose API secret
        apiSecret: undefined,
        orderCount: customer._count.orders,
      };
    }),

  // Create new customer
  create: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if email already exists
      const existingCustomer = await ctx.db.customer.findUnique({
        where: { email: input.email },
      });

      if (existingCustomer) {
        throw new Error("Customer with this email already exists");
      }

      // Generate API key and hash the secret
      const apiKey = generateApiKey();
      const apiSecret = randomBytes(32).toString("hex");
      const hashedApiSecret = await bcrypt.hash(apiSecret, 12);

      const customer = await ctx.db.customer.create({
        data: {
          ...input,
          apiKey,
          apiSecret: hashedApiSecret,
        },
      });

      return {
        ...customer,
        // Return the plain API secret only on creation (for display to user)
        apiSecret: apiSecret,
      };
    }),

  // Update customer
  update: protectedProcedure
    .input(updateCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if customer exists
      const existingCustomer = await ctx.db.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        throw new Error("Customer not found");
      }

      // If email is being updated, check for conflicts
      if (updateData.email) {
        const emailConflict = await ctx.db.customer.findFirst({
          where: {
            email: updateData.email,
            id: { not: id },
          },
        });

        if (emailConflict) {
          throw new Error("Another customer with this email already exists");
        }
      }

      const customer = await ctx.db.customer.update({
        where: { id },
        data: updateData,
      });

      return {
        ...customer,
        // Don't expose API secret
        apiSecret: undefined,
      };
    }),

  // Regenerate API key
  regenerateApiKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if customer exists
      const existingCustomer = await ctx.db.customer.findUnique({
        where: { id: input.id },
      });

      if (!existingCustomer) {
        throw new Error("Customer not found");
      }

      // Generate new API key and secret
      const apiKey = generateApiKey();
      const apiSecret = randomBytes(32).toString("hex");
      const hashedApiSecret = await bcrypt.hash(apiSecret, 12);

      const customer = await ctx.db.customer.update({
        where: { id: input.id },
        data: {
          apiKey,
          apiSecret: hashedApiSecret,
        },
      });

      return {
        ...customer,
        // Return the plain API secret for display
        apiSecret: apiSecret,
      };
    }),

  // Delete customer (soft delete by setting inactive)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if customer exists
      const existingCustomer = await ctx.db.customer.findUnique({
        where: { id: input.id },
      });

      if (!existingCustomer) {
        throw new Error("Customer not found");
      }

      // Check if customer has active orders
      const activeOrders = await ctx.db.order.count({
        where: {
          customerId: input.id,
          status: { in: ["PENDING", "PROCESSING"] },
        },
      });

      if (activeOrders > 0) {
        throw new Error(
          "Cannot delete customer with active orders. Please complete or cancel all orders first.",
        );
      }

      // Soft delete by setting inactive
      const customer = await ctx.db.customer.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return {
        ...customer,
        apiSecret: undefined,
      };
    }),

  // Get customer statistics
  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findUnique({
        where: { id: input.id },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Get order statistics
      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        failedOrders,
        totalRevenue,
      ] = await Promise.all([
        ctx.db.order.count({
          where: { customerId: input.id },
        }),
        ctx.db.order.count({
          where: { customerId: input.id, status: "PENDING" },
        }),
        ctx.db.order.count({
          where: { customerId: input.id, status: "PROCESSING" },
        }),
        ctx.db.order.count({
          where: { customerId: input.id, status: "COMPLETED" },
        }),
        ctx.db.order.count({
          where: { customerId: input.id, status: "FAILED" },
        }),
        ctx.db.order.aggregate({
          where: { customerId: input.id, status: "COMPLETED" },
          _sum: { processedTotal: true },
        }),
      ]);

      return {
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        failedOrders,
        totalRevenue: totalRevenue._sum.processedTotal ?? 0,
        successRate:
          totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      };
    }),
});
