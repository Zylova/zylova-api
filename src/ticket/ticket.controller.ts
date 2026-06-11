import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a support ticket' })
  create(
    @Req() req: any,
    @Body()
    dto: {
      subject: string;
      content: string;
      category?: string;
      priority?: string;
    },
  ) {
    return this.ticketService.create(
      req.user.id,
      dto.subject,
      dto.content,
      dto.category,
      dto.priority,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my tickets' })
  getMyTickets(@Req() req: any) {
    return this.ticketService.findByUser(req.user.id);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket details' })
  getTicket(@Req() req: any, @Param('id') id: string) {
    return this.ticketService.findById(req.user.id, id);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a ticket' })
  reply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { content: string },
  ) {
    return this.ticketService.addReply(req.user.id, id, dto.content, false);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close a ticket' })
  close(@Req() req: any, @Param('id') id: string) {
    return this.ticketService.closeTicket(req.user.id, id);
  }
}
