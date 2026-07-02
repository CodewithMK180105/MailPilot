import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(userId: string, campaignId: string) {
    // Verify ownership
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      select: { id: true, totalRecipients: true, sentCount: true, failedCount: true },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    // Get counts by status
    const statusCounts = await this.prisma.emailJob.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true },
    });

    const counts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SENT: 0,
      FAILED: 0,
      RETRYING: 0,
      CANCELLED: 0,
    };

    for (const row of statusCounts) {
      counts[row.status] = row._count.status;
    }

    const total = campaign.totalRecipients;
    const sent = counts['SENT'] ?? 0;
    const successPercentage = total > 0 ? Math.round((sent / total) * 100) : 0;

    return {
      total,
      pending: counts['PENDING'] ?? 0,
      processing: counts['PROCESSING'] ?? 0,
      sent,
      failed: counts['FAILED'] ?? 0,
      retrying: counts['RETRYING'] ?? 0,
      cancelled: counts['CANCELLED'] ?? 0,
      successPercentage,
    };
  }

  async getJobs(
    userId: string,
    campaignId: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    // Verify ownership
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      campaignId,
      ...(query.status ? { status: query.status as never } : {}),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.emailJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          recipient: {
            select: { email: true, data: true },
          },
        },
      }),
      this.prisma.emailJob.count({ where }),
    ]);

    return {
      data: jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
