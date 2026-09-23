// © 2026 Bigfin
import { RequireApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
import { Controller, Get, Headers, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AcceptType } from '@/constants/accept-type';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';

import { ReportsAction } from '../../types/Report.types';
import { ManagerialPnlApplication } from './ManagerialPnlApplication';
import { ManagerialPnlQueryDto } from './ManagerialPnlQuery.dto';

/**
 * Управленческий ОПиУ (FT-010 ТЗ-3). Пять форматов через `Accept`, как у
 * всех отчётов.
 */
// Отчёт открыт токену API с правом reports:read (FT-091 ТЗ-3).
@RequireApiScope('reports:read')
@Controller('/reports/managerial-profit-loss')
@ApiTags('Reports')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ManagerialPnlController {
  constructor(private readonly application: ManagerialPnlApplication) {}

  @Get()
  @RequirePermission(
    ReportsAction.READ_MANAGERIAL_PROFIT_LOSS,
    AbilitySubject.Report,
  )
  @ApiOperation({
    summary: 'Управленческий ОПиУ',
    description:
      'Лестница прибыли по ярусам статей: маржинальный доход, валовая ' +
      'прибыль по направлениям и общая, операционная и чистая прибыль, с ' +
      'рентабельностью под каждым ярусом.',
  })
  public async managerialProfitLoss(
    @Query() filter: ManagerialPnlQueryDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('accept') acceptHeader: string,
  ) {
    const accept = acceptHeader || '';

    if (accept.includes(AcceptType.ApplicationCsv)) {
      const csv = await this.application.csv(filter);
      res.setHeader('Content-Disposition', 'attachment; filename=output.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
      return undefined;
    }
    if (accept.includes(AcceptType.ApplicationJsonTable)) {
      return this.application.table(filter);
    }
    if (accept.includes(AcceptType.ApplicationXlsx)) {
      const buffer = await this.application.xlsx(filter);
      res.setHeader('Content-Disposition', 'attachment; filename=output.xlsx');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.send(buffer);
      return undefined;
    }
    if (accept.includes(AcceptType.ApplicationPdf)) {
      const pdf = await this.application.pdf(filter);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length });
      res.send(pdf);
      return undefined;
    }
    return this.application.sheet(filter);
  }
}
