import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService, CreateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order after successful payment' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get('download/:token')
  @ApiOperation({ summary: 'Get order by download token' })
  findByToken(@Param('token') token: string) {
    return this.ordersService.findByDownloadToken(token);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (admin)' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('by-email')
  @ApiOperation({ summary: 'Get orders by email' })
  findByEmail(@Query('email') email: string) {
    return this.ordersService.findByEmail(email);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: string; refundReason?: string },
  ) {
    return this.ordersService.updateStatus(id, dto.status, dto.refundReason);
  }
}
