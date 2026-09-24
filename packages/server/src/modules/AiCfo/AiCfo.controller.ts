// © 2026 Bigfin
import { Body, Controller, Get, Headers, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { ClsService } from 'nestjs-cls';

import { AiCfoService, defaultPeriod } from './AiCfo.service';
import { AiCfoMemoService } from './AiCfoMemo.service';
import { AiCfoCaller } from './AiCfoData.client';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

export class AiCfoAskDto {
  @IsString()
  @Length(2, 500)
  question!: string;

  @IsOptional()
  @IsObject()
  period?: { fromDate?: string; toDate?: string };
}

export class AiCfoRateDto {
  @IsBoolean()
  useful!: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comment?: string;

  @IsOptional()
  @IsObject()
  period?: { fromDate?: string; toDate?: string };
}

export class AiCfoContextDto {
  @IsOptional() @IsString() @Length(0, 120) industry?: string;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() salesModel?: string;
  @IsOptional() @IsString() @Length(0, 500) note?: string;
}

/** Период записки. Ключи приходят уже camelCase: запрос переименовывает общий перехватчик. */
export class AiCfoPeriodQueryDto {
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const periodOf = (from?: string, to?: string) =>
  from && to && DATE.test(from) && DATE.test(to) && from <= to ? { fromDate: from, toDate: to } : defaultPeriod();

/**
 * AI CFO (FT-102 ТЗ-3).
 *
 * Своих прав у ручек нет намеренно: ответ собирается запросами к отчётам с
 * правами самого человека — чего он не видит на экране, того не увидит и
 * здесь. `POST` — только потому, что вопрос длинный; ручка ничего не меняет.
 */
@ApiTags('AI CFO')
@Controller('ai-cfo')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class AiCfoController {
  constructor(
    private readonly aiCfo: AiCfoService,
    private readonly memos: AiCfoMemoService,
    private readonly cls: ClsService,
  ) {}

  private caller(authorization?: string, acceptLanguage?: string, accessPreview?: string): AiCfoCaller {
    return { authorization, organizationId: String(this.cls.get('organizationId') ?? ''), acceptLanguage, accessPreview };
  }

  @Get('memo')
  @ApiOperation({ summary: 'Аналитическая записка за период: семь разделов, числа — из отчётов (FT-100).' })
  async memo(
    @Query() query: AiCfoPeriodQueryDto,
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('x-bigfin-access-preview') accessPreview?: string,
  ) {
    await this.aiCfo.assertEnabled();
    return { data: await this.memos.memo(periodOf(query.fromDate, query.toDate), this.caller(authorization, acceptLanguage, accessPreview)) };
  }

  @Get('memo/pdf')
  @ApiOperation({ summary: 'Записка в PDF (FT-100).' })
  async memoPdf(
    @Query() query: AiCfoPeriodQueryDto,
    @Headers('authorization') authorization: string | undefined,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Headers('x-bigfin-access-preview') accessPreview: string | undefined,
    @Res() res: Response,
  ) {
    await this.aiCfo.assertEnabled();
    const period = periodOf(query.fromDate, query.toDate);
    const pdf = await this.memos.memoPdf(period, this.caller(authorization, acceptLanguage, accessPreview));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bigfin-memo-${period.fromDate}-${period.toDate}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  }

  @Post('memo/rating')
  @ApiOperation({ summary: 'Оценка полезности записки — в журнал (FT-100).' })
  rate(@Body() body: AiCfoRateDto) {
    return this.memos.rate(body.useful, body.comment, body.period);
  }

  @Get('context')
  @ApiOperation({ summary: 'Контекст бизнеса: выведенный из данных и сохранённый (FT-101).' })
  async context(
    @Headers('authorization') authorization?: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('x-bigfin-access-preview') accessPreview?: string,
  ) {
    return { data: await this.memos.context(this.caller(authorization, acceptLanguage, accessPreview)) };
  }

  @Put('context')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Сохранить контекст бизнеса (FT-101).' })
  async saveContext(@Body() body: AiCfoContextDto) {
    return { data: await this.memos.saveContext(body as any) };
  }

  @Get('intents')
  @ApiOperation({ summary: 'Какие вопросы понимает AI CFO — с примерами.' })
  intents() {
    return { data: this.aiCfo.intents() };
  }

  @Post('ask')
  @ApiOperation({ summary: 'Ответ AI CFO: вывод, числа из отчётов, причины, ссылки на операции, предложенные действия.' })
  ask(
    @Body() body: AiCfoAskDto,
    @Headers('authorization') authorization: string | undefined,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Headers('x-bigfin-access-preview') accessPreview: string | undefined,
  ) {
    return this.aiCfo.ask(body.question, body.period, this.caller(authorization, acceptLanguage, accessPreview));
  }
}
