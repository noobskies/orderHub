import { customerRouter } from "@/server/api/routers/customer";
import { orderRouter } from "@/server/api/routers/order";
import { userRouter } from "@/server/api/routers/user";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { webhookRouter } from "@/server/api/routers/webhook";
import { endConsumerRouter } from "@/server/api/routers/endConsumer";
import { taobaoRouter } from "@/server/api/routers/taobao";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  customer: customerRouter,
  order: orderRouter,
  user: userRouter,
  analytics: analyticsRouter,
  webhook: webhookRouter,
  endConsumer: endConsumerRouter,
  taobao: taobaoRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.order.getAll();
 *       ^? Order[]
 */
export const createCaller = createCallerFactory(appRouter);
