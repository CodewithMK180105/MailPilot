import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CampaignOwnerGuard } from '../common/guards/campaign-owner.guard';

@Controller('campaigns/:id')
@UseGuards(CampaignOwnerGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('progress')
  getProgress(@CurrentUser() user: JwtUser, @Param('id') campaignId: string) {
    return this.jobsService.getProgress(user.id, campaignId);
  }

  @Get('jobs')
  getJobs(
    @CurrentUser() user: JwtUser,
    @Param('id') campaignId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.jobsService.getJobs(user.id, campaignId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
    });
  }
}
