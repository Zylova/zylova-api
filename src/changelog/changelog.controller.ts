import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChangelogService } from './changelog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Changelog')
@Controller('changelog')
export class ChangelogController {
  constructor(private readonly changelogService: ChangelogService) {}

  @Get(':productId')
  @ApiOperation({ summary: 'Get changelog for a product' })
  findByProduct(@Param('productId') productId: string) {
    return this.changelogService.findByProduct(productId);
  }

  @Post(':productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create changelog entry' })
  create(
    @Param('productId') productId: string,
    @Body() dto: { version: string; content: string },
  ) {
    return this.changelogService.create(productId, dto.version, dto.content);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update changelog entry' })
  update(
    @Param('id') id: string,
    @Body() dto: { version: string; content: string },
  ) {
    return this.changelogService.update(id, dto.version, dto.content);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete changelog entry' })
  delete(@Param('id') id: string) {
    return this.changelogService.delete(id);
  }
}
