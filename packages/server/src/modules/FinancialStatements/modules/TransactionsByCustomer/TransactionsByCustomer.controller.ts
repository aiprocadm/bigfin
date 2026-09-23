import { RequireApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
import { Controller, Get, Headers, Query, Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import {
  TransactionsByCustomerResponseDto,
  TransactionsByCustomerTableResponseDto,
} from './TransactionsByCustomerResponse.dto';
import { ITransactionsByCustomersFilter } from './TransactionsByCustomer.types';
import { TransactionsByCustomerApplication } from './TransactionsByCustomersApplication';
import { AcceptType } from '@/constants/accept-type';
import { Response } from 'express';
import { TransactionsByCustomerQueryDto } from './TransactionsByCustomerQuery.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ReportsAction } from '../../types/Report.types';

// Отчёт открыт токену API с правом reports:read (FT-091 ТЗ-3).
@RequireApiScope('reports:read')
@Controller('/reports/transactions-by-customers')
@ApiTags('Reports')
@ApiCommonHeaders()
@ApiExtraModels(TransactionsByCustomerResponseDto, TransactionsByCustomerTableResponseDto)
@UseGuards(AuthorizationGuard, PermissionGuard)
export class TransactionsByCustomerController {
  constructor(
    private readonly transactionsByCustomersApp: TransactionsByCustomerApplication,
  ) {}

  @Get()
  @RequirePermission(ReportsAction.READ_CUSTOMERS_TRANSACTIONS, AbilitySubject.Report)
  @ApiOperation({ summary: 'Get transactions by customer' })
  @ApiResponse({
    status: 200,
    description: 'Transactions by customer',
    content: {
      [AcceptType.ApplicationJson]: {
        schema: { $ref: getSchemaPath(TransactionsByCustomerResponseDto) },
      },
      [AcceptType.ApplicationJsonTable]: {
        schema: { $ref: getSchemaPath(TransactionsByCustomerTableResponseDto) },
      },
    },
  })
  async transactionsByCustomer(
    @Query() filter: TransactionsByCustomerQueryDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('accept') acceptHeader: string,
  ) {
    const accept = acceptHeader || '';
    // Retrieves the json table format.
    if (accept.includes(AcceptType.ApplicationJsonTable)) {
      return this.transactionsByCustomersApp.table(filter);

      // Retrieve the csv format.
    } else if (accept.includes(AcceptType.ApplicationCsv)) {
      const csv = await this.transactionsByCustomersApp.csv(filter);

      res.setHeader('Content-Disposition', 'attachment; filename=output.csv');
      res.setHeader('Content-Type', 'text/csv');

      res.send(csv);

      // Retrieve the xlsx format.
    } else if (accept.includes(AcceptType.ApplicationXlsx)) {
      const buffer = await this.transactionsByCustomersApp.xlsx(filter);
      res.setHeader('Content-Disposition', 'attachment; filename=output.xlsx');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.send(buffer);

      // Retrieve the json format.
    } else if (accept.includes(AcceptType.ApplicationPdf)) {
      const pdfContent = await this.transactionsByCustomersApp.pdf(filter);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfContent.length,
      });
      res.send(pdfContent);
    } else {
      return this.transactionsByCustomersApp.sheet(filter);
    }
  }
}
