import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';

// Validation Schemas
const createTodoSchema = z.object({ text: z.string().min(3).max(100) });
const toggleTodoSchema = z.object({ id: z.string().uuid(), done: z.boolean() });
const updateTodoSchema = z.object({ id: z.string().uuid(), text: z.string().min(1) });
const deleteTodoSchema = z.object({ id: z.string().uuid() });

export const todoRouter = router({
  getTodos: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.todo.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
    });
  }),

  addTodo: protectedProcedure
    .input(createTodoSchema)
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.todo.create({
        data: { text: input.text, userId: ctx.userId }
      });
    }),

  toggleTodo: protectedProcedure
    .input(toggleTodoSchema)
    .mutation(async ({ input, ctx }) => {
      const todo = await ctx.prisma.todo.findFirst({ where: { id: input.id, userId: ctx.userId } });
      if (!todo) throw new TRPCError({ code: 'FORBIDDEN' });

      return await ctx.prisma.todo.update({
        where: { id: input.id },
        data: { done: input.done }
      });
    }),

  updateTodo: protectedProcedure
    .input(updateTodoSchema)
    .mutation(async ({ input, ctx }) => {
      const todo = await ctx.prisma.todo.findFirst({ where: { id: input.id, userId: ctx.userId } });
      if (!todo) throw new TRPCError({ code: 'FORBIDDEN' });

      return await ctx.prisma.todo.update({
        where: { id: input.id },
        data: { text: input.text }
      });
    }),

  deleteTodo: protectedProcedure
    .input(deleteTodoSchema)
    .mutation(async ({ input, ctx }) => {
      const todo = await ctx.prisma.todo.findFirst({ where: { id: input.id, userId: ctx.userId } });
      if (!todo) throw new TRPCError({ code: 'FORBIDDEN' });

      return await ctx.prisma.todo.delete({ where: { id: input.id } });
    }),

  clearCompleted: protectedProcedure.mutation(async ({ ctx }) => {
    return await ctx.prisma.todo.deleteMany({
      where: { done: true, userId: ctx.userId }
    });
  }),
});