import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { EmailProducer } from '../queue/email.producer';
import { CreateCampaignDto, UpdateCampaignDto, CampaignQueryDto } from './dto/campaigns.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CampaignOwnerGuard } from '../common/guards/campaign-owner.guard';

@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly emailProducer: EmailProducer,
  ) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: CampaignQueryDto) {
    return this.campaignsService.findAll(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.id, dto);
  }

  @Get(':id')
  @UseGuards(CampaignOwnerGuard)
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.findOne(user.id, id);
  }

  @Patch(':id')
  @UseGuards(CampaignOwnerGuard)
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(CampaignOwnerGuard)
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.remove(user.id, id);
  }

  @Post(':id/duplicate')
  @UseGuards(CampaignOwnerGuard)
  duplicate(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.duplicate(user.id, id);
  }

  @Post(':id/validate')
  @UseGuards(CampaignOwnerGuard)
  validate(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.validate(user.id, id);
  }

  @Post(':id/send')
  @UseGuards(CampaignOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async send(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    // Validate and update status to SENDING
    await this.campaignsService.send(user.id, id);
    // Enqueue jobs via BullMQ
    const jobsQueued = await this.emailProducer.enqueueCampaign(id, user.id);
    return { jobsQueued };
  }

  @Post(':id/pause')
  @UseGuards(CampaignOwnerGuard)
  @HttpCode(HttpStatus.OK)
  pause(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.pause(user.id, id);
  }

  @Post(':id/resume')
  @UseGuards(CampaignOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async resume(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    await this.campaignsService.resume(user.id, id);
    const jobsQueued = await this.emailProducer.requeuePendingJobs(id, user.id);
    return { jobsQueued };
  }

  @Post(':id/cancel')
  @UseGuards(CampaignOwnerGuard)
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.cancel(user.id, id);
  }
}
