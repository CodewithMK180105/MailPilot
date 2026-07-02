import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CampaignOwnerGuard } from '../common/guards/campaign-owner.guard';

@Controller('campaigns/:id/report')
@UseGuards(CampaignOwnerGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getReport(@CurrentUser() user: JwtUser, @Param('id') campaignId: string) {
    return this.reportsService.getReport(user.id, campaignId);
  }

  @Get('export')
  async exportReport(
    @CurrentUser() user: JwtUser,
    @Param('id') campaignId: string,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Query('filter') filter: 'all' | 'sent' | 'failed' = 'all',
    @Res() res: Response,
  ) {
    const { buffer, filename, mimeType } = await this.reportsService.exportReport(
      user.id,
      campaignId,
      format,
      filter,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
