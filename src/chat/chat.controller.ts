import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a chat message' })
  sendMessage(
    @Body()
    dto: {
      sessionId: string;
      sender: string;
      content: string;
      name?: string;
      email?: string;
    },
  ) {
    return this.chatService.sendMessage(dto);
  }

  @Get('messages/:sessionId')
  @ApiOperation({ summary: 'Get chat messages by session' })
  getMessages(@Param('sessionId') sessionId: string) {
    return this.chatService.getMessages(sessionId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chat sessions (admin)' })
  getSessions() {
    return this.chatService.getSessions();
  }

  @Post('sessions/:sessionId/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark chat session as read (admin)' })
  markRead(@Param('sessionId') sessionId: string) {
    return this.chatService.markRead(sessionId);
  }
}
