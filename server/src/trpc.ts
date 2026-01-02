import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

// Middleware: Checks if user is logged in
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be logged in' });
  }
  return next({ ctx: { userId: ctx.userId } });
});

// Export reusable router and procedures
export const router = t.router;
export const mergeRouters = t.mergeRouters; // Allows combining routers
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);