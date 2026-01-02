import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { TRPCError } from '@trpc/server';

const ee = new EventEmitter();

export const chatRouter = router({

  // 1. GET ALL USERS (To select who to chat with)
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.user.findMany({
      where: { id: { not: ctx.userId } }, // Don't show myself
      select: { id: true, username: true }
    });
  }),

  // 2. GET MY CONVERSATIONS (Sidebar List)
  getMyChats: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.conversation.findMany({
      where: {
        participants: { some: { userId: ctx.userId } }
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true } } }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }),

  // 3. CREATE PRIVATE CHAT (Start DM)
  createPrivateChat: protectedProcedure
    .input(z.object({ otherUserId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Check if chat already exists
      const existing = await ctx.prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: { userId: { in: [ctx.userId, input.otherUserId] } }
          }
        }
      });

      if (existing) return existing;

      // Create new DM
      return await ctx.prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              { userId: ctx.userId },
              { userId: input.otherUserId }
            ]
          }
        }
      });
    }),

  // 4. CREATE GROUP CHAT
  createGroupChat: protectedProcedure
    .input(z.object({ name: z.string(), userIds: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.conversation.create({
        data: {
          isGroup: true,
          name: input.name,
          participants: {
            create: [
              { userId: ctx.userId }, // Add creator
              ...input.userIds.map(id => ({ userId: id })) // Add others
            ]
          }
        }
      });
    }),

  // 5. SEND MESSAGE (To specific Room)
  sendMessage: protectedProcedure
    .input(z.object({ 
      conversationId: z.string(),
      content: z.string(),
      isCode: z.boolean().default(false)
    }))
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.prisma.message.create({
        data: {
          content: input.content,
          isCode: input.isCode,
          conversationId: input.conversationId,
          userId: ctx.userId,
        },
        include: { user: true }
      });

      // Broadcast to that specific room ID
      ee.emit(`room:${input.conversationId}`, message);
      return message;
    }),

  // 6. GET HISTORY (For specific Room)
  getHistory: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.prisma.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: 'asc' },
        include: { user: true }
      });
    }),

  // 7. LIVE SUBSCRIPTION (Listen to Room)
  onMessage: publicProcedure
    .input(z.object({ conversationId: z.string() }))
    .subscription(({ input }) => {
      return observable<any>((emit) => {
        const onMessage = (data: any) => emit.next(data);
        ee.on(`room:${input.conversationId}`, onMessage);
        return () => { ee.off(`room:${input.conversationId}`, onMessage); };
      });
    }),
});