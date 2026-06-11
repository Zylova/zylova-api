import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin Tickets')
@Controller('admin/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminTicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  @ApiOperation({ summary: 'List all tickets with filters' })
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.ticketService.findAll(search, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details (admin)' })
  getTicket(@Param('id') id: string) {
    return this.ticketService.findByIdAdmin(id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply as admin' })
  reply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { content: string },
  ) {
    return this.ticketService.addReply(req.user.id, id, dto.content, true);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  updateStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.ticketService.updateStatus(id, dto.status);
  }
}
