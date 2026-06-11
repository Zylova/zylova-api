import { Controller, Get, Param, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LicensesService } from './licenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all licenses for current user' })
  getMyLicenses(@Req() req: any) {
    return this.licensesService.getUserLicenses(req.user.email);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get license details' })
  async getLicense(@Req() req: any, @Param('id') id: string) {
    const license = await this.licensesService.getLicenseById(req.user.email, id);
    if (!license) throw new NotFoundException('License not found');
    return license;
  }
}
