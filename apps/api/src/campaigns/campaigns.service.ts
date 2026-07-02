import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CampaignStatus, JobStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { TemplateService } from '../template/template.service';
import { CreateCampaignDto, UpdateCampaignDto, CampaignQueryDto } from './dto/campaigns.dto';

// Valid state transitions
const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['READY', 'CANCELLED'],
  VALIDATING: ['READY', 'DRAFT'],
  READY: ['SENDING', 'DRAFT', 'CANCELLED'],
  SENDING: ['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'],
  PAUSED: ['SENDING', 'CANCELLED'],
  COMPLETED: [],
  FAILED: ['SENDING'],
  CANCELLED: [],
};

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: TemplateService,
  ) {}

  async create(userId: string, dto: CreateCampaignDto) {
    const detectedVariables = this.templateService.extractVariables(dto.bodyTemplate);

    return this.prisma.campaign.create({
      data: {
        userId,
        name: dto.name,
        subject: dto.subject,
        bodyTemplate: dto.bodyTemplate,
        detectedVariables,
        status: 'DRAFT',
      },
    });
  }

  async findAll(userId: string, query: CampaignQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          failedCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { recipients: true, emailJobs: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return campaign;
  }

  async update(userId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(userId, id);

    if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
      throw new BadRequestException(
        `Campaign can only be edited when in DRAFT or PAUSED status. Current status: ${campaign.status}`,
      );
    }

    const detectedVariables = dto.bodyTemplate
      ? this.templateService.extractVariables(dto.bodyTemplate)
      : campaign.detectedVariables;

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.bodyTemplate && {
          bodyTemplate: dto.bodyTemplate,
          detectedVariables,
          status: 'DRAFT', // Reset to DRAFT if template changes
        }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);

    if (!['DRAFT', 'CANCELLED', 'COMPLETED'].includes(campaign.status)) {
      throw new BadRequestException(
        `Campaign can only be deleted when in DRAFT, CANCELLED, or COMPLETED status`,
      );
    }

    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campaign deleted successfully' };
  }

  async duplicate(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);

    const newCampaign = await this.prisma.campaign.create({
      data: {
        userId,
        name: `Copy of ${campaign.name}`,
        subject: campaign.subject,
        bodyTemplate: campaign.bodyTemplate,
        detectedVariables: campaign.detectedVariables,
        status: 'DRAFT',
      },
    });

    return newCampaign;
  }

  async validate(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);

    // Get distinct column names from recipients
    const recipients = await this.prisma.recipient.findMany({
      where: { campaignId: id },
      take: 1,
    });

    if (recipients.length === 0) {
      return {
        isValid: false,
        missingVariables: campaign.detectedVariables,
        extraColumns: [],
      };
    }

    const columns = Object.keys(recipients[0]!.data as Record<string, unknown>);
    const { isValid, missing } = this.templateService.validate(
      campaign.bodyTemplate,
      columns,
    );

    const extraColumns = columns.filter(
      (c) =>
        !campaign.detectedVariables
          .map((v) => v.toLowerCase())
          .includes(c.toLowerCase()) && c.toLowerCase() !== 'email',
    );

    // Update status to READY if valid
    if (isValid) {
      await this.prisma.campaign.update({
        where: { id },
        data: { status: 'READY' },
      });
    }

    return {
      isValid,
      missingVariables: missing,
      extraColumns,
    };
  }

  async send(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);

    if (campaign.status !== 'READY') {
      throw new BadRequestException(
        `Campaign must be in READY status to send. Current status: ${campaign.status}`,
      );
    }

    // Verify user has a SendGrid key
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sendgridApiKeyEncrypted: true, sendgridFromEmail: true, sendgridFromName: true },
    });

    if (!user?.sendgridApiKeyEncrypted) {
      throw new BadRequestException(
        'You must configure a SendGrid API key before sending campaigns. Go to Settings > SendGrid.',
      );
    }

    // Update status to SENDING
    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'SENDING', startedAt: new Date() },
    });

    // Return the campaign for the producer to enqueue jobs
    return campaign;
  }

  async pause(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);
    this.assertValidTransition(campaign.status, 'PAUSED');

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async resume(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);
    this.assertValidTransition(campaign.status, 'SENDING');

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'SENDING' },
    });
  }

  async cancel(userId: string, id: string) {
    const campaign = await this.findOne(userId, id);
    this.assertValidTransition(campaign.status, 'CANCELLED');

    // Mark all pending jobs as cancelled
    await this.prisma.emailJob.updateMany({
      where: {
        campaignId: id,
        status: { in: ['PENDING', 'RETRYING'] },
      },
      data: { status: 'CANCELLED' as JobStatus },
    });

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async updateCounts(
    campaignId: string,
    increment: { sentCount?: number; failedCount?: number },
  ) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(increment.sentCount ? { sentCount: { increment: increment.sentCount } } : {}),
        ...(increment.failedCount ? { failedCount: { increment: increment.failedCount } } : {}),
      },
    });
  }

  async checkAndCompleteIfDone(campaignId: string) {
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
      this.logger.log(`Campaign ${campaignId} marked as COMPLETED`);
    }
  }

  private assertValidTransition(
    current: CampaignStatus,
    next: CampaignStatus,
  ) {
    const allowed = VALID_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid campaign state transition: ${current} → ${next}. Allowed transitions from ${current}: ${allowed.join(', ') || 'none'}`,
      );
    }
  }
}
