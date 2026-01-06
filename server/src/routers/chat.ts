import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';

// Event Emitter for Real-time chat
const ee = new EventEmitter();

export const chatRouter = router({

  // 1. GET ALL USERS (For New Chat List)
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.user.findMany({
      where: { id: { not: ctx.user.id } }, // Don't show myself
      select: { 
        id: true, 
        username: true, 
        isOnline: true // 🟢 Fetch Online Status
      },
      orderBy: { username: 'asc' }
    });
  }),

  // 2. GET MY CONVERSATIONS (Sidebar List)
  getMyChats: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.conversation.findMany({
      where: {
        participants: { some: { userId: ctx.user.id } }
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, isOnline: true } } }
        },
        messages: {
          take: 1, // Get only the last message for preview
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' } // Show recent chats first
    });
  }),

  // 3. CREATE PRIVATE CHAT (Direct Message)
  createPrivateChat: protectedProcedure
    .input(z.object({ otherUserId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Check if DM already exists
      const existing = await ctx.prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: { userId: { in: [ctx.user.id, input.otherUserId] } }
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
              { userId: ctx.user.id },
              { userId: input.otherUserId }
            ]
          }
        }
      });
    }),

  // 4. CREATE GROUP CHAT (👥 New Feature)
  createGroup: protectedProcedure
    .input(z.object({ 
      name: z.string(), 
      participantIds: z.array(z.string()) 
    }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.conversation.create({
        data: {
          isGroup: true,
          name: input.name,
          participants: {
            create: [
              { userId: ctx.user.id }, // Add Me (Creator)
              ...input.participantIds.map(id => ({ userId: id })) // Add Friends
            ]
          }
        },
        include: { participants: { include: { user: true } } }
      });
    }),

  // 5. SEND MESSAGE (Supports Text & Images)
  sendMessage: protectedProcedure
    .input(z.object({ 
      conversationId: z.string(),
      content: z.string().optional(),
      isCode: z.boolean().default(false),
      // 📷 New Inputs for Files
      type: z.enum(['text', 'image']).default('text'),
      attachment: z.string().optional(), // Base64 string
    }))
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          userId: ctx.user.id,
          // If it's an image, content can be optional description or just "Sent an image"
          content: input.content || (input.type === 'image' ? 'Sent an image' : ''),
          isCode: input.isCode,
          type: input.type,
          attachment: input.attachment,
        },
        include: { user: true }
      });

      // Update Conversation "UpdatedAt" timestamp (so it moves to top of list)
      await ctx.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { createdAt: new Date() }
      });

      // Broadcast to Room
      ee.emit(`room:${input.conversationId}`, message);
      return message;
    }),

  // 6. GET HISTORY (Chat Room Messages)
  getHistory: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await ctx.prisma.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: 'asc' },
        include: { user: true }
      });
    }),

  // 7. REAL-TIME SUBSCRIPTION
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