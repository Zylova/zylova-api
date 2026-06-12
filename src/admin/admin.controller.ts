import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Header,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AdminService } from './admin.service';
import { DownloadService } from '../download/download.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly downloadService: DownloadService,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
  ) {}

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

  @Patch('orders/:id/note')
  @ApiOperation({ summary: 'Add internal note to order' })
  async updateOrderNote(
    @Param('id') id: string,
    @Body() dto: { note: string },
  ) {
    return this.ordersService.updateInternalNote(id, dto.note);
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

  @Post('products/:id/clone')
  @ApiOperation({ summary: 'Clone a product' })
  async cloneProduct(@Param('id') id: string) {
    return this.productsService.cloneProduct(id);
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

  @Get('stats/downloads')
  @ApiOperation({ summary: 'Get download analytics' })
  getDownloadStats() {
    return this.adminService.getDownloadStats();
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Get maintenance mode status' })
  getMaintenance(): Record<string, boolean> {
    let enabled = false;
    try {
      const configPath = path.join(process.cwd(), 'maintenance.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
          enabled: boolean;
        };
        enabled = config.enabled;
      }
    } catch {
      /* noop */
    }
    return { enabled };
  }

  @Post('maintenance')
  @ApiOperation({ summary: 'Toggle maintenance mode' })
  toggleMaintenance(@Body() dto: { enabled: boolean }): {
    maintenance: boolean;
  } {
    const configPath = path.join(process.cwd(), 'maintenance.json');
    fs.writeFileSync(configPath, JSON.stringify({ enabled: dto.enabled }));
    return { maintenance: dto.enabled };
  }

  @Get('newsletter')
  @ApiOperation({ summary: 'List newsletter subscribers' })
  listNewsletter() {
    return this.adminService.listNewsletterSubscribers();
  }

  @Post('reset-users')
  @ApiOperation({ summary: 'Delete all users and reseed admin accounts' })
  resetUsers(@Body() body: { emails: string[] }) {
    return this.adminService.resetUsers(body.emails);
  }

  @Post('products/:productId/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product source code ZIP (admin)' })
  uploadProductFile(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.downloadService.saveProductFile(productId, file);
  }

  @Get('products/:productId/file')
  @ApiOperation({ summary: 'Get product file info (admin)' })
  getProductFile(@Param('productId') productId: string) {
    return this.downloadService.getProductFile(productId);
  }

  @Delete('products/:productId/file')
  @ApiOperation({ summary: 'Delete product file (admin)' })
  deleteProductFile(@Param('productId') productId: string) {
    return this.downloadService.deleteProductFile(productId);
  }

  @Get('orders')
  @ApiOperation({
    summary: 'List all orders with search, status, and pagination',
  })
  async getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(
      Number(page) || 1,
      Number(limit) || 20,
      search,
      status,
    );
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs with pagination' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs(
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Post('products/bulk-delete')
  @ApiOperation({ summary: 'Delete multiple products' })
  async bulkDeleteProducts(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteProducts(body.ids);
  }

  @Post('products/bulk-status')
  @ApiOperation({ summary: 'Update status of multiple products' })
  async bulkUpdateProductStatus(
    @Body() body: { ids: string[]; status: string; rejectReason?: string },
  ) {
    return this.adminService.bulkUpdateProductsStatus(
      body.ids,
      body.status,
      body.rejectReason,
    );
  }

  @Post('orders/bulk-delete')
  @ApiOperation({ summary: 'Delete multiple orders' })
  async bulkDeleteOrders(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteOrders(body.ids);
  }

  @Post('orders/bulk-status')
  @ApiOperation({ summary: 'Update status of multiple orders' })
  async bulkUpdateOrderStatus(
    @Body() body: { ids: string[]; status: string; refundReason?: string },
  ) {
    return this.adminService.bulkUpdateOrdersStatus(
      body.ids,
      body.status,
      body.refundReason,
    );
  }

  @Get('export/orders')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="orders.csv"')
  @ApiOperation({ summary: 'Export orders as CSV' })
  async exportOrders() {
    return this.adminService.exportOrdersCSV();
  }

  @Get('export/users')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="users.csv"')
  @ApiOperation({ summary: 'Export users as CSV' })
  async exportUsers() {
    return this.adminService.exportUsersCSV();
  }
}
