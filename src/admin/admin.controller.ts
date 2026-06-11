import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List users with search and pagination' })
  listUsers(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers(
      q,
      role,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user role or ban status' })
  updateUser(
    @Param('id') id: string,
    @Body() body: { role?: string; banned?: boolean },
  ) {
    return this.adminService.updateUser(id, body);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'List contact submissions' })
  listContacts(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listContacts(
      q,
      status,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update contact submission status' })
  updateContactStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.updateContactStatus(id, body.status);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Update order status' })
  updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string; refundReason?: string },
  ) {
    return this.adminService.updateOrderStatus(
      id,
      body.status,
      body.refundReason,
    );
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update product status' })
  updateProductStatus(
    @Param('id') id: string,
    @Body() body: { status: string; rejectReason?: string },
  ) {
    return this.adminService.updateProductStatus(
      id,
      body.status,
      body.rejectReason,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('newsletter')
  @ApiOperation({ summary: 'List newsletter subscribers' })
  listNewsletter() {
    return this.adminService.listNewsletterSubscribers();
  }
}
