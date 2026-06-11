import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.adminSockets.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-admin')
  handleJoinAdmin(client: Socket) {
    this.adminSockets.add(client.id);
    void client.join('admin-room');
    this.logger.log(`Admin joined: ${client.id}`);
  }

  @SubscribeMessage('join-order-tracking')
  handleJoinOrderTracking(client: Socket, email: string) {
    void client.join(`order-${email}`);
  }

  @SubscribeMessage('join-chat')
  handleJoinChat(client: Socket, sessionId: string) {
    void client.join(`chat-${sessionId}`);
  }

  @SubscribeMessage('join-admin-chat')
  handleJoinAdminChat(client: Socket) {
    void client.join('admin-chat-room');
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
