import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { JWT_SECRET } from '../context';
import redis from '../redis'; // <--- Import the file we just made

const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

const otpSchema = z.object({
  username: z.string(),
  otp: z.string().length(6)
});

export const authRouter = router({
  
  // 1. REGISTER
  register: publicProcedure
    .input(authSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.user.findUnique({ where: { username: input.username } });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'User already exists' });

      const hashedPassword = await bcrypt.hash(input.password, 10);
      
      const user = await ctx.prisma.user.create({
        data: { username: input.username, password: hashedPassword }
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, username: user.username };
    }),

  // 2. LOGIN (Step 1: Generate & Store OTP)
  login: publicProcedure
    .input(authSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({ where: { username: input.username } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid password' });

      // Generate 6-digit code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // --- STORE IN REDIS ---
      // Key: otp:USER_ID
      // Value: 123456
      // Expiration: 600 seconds (10 minutes)
      await redis.setex(`otp:${user.id}`, 600, otp);

      console.log(`🔐 OTP for ${user.username}: ${otp}`); // Check your server terminal!

      return { status: 'OTP_SENT', message: 'OTP sent to console' };
    }),

  // 3. VERIFY OTP (Step 2: Check Redis)
  verifyOtp: publicProcedure
    .input(otpSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({ where: { username: input.username } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });

      // Retrieve from Redis
      const storedOtp = await redis.get(`otp:${user.id}`);

      if (!storedOtp) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'OTP Expired or Invalid' });
      }

      if (storedOtp !== input.otp) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Incorrect OTP' });
      }

      // Success: Clean up and Login
      await redis.del(`otp:${user.id}`); // Delete so it can't be reused

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, username: user.username };
    }),
});