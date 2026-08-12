import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExcludeBankTransactionsApplication } from './ExcludeBankTransactionsApplication';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { PaginatedResponseDto } from '@/common/dtos/PaginatedResults.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { GetExcludedBankTransactionResponseDto } from './dtos/GetExcludedBankTransactionResponse.dto';
import { ExcludeBankTransactionsBulkDto } from './dtos/ExcludeBankTransactionsBulk.dto';
import { GetExcludedBankTransactionsQueryDto } from './dtos/GetExcludedBankTransactionsQuery.dto';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';

@Controller('banking/exclude')
@ApiTags('Banking Transactions')
@ApiExtraModels(GetExcludedBankTransactionResponseDto, ExcludeBankTransactionsBulkDto, PaginatedResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankingTransactionsExcludeController {
  constructor(
    private readonly excludeBankTransactionsApplication: ExcludeBankTransactionsApplication,
  ) {}

  @Put('bulk')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Exclude the given bank transactions.' })
  @ApiResponse({ status: 200, description: 'Bank transactions excluded successfully.' })
  public excludeBankTransactions(@Body() body: ExcludeBankTransactionsBulkDto) {
    return this.excludeBankTransactionsApplication.excludeBankTransactions(
      body.ids,
    );
  }

  @Delete('bulk')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Unexclude the given bank transactions.' })
  @ApiResponse({ status: 200, description: 'Bank transactions unexcluded successfully.' })
  public unexcludeBankTransactions(@Body() body: ExcludeBankTransactionsBulkDto) {
    return this.excludeBankTransactionsApplication.unexcludeBankTransactions(
      body.ids,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Retrieves the excluded bank transactions.' })
  @ApiResponse({
    status: 200,
    description:
      'The excluded bank transactions has been retrieved successfully.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(GetExcludedBankTransactionResponseDto) },
            },
          },
        },
      ],
    },
  })
  public getExcludedBankTransactions(
    @Query() query: GetExcludedBankTransactionsQueryDto,
  ) {
    return this.excludeBankTransactionsApplication.getExcludedBankTransactions(
      query as any,
    );
  }

  @Put(':id')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Exclude the given bank transaction.' })
  public excludeBankTransaction(@Param('id') id: string) {
    return this.excludeBankTransactionsApplication.excludeBankTransaction(
      Number(id),
    );
  }

  @Delete(':id')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Unexclude the given bank transaction.' })
  public unexcludeBankTransaction(@Param('id') id: string) {
    return this.excludeBankTransactionsApplication.unexcludeBankTransaction(
      Number(id),
    );
  }
}
