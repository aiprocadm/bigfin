import { RequireApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
import { Response } from 'express';
import { Controller, Get, Headers, Query, Res, UseGuards } from '@nestjs/common';
import { AcceptType } from '@/constants/accept-type';
import { BalanceSheetApplication } from './BalanceSheetApplication';
import {
  ApiExtraModels,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BalanceSheetQueryDto } from './BalanceSheet.dto';
import {
  BalanceSheetResponseExample,
  BalanceSheetTableResponseExample,
} from './BalanceSheet.swagger';
import {
  BalanceSheetResponseDto,
  BalanceSheetTableResponseDto,
} from './BalanceSheetResponse.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ReportsAction } from '../../types/Report.types';
import { GetLegalEntityAccessService } from '@/modules/LegalEntities/queries/GetLegalEntityAccess.service';

// Отчёт открыт токену API с правом reports:read (FT-091 ТЗ-3).
@RequireApiScope('reports:read')
@Controller('/reports/balance-sheet')
@ApiTags('Reports')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
@ApiExtraModels(BalanceSheetResponseDto, BalanceSheetTableResponseDto)
export class BalanceSheetStatementController {
  constructor(
    private readonly balanceSheetApp: BalanceSheetApplication,
    private readonly legalEntityAccess: GetLegalEntityAccessService,
  ) {}

  /**
   * Retrieve the balance sheet.
   * @param {BalanceSheetQueryDto} query - Balance sheet query.
   * @param {Response} res - Response.
   * @param {string} acceptHeader - Accept header.
   */
  @Get('')
  @RequirePermission(ReportsAction.READ_BALANCE_SHEET, AbilitySubject.Report)
  @ApiOperation({ summary: 'Get balance sheet statement' })
  @ApiResponse({
    status: 200,
    description: 'Balance sheet statement',
    content: {
      [AcceptType.ApplicationJson]: {
        schema: { $ref: getSchemaPath(BalanceSheetResponseDto) },
        example: BalanceSheetResponseExample,
      },
      [AcceptType.ApplicationJsonTable]: {
        schema: { $ref: getSchemaPath(BalanceSheetTableResponseDto) },
        example: BalanceSheetTableResponseExample,
      },
    },
  })
  @ApiProduces(
    AcceptType.ApplicationJson,
    AcceptType.ApplicationJsonTable,
    AcceptType.ApplicationPdf,
    AcceptType.ApplicationXlsx,
    AcceptType.ApplicationCsv,
  )
  public async balanceSheet(
    @Query() query: BalanceSheetQueryDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('accept') acceptHeader: string,
  ) {
    // Отбор сужается до юрлиц, к которым допущена роль (§8.4 ТЗ). Запрос
    // чужого юрлица — отказ, а не пустой отчёт: пустота читается как «у
    // этого юрлица нет операций», и человек ей поверит.
    query.legalEntityIds = await this.legalEntityAccess.narrowToAllowed(
      query.legalEntityIds,
    );
    const accept = acceptHeader || '';
    // Retrieves the json table format.
    if (accept.includes(AcceptType.ApplicationJsonTable)) {
      const table = await this.balanceSheetApp.table(query);

      return table;
      // Retrieves the csv format.
    } else if (accept.includes(AcceptType.ApplicationCsv)) {
      const buffer = await this.balanceSheetApp.csv(query);

      res.setHeader('Content-Disposition', 'attachment; filename=output.csv');
      res.setHeader('Content-Type', 'text/csv');

      res.send(buffer);
      // Retrieves the xlsx format.
    } else if (accept.includes(AcceptType.ApplicationXlsx)) {
      const buffer = await this.balanceSheetApp.xlsx(query);

      res.setHeader('Content-Disposition', 'attachment; filename=output.xlsx');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.send(buffer);
      // Retrieves the pdf format.
    } else if (accept.includes(AcceptType.ApplicationPdf)) {
      const pdfContent = await this.balanceSheetApp.pdf(query);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfContent.length,
      });
      res.send(pdfContent);
    } else {
      const sheet = await this.balanceSheetApp.sheet(query);

      return sheet;
    }
  }
}
