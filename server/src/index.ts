import express from 'express';
import cors from 'cors';
import { initTRPC } from '@trpc/server';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

// 1. Init
const app = express();
const prisma = new PrismaClient();

// 2. CORS (Allow Frontend)
app.use(cors({ origin: "http://localhost:5173" }));

// 3. tRPC Setup
const t = initTRPC.create();

const router = t.router;
const publicProcedure = t.procedure;

// 4. Zod Schemas (Validation Rules)
const createTodoSchema = z.object({
  text: z.string().min(3, "Min 3 characters required").max(100)
});

const toggleTodoSchema = z.object({
  id: z.string().uuid(), // Ensure it's a valid UUID
  done: z.boolean()
});

const deleteTodoSchema = z.object({
  id: z.string().uuid()
});

// --- NEW SCHEMA FOR EDITING ---
const updateTodoSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1, "Task cannot be empty").max(100)
});

// 5. App Router
const appRouter = router({
  // Query: Get All
  getTodos: publicProcedure.query(async () => {
    return await prisma.todo.findMany({ orderBy: { createdAt: 'desc' } });
  }),

  // Mutation: Add
  addTodo: publicProcedure
    .input(createTodoSchema)
    .mutation(async ({ input }) => {
      return await prisma.todo.create({ data: { text: input.text } });
    }),

  // Mutation: Toggle Done
  toggleTodo: publicProcedure
    .input(toggleTodoSchema)
    .mutation(async ({ input }) => {
      return await prisma.todo.update({
        where: { id: input.id },
        data: { done: input.done }
      });
    }),

  // --- NEW: Edit Text ---
  updateTodo: publicProcedure
    .input(updateTodoSchema)
    .mutation(async ({ input }) => {
      return await prisma.todo.update({
        where: { id: input.id },
        data: { text: input.text } // Only updates the text
      });
    }),

  // Mutation: Delete One
  deleteTodo: publicProcedure
    .input(deleteTodoSchema)
    .mutation(async ({ input }) => {
      return await prisma.todo.delete({ where: { id: input.id } });
    }),

  // --- NEW: Delete All Completed ---
  clearCompleted: publicProcedure
    .mutation(async () => {
      // Deletes everything where done === true
      return await prisma.todo.deleteMany({ where: { done: true } });
    }),
});

// 6. Export Type for Client
export type AppRouter = typeof appRouter;

// 7. Start Server
app.use('/trpc', createExpressMiddleware({ router: appRouter }));
app.listen(4000, () => console.log('Server running on http://localhost:4000'));