import * as trpcExpress from '@trpc/server/adapters/express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const prisma = new PrismaClient();
// Ideally, put this in a .env file
export const JWT_SECRET = "super-secret-key-change-this-in-prod"; 

export const createContext = ({ req }: trpcExpress.CreateExpressContextOptions) => {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      return { userId: decoded.userId, prisma };
    } catch (err) {
      // Token expired or invalid
    }
  }
  return { userId: null, prisma };
};

export type Context = Awaited<ReturnType<typeof createContext>>;