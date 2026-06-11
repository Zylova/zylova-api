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
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new review (public)' })
  create(
    @Body()
    dto: {
      productId: string;
      email: string;
      name: string;
      rating: number;
      comment?: string;
    },
  ) {
    return this.reviewsService.create(dto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get approved reviews for a product' })
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews (admin)' })
  findAll() {
    return this.reviewsService.findAll();
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a review (admin)' })
  approve(@Param('id') id: string) {
    return this.reviewsService.approve(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review (admin)' })
  delete(@Param('id') id: string) {
    return this.reviewsService.delete(id);
  }
}
