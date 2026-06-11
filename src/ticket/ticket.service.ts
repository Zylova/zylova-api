import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async create(
    userId: string,
    subject: string,
    content: string,
    category: string = 'general',
    priority: string = 'normal',
  ) {
    const ticket = await this.prisma.ticket.create({
      data: { userId, subject, content, category, priority },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    this.events.notifyNewTicket(ticket);
    return ticket;
  }

  async findByUser(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { replies: true } },
      },
    });
  }

  async findById(userId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId)
      throw new ForbiddenException('Not your ticket');
    return ticket;
  }

  async findByIdAdmin(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async addReply(
    userId: string,
    ticketId: string,
    content: string,
    isAdmin: boolean = false,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId && !isAdmin)
      throw new ForbiddenException('Not your ticket');

    const reply = await this.prisma.ticketReply.create({
      data: { ticketId, userId, content, isAdmin },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (isAdmin && ticket.status === 'open') {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'in_progress' },
      });
    }
    if (
      !isAdmin &&
      (ticket.status === 'resolved' || ticket.status === 'closed')
    ) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'in_progress' },
      });
    }

    return reply;
  }

  async closeTicket(userId: string, ticketId: string) {
    await this.findById(userId, ticketId);
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'closed' },
    });
  }

  async findAll(search?: string, status?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { replies: true } },
      },
    });
  }

  async updateStatus(ticketId: string, status: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    });
  }
}
