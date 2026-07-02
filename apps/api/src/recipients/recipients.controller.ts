import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecipientsService } from './recipients.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CampaignOwnerGuard } from '../common/guards/campaign-owner.guard';
import { IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class ManualRecipientsDto {
  @IsArray()
  columns!: string[];

  @IsArray()
  @IsObject({ each: true })
  @Type(() => Object)
  rows!: Record<string, string>[];
}

@Controller('campaigns/:id/recipients')
@UseGuards(CampaignOwnerGuard)
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      storage: undefined, // Use memory storage (no disk write)
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/csv',
        ];
        const ext = file.originalname.toLowerCase().split('.').pop();
        if (allowedMimes.includes(file.mimetype) || ['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only .xlsx, .xls, and .csv files are allowed'), false);
        }
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: JwtUser,
    @Param('id') campaignId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.recipientsService.uploadFile(user.id, campaignId, file);
  }

  @Post('manual')
  addManual(
    @CurrentUser() user: JwtUser,
    @Param('id') campaignId: string,
    @Body() dto: ManualRecipientsDto,
  ) {
    return this.recipientsService.addManual(user.id, campaignId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Param('id') campaignId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.recipientsService.findAll(user.id, campaignId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
    });
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  clearAll(@CurrentUser() user: JwtUser, @Param('id') campaignId: string) {
    return this.recipientsService.clearAll(user.id, campaignId);
  }
}
