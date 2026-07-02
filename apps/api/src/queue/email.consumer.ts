import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailProviderFactory } from '../mail/mail-provider.factory';
import { EncryptionService } from '../common/encryption.service';
import { EMAIL_QUEUE_NAME } from './queue.constants';
import { EmailJobPayload } from './interfaces/email-job.interface';

@Processor(EMAIL_QUEUE_NAME, {
  concurrency: 10,
})
export class EmailConsumer extends WorkerHost {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailProviderFactory: MailProviderFactory,
    private readonly encryptionService: EncryptionService,
  ) {
    super();
  }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    const payload = job.data;
    const { emailJobId, campaignId, to, subject, html, fromEmail, fromName, encryptedApiKey } =
      payload;

    this.logger.debug(`Processing job ${job.id} for email ${to}`);

    // 1. Update EmailJob status to PROCESSING
    await this.prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'PROCESSING',
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
        bullJobId: job.id?.toString() ?? null,
      },
    });

    try {
      // 2. Decrypt API key using crypto
      const apiKey = this.encryptionService.decryptFromString(encryptedApiKey);

      // 3. Send email via mail provider
      const mailProvider = this.mailProviderFactory.getProvider('sendgrid');
      const result = await mailProvider.sendEmail({
        to,
        subject,
        html,
        from: { email: fromEmail, name: fromName },
        apiKey,
      });

      if (result.success) {
        // 4. On success: update EmailJob to SENT, increment sentCount
        await this.prisma.emailJob.update({
          where: { id: emailJobId },
          data: { status: 'SENT', sentAt: new Date() },
        });

        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });

        this.logger.debug(`✅ Email sent to ${to} (job ${emailJobId})`);
      } else {
        throw new Error(result.error ?? 'Unknown mail provider error');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Check if this is the last attempt
      const isLastAttempt = job.attemptsMade >= (job.opts?.attempts ?? 1) - 1;

      if (isLastAttempt) {
        // 5. Final failure: update EmailJob to FAILED
        await this.prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            failureReason: errorMessage,
          },
        });

        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });

        this.logger.warn(`❌ Email to ${to} permanently failed: ${errorMessage}`);
      } else {
        // Will retry — mark as RETRYING
        await this.prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RETRYING',
            failureReason: errorMessage,
          },
        });
        this.logger.warn(
          `⚠️ Email to ${to} failed (attempt ${job.attemptsMade + 1}), retrying: ${errorMessage}`,
        );
        // Re-throw so BullMQ knows to retry
        throw err;
      }
    } finally {
      // 6. Check if campaign is fully complete after every job
      await this.checkCampaignCompletion(campaignId);
    }
  }

  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true, totalRecipients: true, sentCount: true, failedCount: true },
    });

    if (!campaign || campaign.status !== 'SENDING') return;

    if (campaign.sentCount + campaign.failedCount >= campaign.totalRecipients) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      this.logger.log(`🎉 Campaign ${campaignId} COMPLETED`);
    }
  }
}
