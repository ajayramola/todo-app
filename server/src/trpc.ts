import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const mergeRouters = t.mergeRouters;

// --- UPDATED MIDDLEWARE ---
// 1. Must be 'async' to talk to Database
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  // 2. FETCH THE USER from Database
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.userId },
  });

  // 3. Check if user still exists
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User account no longer exists' });
  }

  // 4. Return Context WITH the User object
  return next({
    ctx: {
      userId: ctx.userId,
      user: user, // <--- This fixes the error in auth.ts!
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);