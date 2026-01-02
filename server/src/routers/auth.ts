import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc'; // <--- Import protectedProcedure
import { JWT_SECRET } from '../context';
import redis from '../redis';
import { sendOtpEmail } from '../mailer'; 
import { rateLimitMiddleware } from '../limiter';

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email("Invalid email address")
});

const otpSchema = z.object({
  username: z.string(),
  otp: z.string().length(6)
});

export const authRouter = router({
  
  // 1. REGISTER
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.user.findFirst({
        where: { OR: [{ username: input.username }, { email: input.email }] }
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Username or Email already taken' });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      
      const user = await ctx.prisma.user.create({
        data: { 
          username: input.username, 
          password: hashedPassword,
          email: input.email 
        }
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, username: user.username };
    }),

  // 2. LOGIN
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      await rateLimitMiddleware(input.username);
      
      const user = await ctx.prisma.user.findUnique({ where: { username: input.username } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid password' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await redis.setex(`otp:${user.id}`, 600, otp);
      await sendOtpEmail(user.email, otp);

      return { status: 'OTP_SENT', message: `Code sent to ${user.email}` };
    }),

  // 3. VERIFY OTP
  verifyOtp: publicProcedure
    .input(otpSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({ where: { username: input.username } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });

      const storedOtp = await redis.get(`otp:${user.id}`);

      if (!storedOtp || storedOtp !== input.otp) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or Expired OTP' });
      }

      await redis.del(`otp:${user.id}`);

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      return { token, username: user.username };
    }),

  // 4. GET CURRENT USER (REQUIRED FOR CHAT UI) <--- I ADDED THIS FOR YOU
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user; // Returns logged-in user details
  }),
});