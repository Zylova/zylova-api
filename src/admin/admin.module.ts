import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DownloadService } from '../download/download.service';
import { PaymentModule } from '../payment/payment.module';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [PaymentModule, AuditModule, OrdersModule, ProductsModule],
  controllers: [AdminController],
  providers: [AdminService, DownloadService],
  exports: [AdminService, DownloadService],
})
export class AdminModule {}
