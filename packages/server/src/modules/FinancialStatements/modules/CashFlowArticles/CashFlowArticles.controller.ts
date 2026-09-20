// © 2026 Bigfin
import { Controller, Get, Headers, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import { AcceptType } from '@/constants/accept-type';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';

import { ReportsAction } from '../../types/Report.types';
import { CashFlowArticlesApplication } from './CashFlowArticlesApplication';
import {
  CashFlowArticlesQueryDto,
  CashFlowArticlesResponseDto,
  CashFlowArticlesTableResponseDto,
} from './CashFlowArticles.dto';

/**
 * Отчёт «Деньги (ДДС по статьям)» — главный денежный отчёт продукта.
 *
 * Пять форматов через заголовок `Accept`, как у всех отчётов: человек,
 * научившийся выгружать один отчёт, умеет выгружать все.
 */
@Controller('/reports/cash-flow-articles')
@ApiTags('Reports')
@ApiCommonHeaders()
@ApiExtraModels(CashFlowArticlesResponseDto, CashFlowArticlesTableResponseDto)
@UseGuards(AuthorizationGuard, PermissionGuard)
export class CashFlowArticlesController {
  constructor(private readonly application: CashFlowArticlesApplication) {}

  @Get()
  @RequirePermission(
    ReportsAction.READ_CASHFLOW_ARTICLES,
    AbilitySubject.Report,
  )
  @ApiOperation({
    summary: 'Деньги (ДДС по статьям)',
    description:
      'Движение денег прямым методом: три раздела, внутри — поступления и ' +
      'выплаты по статьям учёта.',
  })
  @ApiResponse({
    status: 200,
    description: 'Отчёт о движении денег по статьям',
    content: {
      [AcceptType.ApplicationJson]: {
        schema: { $ref: getSchemaPath(CashFlowArticlesResponseDto) },
      },
      [AcceptType.ApplicationJsonTable]: {
        schema: { $ref: getSchemaPath(CashFlowArticlesTableResponseDto) },
      },
    },
  })
  public async cashFlowArticles(
    @Query() filter: CashFlowArticlesQueryDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('accept') acceptHeader: string,
  ) {
    const accept = acceptHeader || '';

    if (accept.includes(AcceptType.ApplicationCsv)) {
      const buffer = await this.application.csv(filter as any);

      res.setHeader('Content-Disposition', 'attachment; filename=output.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(buffer);
      return undefined;
    }

    if (accept.includes(AcceptType.ApplicationJsonTable)) {
      return this.application.table(filter as any);
    }

    if (accept.includes(AcceptType.ApplicationXlsx)) {
      const buffer = await this.application.xlsx(filter as any);

      res.setHeader('Content-Disposition', 'attachment; filename=output.xlsx');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.send(buffer);
      return undefined;
    }

    if (accept.includes(AcceptType.ApplicationPdf)) {
      const pdfContent = await this.application.pdf(filter as any);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfContent.length,
      });
      res.send(pdfContent);
      return undefined;
    }

    return this.application.sheet(filter as any);
  }
}
