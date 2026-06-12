import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('referral')
@Controller()
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('referral/code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get or create referral code' })
  getCode(@CurrentUser('id') userId: string) {
    return this.referralService.getOrCreateCode(userId).then((code) => ({ code }));
  }

  @Get('referral/info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referral stats and history' })
  getInfo(@CurrentUser('id') userId: string) {
    return this.referralService.getReferralInfo(userId);
  }

  @Post('referral/apply')
  @ApiOperation({ summary: 'Apply a referral code during checkout' })
  applyCode(@Body() body: { code: string; email: string }) {
    return this.referralService.applyReferralCode(body.code, body.email).then(() => ({ success: true }));
  }

  // Admin endpoints
  @Get('admin/referrals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all referrals (admin)' })
  listReferrals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.referralService.adminListReferrals(
      Number(page) || 1,
      Number(limit) || 20,
      status,
    );
  }

  @Patch('admin/referrals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update referral (admin)' })
  updateReferral(
    @Param('id') id: string,
    @Body() body: { status?: string; commission?: number },
  ) {
    return this.referralService.adminUpdateReferral(id, body);
  }

  @Get('admin/stats/referrals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referral statistics (admin)' })
  getReferralStats() {
    return this.referralService.adminGetReferralStats();
  }
}
