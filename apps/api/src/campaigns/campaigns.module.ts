import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { TemplateModule } from '../template/template.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [TemplateModule, QueueModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
