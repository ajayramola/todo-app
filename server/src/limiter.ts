import { RateLimiterRedis } from 'rate-limiter-flexible';
import { TRPCError } from '@trpc/server';
import redis from './redis'; // Use your existing Redis connection

// Allow 5 attempts per 60 seconds
const limiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'login_limit',
  points: 5, // Number of points
  duration: 60, // Per 60 seconds
});

export const rateLimitMiddleware = async (username: string) => {
  try {
    await limiter.consume(username); // Consume 1 point
  } catch (rejRes) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Try again in 1 minute.',
    });
  }
};