import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DownloadService } from '../download/download.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [AdminController],
  providers: [AdminService, DownloadService],
  exports: [AdminService, DownloadService],
})
export class AdminModule {}
