import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateConversationDto, SendMessageDto } from "./dto";

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(dto: CreateConversationDto, userId: string) {
    if (dto.recipientId === userId) {
      throw new BadRequestException("Cannot start a conversation with yourself");
    }

    // Check if recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId }
    });

    if (!recipient) {
      throw new NotFoundException("User not found");
    }

    // Check if conversation already exists (in either direction)
    const existing = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1: userId, participant2: dto.recipientId },
          { participant1: dto.recipientId, participant2: userId }
        ]
      }
    });

    if (existing) {
      return this.getConversation(existing.id, userId);
    }

    // Create new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        participant1: userId,
        participant2: dto.recipientId
      },
      include: {
        user1: {
          select: {
            id: true,
            displayName: true
          }
        },
        user2: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });

    const otherUser =
      conversation.participant1 === userId ? conversation.user2 : conversation.user1;

    return {
      id: conversation.id,
      otherUser,
      createdAt: conversation.createdAt,
      lastMessage: null,
      unreadCount: 0
    };
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participant1: userId }, { participant2: userId }]
      },
      include: {
        user1: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                avatarBodyType: true,
                avatarSkinColor: true,
                avatarHairstyle: true,
                avatarAccessory: true
              }
            }
          }
        },
        user2: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                avatarBodyType: true,
                avatarSkinColor: true,
                avatarHairstyle: true,
                avatarAccessory: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            senderId: true,
            createdAt: true,
            readAt: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    // Get unread counts
    const unreadCounts = await this.prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        senderId: { not: userId },
        readAt: null,
        conversation: {
          OR: [{ participant1: userId }, { participant2: userId }]
        }
      },
      _count: true
    });

    const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count]));

    return conversations.map((conv) => {
      const otherUserData = conv.participant1 === userId ? conv.user2 : conv.user1;
      const lastMessage = conv.messages[0];

      const avatarConfig = otherUserData.profile?.avatarBodyType ? {
        bodyType: otherUserData.profile.avatarBodyType,
        skinColor: otherUserData.profile.avatarSkinColor,
        hairstyle: otherUserData.profile.avatarHairstyle,
        accessory: otherUserData.profile.avatarAccessory
      } : null;

      return {
        id: conv.id,
        otherUser: {
          id: otherUserData.id,
          displayName: otherUserData.displayName,
          avatarConfig
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content.substring(0, 100),
              isFromMe: lastMessage.senderId === userId,
              createdAt: lastMessage.createdAt,
              isRead: !!lastMessage.readAt
            }
          : null,
        unreadCount: unreadMap.get(conv.id) || 0,
        updatedAt: conv.updatedAt
      };
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: {
          select: {
            id: true,
            displayName: true
          }
        },
        user2: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    // Check if user is participant
    if (conversation.participant1 !== userId && conversation.participant2 !== userId) {
      throw new ForbiddenException("You are not part of this conversation");
    }

    const otherUser =
      conversation.participant1 === userId ? conversation.user2 : conversation.user1;

    // Get unread count
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null
      }
    });

    return {
      id: conversation.id,
      otherUser,
      createdAt: conversation.createdAt,
      unreadCount
    };
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (conversation.participant1 !== userId && conversation.participant2 !== userId) {
      throw new ForbiddenException("You are not part of this conversation");
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      this.prisma.message.count({
        where: { conversationId }
      })
    ]);

    return {
      messages: messages.reverse().map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        isFromMe: msg.senderId === userId,
        readAt: msg.readAt,
        createdAt: msg.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async sendMessage(conversationId: string, dto: SendMessageDto, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (conversation.participant1 !== userId && conversation.participant2 !== userId) {
      throw new ForbiddenException("You are not part of this conversation");
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: dto.content
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true
            }
          }
        }
      });

      // Update conversation's updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

      return msg;
    });

    return {
      id: message.id,
      content: message.content,
      sender: message.sender,
      isFromMe: true,
      createdAt: message.createdAt
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (conversation.participant1 !== userId && conversation.participant2 !== userId) {
      throw new ForbiddenException("You are not part of this conversation");
    }

    // Mark all unread messages from other user as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    return { message: "Messages marked as read" };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        senderId: { not: userId },
        readAt: null,
        conversation: {
          OR: [{ participant1: userId }, { participant2: userId }]
        }
      }
    });

    return { unreadCount: count };
  }
}
