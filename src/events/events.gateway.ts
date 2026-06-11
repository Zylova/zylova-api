import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { RateLimiterMemory } from 'rate-limiter-flexible';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private adminSockets = new Set<string>();

  private readonly rateLimiter = new RateLimiterMemory({
    points: 30,
    duration: 10,
    keyPrefix: 'ws',
  });

  constructor(private readonly jwtService: JwtService) {}

  private async checkRateLimit(client: Socket): Promise<boolean> {
    try {
      await this.rateLimiter.consume(client.id);
      return true;
    } catch {
      client.emit('rateLimit', { message: 'Too many messages. Please slow down.' });
      return false;
    }
  }

  handleConnection(client: Socket) {
    const namespace = client.nsp.name;

    if (namespace === '/admin-room') {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }
      try {
        const decoded = this.jwtService.verify<JwtPayload>(token);
        if (decoded.role !== 'ADMIN') {
          client.disconnect();
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        client.data.user = decoded;
      } catch {
        client.disconnect();
        return;
      }
    }

    if (namespace === '/order-tracking') {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }
      try {
        this.jwtService.verify(token);
      } catch {
        client.disconnect();
        return;
      }
    }

    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.adminSockets.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-admin')
  async handleJoinAdmin(client: Socket) {
    if (!(await this.checkRateLimit(client))) return;
    this.adminSockets.add(client.id);
    await client.join('admin-room');
    this.logger.log(`Admin joined: ${client.id}`);
  }

  @SubscribeMessage('join-order-tracking')
  async handleJoinOrderTracking(client: Socket, email: string) {
    if (!(await this.checkRateLimit(client))) return;
    await client.join(`order-${email}`);
  }

  @SubscribeMessage('join-chat')
  async handleJoinChat(client: Socket, sessionId: string) {
    if (!(await this.checkRateLimit(client))) return;
    await client.join(`chat-${sessionId}`);
  }

  @SubscribeMessage('join-admin-chat')
  async handleJoinAdminChat(client: Socket) {
    if (!(await this.checkRateLimit(client))) return;
    await client.join('admin-chat-room');
  }

  notifyNewOrder(order: Record<string, any>) {
    void this.server.to('admin-room').emit('new-order', order);
  }

  notifyOrderUpdated(order: Record<string, any>) {
    void this.server.to(`order-${order.email}`).emit('order-updated', order);
    void this.server.to('admin-room').emit('order-updated', order);
  }

  notifyNewContact(contact: Record<string, any>) {
    void this.server.to('admin-room').emit('new-contact', contact);
  }

  notifyNewTicket(ticket: Record<string, any>) {
    void this.server.to('admin-room').emit('new-ticket', ticket);
  }

  notifyNewChatMessage(message: Record<string, any>) {
    void this.server
      .to(`chat-${message.sessionId}`)
      .emit('chat-message', message);
    void this.server.to('admin-chat-room').emit('chat-message', message);
  }

  notifyStatsUpdated(stats: Record<string, any>) {
    void this.server.to('admin-room').emit('stats-updated', stats);
  }

  notifyProductUpdated(product: Record<string, any>) {
    void this.server.to('admin-room').emit('product-updated', product);
  }
}
