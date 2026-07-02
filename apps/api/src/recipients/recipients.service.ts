import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';

const MAX_ROWS = 10000;

@Injectable()
export class RecipientsService {
  private readonly logger = new Logger(RecipientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
  ) {}

  async uploadFile(userId: string, campaignId: string, file: Express.Multer.File) {
    // Verify campaign ownership
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    if (!['DRAFT', 'READY'].includes(campaign.status)) {
      throw new BadRequestException(
        'Recipients can only be uploaded when campaign is in DRAFT or READY status',
      );
    }

    // Parse file
    const { columns, rows } = this.parseFile(file);

    // Validate email column exists
    const emailColumn = columns.find((c) => c.toLowerCase() === 'email');
    if (!emailColumn) {
      throw new BadRequestException(
        'File must contain an "email" column (case-insensitive)',
      );
    }

    if (rows.length > MAX_ROWS) {
      throw new BadRequestException(
        `File contains ${rows.length} rows which exceeds the limit of ${MAX_ROWS}`,
      );
    }

    // Delete existing recipients
    await this.prisma.recipient.deleteMany({ where: { campaignId } });
    await this.prisma.emailJob.deleteMany({ where: { campaignId } });

    // Batch insert recipients
    const recipients = rows.map((row, index) => ({
      campaignId,
      email: String(row[emailColumn] ?? '').toLowerCase().trim(),
      data: row,
      rowIndex: index + 1,
    }));

    // Filter invalid emails
    const validRecipients = recipients.filter((r) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email),
    );

    if (validRecipients.length === 0) {
      throw new BadRequestException('No valid email addresses found in the file');
    }

    await this.prisma.recipient.createMany({ data: validRecipients });

    // Update campaign totalRecipients
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalRecipients: validRecipients.length,
        sentCount: 0,
        failedCount: 0,
        status: 'DRAFT',
      },
    });

    // Run validation
    const validation = await this.campaignsService.validate(userId, campaignId);

    const preview = rows.slice(0, 5);

    return {
      totalRows: validRecipients.length,
      skippedRows: rows.length - validRecipients.length,
      columns,
      preview,
      validation,
    };
  }

  async addManual(
    userId: string,
    campaignId: string,
    dto: { columns: string[]; rows: Record<string, string>[] },
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const emailColumn = dto.columns.find((c) => c.toLowerCase() === 'email');
    if (!emailColumn) {
      throw new BadRequestException('Columns must include an "email" column');
    }

    await this.prisma.recipient.deleteMany({ where: { campaignId } });
    await this.prisma.emailJob.deleteMany({ where: { campaignId } });

    const recipients = dto.rows
      .filter((row) => {
        const email = String(row[emailColumn] ?? '').toLowerCase().trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      })
      .map((row, index) => ({
        campaignId,
        email: String(row[emailColumn] ?? '').toLowerCase().trim(),
        data: row,
        rowIndex: index + 1,
      }));

    if (recipients.length === 0) {
      throw new BadRequestException('No valid email addresses provided');
    }

    await this.prisma.recipient.createMany({ data: recipients });
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { totalRecipients: recipients.length, sentCount: 0, failedCount: 0, status: 'DRAFT' },
    });

    const validation = await this.campaignsService.validate(userId, campaignId);

    return {
      totalRows: recipients.length,
      columns: dto.columns,
      preview: dto.rows.slice(0, 5),
      validation,
    };
  }

  async findAll(
    userId: string,
    campaignId: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [recipients, total] = await Promise.all([
      this.prisma.recipient.findMany({
        where: { campaignId },
        skip,
        take: limit,
        orderBy: { rowIndex: 'asc' },
        include: {
          emailJobs: {
            select: { status: true, failureReason: true, sentAt: true, attemptCount: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.recipient.count({ where: { campaignId } }),
    ]);

    return {
      data: recipients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async clearAll(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException(
        'Recipients can only be cleared when campaign is in DRAFT status',
      );
    }

    await this.prisma.recipient.deleteMany({ where: { campaignId } });
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { totalRecipients: 0 },
    });

    return { message: 'All recipients cleared' };
  }

  private parseFile(file: Express.Multer.File): {
    columns: string[];
    rows: Record<string, string>[];
  } {
    const ext = file.originalname.toLowerCase().split('.').pop();

    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      throw new BadRequestException('Only .xlsx, .xls, and .csv files are supported');
    }

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Could not parse file. Please check the file is not corrupted.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('File appears to be empty');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new BadRequestException('Could not read sheet from file');
    }

    // Parse as array of arrays to get raw data
    const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

    if (rawData.length < 2) {
      throw new BadRequestException('File must have a header row and at least one data row');
    }

    const headers = (rawData[0] as string[]).map((h) => String(h).trim());
    const rows = rawData.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = String((row as string[])[i] ?? '').trim();
      });
      return obj;
    });

    return { columns: headers, rows };
  }
}
