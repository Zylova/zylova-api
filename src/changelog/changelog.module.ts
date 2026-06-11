import { Module } from '@nestjs/common';
import { ChangelogService } from './changelog.service';
import { ChangelogController } from './changelog.controller';

@Module({
  controllers: [ChangelogController],
  providers: [ChangelogService],
  exports: [ChangelogService],
})
export class ChangelogModule {}
