import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DownloadService } from '../download/download.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, DownloadService],
  exports: [AdminService, DownloadService],
})
export class AdminModule {}
