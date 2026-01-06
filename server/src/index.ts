import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { mergeRouters } from './trpc';
import { createContext } from './context'; 
import { authRouter } from './routers/auth';
import { todoRouter } from './routers/todo';
import { chatRouter } from './routers/chat';

// 1. Merge all routers
const appRouter = mergeRouters(authRouter, todoRouter, chatRouter);
export type AppRouter = typeof appRouter;

// 2. Init Express
const app = express();
app.use(cors({ origin: "http://localhost:5173" }));

// 3. Create HTTP Server (Shared by Express & WebSockets)
const server = createServer(app);

// 4. Setup WebSocket Server
const wss = new WebSocketServer({ server });

const handler = applyWSSHandler({ 
  wss, 
  router: appRouter, 
  // FIX: Manually map the WebSocket request to your Context
  createContext: async (opts) => {
    return createContext({ 
      req: opts.req as any, 
      res: opts.res as any 
    });
  }
});

// 5. Setup Normal API Route
app.use('/trpc', createExpressMiddleware({ 
  router: appRouter, 
  createContext 
}));
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
// 6. Listen
// server.listen(4000, () => {
//   console.log('🚀 Server running on http://localhost:4000 (HTTP + WS)');
// });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

// Cleanup on shut down
process.on('SIGTERM', () => {
  handler.broadcastReconnectNotification();
  wss.close();
});