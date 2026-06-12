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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BundleService } from './bundle.service';
import { CreateBundleDto, UpdateBundleDto } from './dto/bundle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('bundles')
@Controller('bundles')
export class BundleController {
  constructor(private readonly bundleService: BundleService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active bundles' })
  findAll() {
    return this.bundleService.findAll();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bundles including inactive (admin)' })
  findAllAdmin() {
    return this.bundleService.findAllAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bundle by ID' })
  findById(@Param('id') id: string) {
    return this.bundleService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get bundle by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.bundleService.findBySlug(slug);
  }

  @Get(':id/price')
  @ApiOperation({ summary: 'Calculate bundle price with discount' })
  calculatePrice(@Param('id') id: string) {
    return this.bundleService.calculateBundlePrice(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new bundle (admin)' })
  create(@Body() dto: CreateBundleDto) {
    return this.bundleService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a bundle (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateBundleDto) {
    return this.bundleService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a bundle (admin)' })
  remove(@Param('id') id: string) {
    return this.bundleService.remove(id);
  }
}
