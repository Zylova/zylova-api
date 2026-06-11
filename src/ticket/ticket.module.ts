import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { AdminTicketController } from './admin-ticket.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TicketController, AdminTicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
