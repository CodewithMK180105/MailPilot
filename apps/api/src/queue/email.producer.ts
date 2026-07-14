import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { TemplateService } from "../template/template.service";
import { EMAIL_QUEUE_NAME } from "./queue.constants";
import { EmailJobPayload } from "./interfaces/email-job.interface";

const BATCH_SIZE = 100;

@Injectable()
export class EmailProducer {
  private readonly logger = new Logger(EmailProducer.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly templateService: TemplateService,
  ) {}

  /**
   * Enqueues email jobs for all recipients of a campaign
   * Processes in batches of 100 to avoid memory overload
   */
  async enqueueCampaign(campaignId: string, userId: string): Promise<number> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) throw new NotFoundException("Campaign not found");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        sendgridApiKeyEncrypted: true,
        sendgridFromEmail: true,
        sendgridFromName: true,
      },
    });

    if (!user?.sendgridApiKeyEncrypted) {
      throw new NotFoundException("User SendGrid key not configured");
    }

    const recipients = await this.prisma.recipient.findMany({
      where: { campaignId },
    });

    let totalQueued = 0;

    // Process in batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const jobs: { name: string; data: EmailJobPayload }[] = [];

      for (const recipient of batch) {
        const recipientData = recipient.data as Record<string, string>;

        const html = this.templateService.render(
          campaign.bodyTemplate,
          recipientData,
        );
        const subject = this.templateService.renderRaw(
          campaign.subject,
          recipientData,
        );

        const plainText = html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const listUnsubscribeUrl = `${appUrl}/unsubscribe?campaignId=${campaignId}&recipientId=${recipient.id}`;

        // Create EmailJob record in DB
        const emailJob = await this.prisma.emailJob.create({
          data: {
            campaignId,
            recipientId: recipient.id,
            status: "PENDING",
          },
        });

        const payload: EmailJobPayload = {
          emailJobId: emailJob.id,
          campaignId,
          recipientId: recipient.id,
          userId,
          to: recipient.email,
          subject,
          html,
          text: plainText,
          replyTo: user.sendgridFromEmail ?? "",
          listUnsubscribeUrl,
          fromEmail: user.sendgridFromEmail ?? "",
          fromName: user.sendgridFromName ?? "",
          encryptedApiKey: user.sendgridApiKeyEncrypted,
        };

        jobs.push({ name: "send-email", data: payload });
      }

      // Add batch to queue
      const addedJobs = await this.emailQueue.addBulk(
        jobs.map((j) => ({
          name: j.name,
          data: j.data,
          opts: {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        })),
      );

      // Update EmailJob records with bullJobId
      for (let j = 0; j < addedJobs.length; j++) {
        const addedJob = addedJobs[j];
        const originalJob = jobs[j];
        if (addedJob && originalJob) {
          await this.prisma.emailJob.update({
            where: { id: originalJob.data.emailJobId },
            data: { bullJobId: addedJob.id?.toString() },
          });
        }
      }

      totalQueued += jobs.length;
      this.logger.log(
        `Enqueued batch ${Math.floor(i / BATCH_SIZE) + 1}: ${jobs.length} jobs for campaign ${campaignId}`,
      );
    }

    this.logger.log(
      `Total ${totalQueued} jobs enqueued for campaign ${campaignId}`,
    );
    return totalQueued;
  }

  /**
   * Re-enqueues only PENDING and FAILED (within retry limit) jobs for a paused campaign
   */
  async requeuePendingJobs(
    campaignId: string,
    userId: string,
  ): Promise<number> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        sendgridApiKeyEncrypted: true,
        sendgridFromEmail: true,
        sendgridFromName: true,
      },
    });

    if (!user?.sendgridApiKeyEncrypted) {
      throw new NotFoundException("User SendGrid key not configured");
    }

    // Get PENDING and FAILED jobs with their recipients
    const pendingJobs = await this.prisma.emailJob.findMany({
      where: {
        campaignId,
        status: { in: ["PENDING", "FAILED"] },
      },
      include: { recipient: true },
    });

    if (pendingJobs.length === 0) return 0;

    const failedJobsCount = pendingJobs.filter((j) => j.status === "FAILED").length;
    if (failedJobsCount > 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { failedCount: { decrement: failedJobsCount } },
      });
    }

    // Reset status to PENDING and attemptCount to 0 for all selected jobs
    await this.prisma.emailJob.updateMany({
      where: {
        id: { in: pendingJobs.map((j) => j.id) },
      },
      data: {
        status: "PENDING",
        attemptCount: 0,
        failureReason: null,
      },
    });

    const bulkJobs = await Promise.all(
      pendingJobs.map(async (emailJob) => {
        const recipientData = emailJob.recipient.data as Record<string, string>;
        const html = this.templateService.render(
          campaign.bodyTemplate,
          recipientData,
        );
        const subject = this.templateService.renderRaw(
          campaign.subject,
          recipientData,
        );

        const plainText = html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const listUnsubscribeUrl = `${appUrl}/unsubscribe?campaignId=${campaignId}&recipientId=${emailJob.recipientId}`;

        if (!user.sendgridApiKeyEncrypted) {
          throw new Error("User has no SendGrid API key configured.");
        }

        const payload: EmailJobPayload = {
          emailJobId: emailJob.id,
          campaignId,
          recipientId: emailJob.recipientId,
          userId,
          to: emailJob.recipient.email,
          subject,
          html,
          text: plainText,
          replyTo: user.sendgridFromEmail ?? "",
          listUnsubscribeUrl,
          fromEmail: user.sendgridFromEmail ?? "",
          fromName: user.sendgridFromName ?? "",
          encryptedApiKey: user.sendgridApiKeyEncrypted,
        };

        return { name: "send-email", data: payload };
      }),
    );

    const addedJobs = await this.emailQueue.addBulk(
      bulkJobs.map((j) => ({
        name: j.name,
        data: j.data,
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      })),
    );

    // Update EmailJob records with new bullJobId
    for (let j = 0; j < addedJobs.length; j++) {
      const addedJob = addedJobs[j];
      const originalJob = bulkJobs[j];
      if (addedJob && originalJob) {
        await this.prisma.emailJob.update({
          where: { id: originalJob.data.emailJobId },
          data: { bullJobId: addedJob.id?.toString() },
        });
      }
    }

    return pendingJobs.length;
  }
}
