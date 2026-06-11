import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async sendMessage(dto: {
    sessionId: string;
    sender: string;
    content: string;
    name?: string;
    email?: string;
  }) {
    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId: dto.sessionId,
        sender: dto.sender,
        content: dto.content,
        name: dto.name || 'Guest',
        email: dto.email,
      },
    });

    this.events.notifyNewChatMessage(message);
    return message;
  }

  async getMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSessions() {
    const sessions = await this.prisma.chatMessage.groupBy({
      by: ['sessionId'],
      _count: { id: true },
      _min: { createdAt: true },
    });

    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const last = await this.prisma.chatMessage.findFirst({
          where: { sessionId: s.sessionId },
          orderBy: { createdAt: 'desc' },
        });
        const unread = await this.prisma.chatMessage.count({
          where: { sessionId: s.sessionId, sender: 'user', read: false },
        });
        return {
          sessionId: s.sessionId,
          name: last?.name || 'Guest',
          email: last?.email || null,
          messageCount: s._count.id,
          lastMessage: last?.content || '',
          lastActivity: last?.createdAt || s._min.createdAt,
          unreadCount: unread,
        };
      }),
    );

    return enriched.sort(
      (a, b) =>
        new Date(b.lastActivity ?? 0).getTime() -
        new Date(a.lastActivity ?? 0).getTime(),
    );
  }

  async markRead(sessionId: string) {
    await this.prisma.chatMessage.updateMany({
      where: { sessionId, sender: 'user', read: false },
      data: { read: true },
    });
  }
}
