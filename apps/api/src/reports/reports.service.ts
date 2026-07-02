import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

type ExportFilter = 'all' | 'sent' | 'failed';
type ExportFormat = 'csv' | 'xlsx';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        _count: { select: { recipients: true, emailJobs: true } },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const statusCounts = await this.prisma.emailJob.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
      counts[row.status] = row._count.status;
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        createdAt: campaign.createdAt,
      },
      summary: {
        total: campaign.totalRecipients,
        sent: counts['SENT'] ?? 0,
        failed: counts['FAILED'] ?? 0,
        pending: counts['PENDING'] ?? 0,
        processing: counts['PROCESSING'] ?? 0,
        retrying: counts['RETRYING'] ?? 0,
        cancelled: counts['CANCELLED'] ?? 0,
        successRate:
          campaign.totalRecipients > 0
            ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
            : 0,
      },
    };
  }

  async exportReport(
    userId: string,
    campaignId: string,
    format: ExportFormat,
    filter: ExportFilter,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (!['csv', 'xlsx'].includes(format)) {
      throw new BadRequestException('Format must be csv or xlsx');
    }

    // Build status filter
    const statusFilter =
      filter === 'sent'
        ? ['SENT']
        : filter === 'failed'
          ? ['FAILED']
          : ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'RETRYING', 'CANCELLED'];

    const jobs = await this.prisma.emailJob.findMany({
      where: {
        campaignId,
        status: { in: statusFilter as never[] },
      },
      include: {
        recipient: {
          select: { email: true, data: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build row data
    const rows = jobs.map((job) => {
      const data = job.recipient.data as Record<string, string>;
      return {
        Email: job.recipient.email,
        Name: data['name'] ?? data['Name'] ?? '',
        Status: job.status,
        'Failure Reason': job.failureReason ?? '',
        'Sent At': job.sentAt ? new Date(job.sentAt).toISOString() : '',
        'Attempts': job.attemptCount,
        'Last Attempt': job.lastAttemptAt
          ? new Date(job.lastAttemptAt).toISOString()
          : '',
      };
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const safeCampaignName = campaign.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeCampaignName}_${filter}_${dateStr}`;

    if (format === 'csv') {
      const csv = this.buildCsv(rows);
      return {
        buffer: Buffer.from(csv, 'utf-8'),
        filename: `${filename}.csv`,
        mimeType: 'text/csv',
      };
    } else {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return {
        buffer,
        filename: `${filename}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
  }

  private buildCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]!);
    const escape = (val: unknown) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headerRow = headers.map(escape).join(',');
    const dataRows = rows.map((row) =>
      headers.map((h) => escape(row[h])).join(','),
    );

    return [headerRow, ...dataRows].join('\n');
  }
}
