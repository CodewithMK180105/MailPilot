import { Module } from '@nestjs/common';
import { RecipientsController } from './recipients.controller';
import { RecipientsService } from './recipients.service';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [CampaignsModule],
  controllers: [RecipientsController],
  providers: [RecipientsService],
  exports: [RecipientsService],
})
export class RecipientsModule {}
