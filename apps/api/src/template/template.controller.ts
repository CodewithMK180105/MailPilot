import { Controller, Post, Body } from '@nestjs/common';
import { TemplateService } from './template.service';
import { IsString, IsObject } from 'class-validator';

class TemplatePreviewDto {
  @IsString()
  template!: string;

  @IsObject()
  data!: Record<string, string>;
}

@Controller('template')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post('preview')
  preview(@Body() dto: TemplatePreviewDto) {
    const rendered = this.templateService.render(dto.template, dto.data);
    return { rendered };
  }
}
