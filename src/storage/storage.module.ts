import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { CdnService } from './cdn.service';

@Global()
@Module({
  providers: [StorageService, CdnService],
  exports: [StorageService, CdnService],
})
export class StorageModule {}
