import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  id: z.string(),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const resetPasswordSchema = z.object({
  id: z.string(),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const userRouter = createTRPCRouter({
  // Get all admin users
  getAll: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.adminUser.findMany({
        where: input.includeInactive ? {} : { isActive: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              processedOrders: true,
            },
          },
        },
      });

      return users.map((user) => ({
        ...user,
        processedOrderCount: user._count.processedOrders,
      }));
    }),

  // Get user by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.adminUser.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          processedOrders: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              action: true,
              status: true,
              notes: true,
              createdAt: true,
              order: {
                select: {
                  id: true,
                  externalOrderId: true,
                  customer: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              processedOrders: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        ...user,
        processedOrderCount: user._count.processedOrders,
      };
    }),

  // Create new admin user
  create: protectedProcedure
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if current user has permission to create users
      if (ctx.session.user.role !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admins can create new users",
        });
      }

      // Check if email already exists
      const existingUser = await ctx.db.adminUser.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      const user = await ctx.db.adminUser.create({
        data: {
          ...input,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // Update user
  update: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if user exists
      const existingUser = await ctx.db.adminUser.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check permissions for role changes
      if (updateData.role && ctx.session.user.role !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admins can change user roles",
        });
      }

      // Prevent users from deactivating themselves
      if (updateData.isActive === false && ctx.session.user.id === id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate your own account",
        });
      }

      // If email is being updated, check for conflicts
      if (updateData.email) {
        const emailConflict = await ctx.db.adminUser.findFirst({
          where: {
            email: updateData.email,
            id: { not: id },
          },
        });

        if (emailConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Another user with this email already exists",
          });
        }
      }

      const user = await ctx.db.adminUser.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // Change password (for current user)
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, currentPassword, newPassword } = input;

      // Only allow users to change their own password, or Super Admins to change any password
      if (
        ctx.session.user.id !== id &&
        ctx.session.user.role !== "SUPER_ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only change your own password",
        });
      }

      // Get user with password
      const user = await ctx.db.adminUser.findUnique({
        where: { id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify current password (skip for Super Admins changing other users' passwords)
      if (ctx.session.user.id === id) {
        const isValidPassword = await bcrypt.compare(
          currentPassword,
          user.password,
        );
        if (!isValidPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Current password is incorrect",
          });
        }
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      await ctx.db.adminUser.update({
        where: { id },
        data: { password: hashedNewPassword },
      });

      return { success: true };
    }),

  // Reset password (for Super Admins)
  resetPassword: protectedProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      // Only Super Admins can reset passwords
      if (ctx.session.user.role !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admins can reset passwords",
        });
      }

      const { id, newPassword } = input;

      // Check if user exists
      const existingUser = await ctx.db.adminUser.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await ctx.db.adminUser.update({
        where: { id },
        data: { password: hashedPassword },
      });

      return { success: true };
    }),

  // Delete user (soft delete by setting inactive)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only Super Admins can delete users
      if (ctx.session.user.role !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admins can delete users",
        });
      }

      // Prevent users from deleting themselves
      if (ctx.session.user.id === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      // Check if user exists
      const existingUser = await ctx.db.adminUser.findUnique({
        where: { id: input.id },
      });

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Soft delete by setting inactive
      const user = await ctx.db.adminUser.update({
        where: { id: input.id },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  // Get user statistics
  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.adminUser.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Get processing statistics
      const [
        totalProcessingLogs,
        ordersStarted,
        ordersCompleted,
        ordersFailed,
        recentActivity,
      ] = await Promise.all([
        ctx.db.processingLog.count({
          where: { adminUserId: input.id },
        }),
        ctx.db.processingLog.count({
          where: {
            adminUserId: input.id,
            action: "PROCESSING_STARTED",
          },
        }),
        ctx.db.processingLog.count({
          where: {
            adminUserId: input.id,
            action: "ORDER_COMPLETED",
          },
        }),
        ctx.db.processingLog.count({
          where: {
            adminUserId: input.id,
            action: "ORDER_FAILED",
          },
        }),
        ctx.db.processingLog.count({
          where: {
            adminUserId: input.id,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ]);

      return {
        totalProcessingLogs,
        ordersStarted,
        ordersCompleted,
        ordersFailed,
        recentActivity,
        successRate:
          ordersStarted > 0 ? (ordersCompleted / ordersStarted) * 100 : 0,
      };
    }),

  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.adminUser.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User profile not found",
      });
    }

    return user;
  }),
});
