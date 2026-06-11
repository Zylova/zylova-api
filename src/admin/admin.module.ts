import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DownloadService } from '../download/download.service';
import { PaymentModule } from '../payment/payment.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PaymentModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminService, DownloadService],
  exports: [AdminService, DownloadService],
})
export class AdminModule {}
