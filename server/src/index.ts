import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { mergeRouters } from './trpc';
import { createContext } from './context';
import { authRouter } from './routers/auth';
import { todoRouter } from './routers/todo';

// 1. Init
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));

const appRouter = mergeRouters(authRouter, todoRouter);

// 3. Export Type for Client
export type AppRouter = typeof appRouter;

// 4. Start Server
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
}));

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});