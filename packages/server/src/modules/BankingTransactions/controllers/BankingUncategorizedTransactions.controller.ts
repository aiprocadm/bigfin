import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { GetUncategorizedTransactionsQueryDto } from '../dtos/GetUncategorizedTransactionsQuery.dto';
import { GetAutofillCategorizeTransactionResponseDto } from '../dtos/GetAutofillCategorizeTransactionResponse.dto';
import { BankingTransactionsApplication } from '../BankingTransactionsApplication.service';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { UncategorizedTransactionIdsQueryDto } from '@/common/dtos/UncategorizedTransactionIdsQuery.dto';

@Controller('banking/uncategorized')
@UseGuards(AuthorizationGuard, PermissionGuard)
@ApiTags('Banking Uncategorized Transactions')
@ApiExtraModels(GetAutofillCategorizeTransactionResponseDto)
@ApiCommonHeaders()
export class BankingUncategorizedTransactionsController {
  constructor(
    private readonly bankingTransactionsApplication: BankingTransactionsApplication,
  ) {}

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('autofill')
  @ApiOperation({ summary: 'Get autofill values for categorize transactions' })
  @ApiQuery({
    name: 'uncategorizedTransactionIds',
    required: true,
    type: [Number],
    isArray: true,
    description: 'Uncategorized transaction IDs to get autofill for',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns autofill values for categorize transactions',
    schema: { $ref: getSchemaPath(GetAutofillCategorizeTransactionResponseDto) },
  })
  async getAutofillCategorizeTransaction(
    @Query() query: UncategorizedTransactionIdsQueryDto,
  ) {
    const ids = query.uncategorizedTransactionIds;
    return this.bankingTransactionsApplication.getAutofillCategorizeTransaction(
      ids,
    );
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get()
  @ApiOperation({
    summary: 'Get uncategorized transactions of all bank accounts',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of uncategorized transactions across all bank accounts',
  })
  async getAllUncategorizedTransactions(
    @Query() query: GetUncategorizedTransactionsQueryDto,
  ) {
    // Без счёта — операции, ждущие разноски, по всем счетам организации.
    // Нужно полосе «N операций без статьи» на экране «Операции» (этап 3 ТЗ).
    return this.bankingTransactionsApplication.getBankAccountUncategorizedTransactions(
      undefined,
      query,
    );
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('accounts/:accountId')
  @ApiOperation({
    summary: 'Get uncategorized transactions for a specific bank account',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of uncategorized transactions for the specified bank account',
  })
  @ApiParam({
    name: 'accountId',
    required: true,
    type: Number,
    description: 'Bank account ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  async getBankAccountUncategorizedTransactions(
    @Param('accountId') accountId: number,
    @Query() query: GetUncategorizedTransactionsQueryDto,
  ) {
    return this.bankingTransactionsApplication.getBankAccountUncategorizedTransactions(
      accountId,
      query,
    );
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get(':uncategorizedTransactionId')
  @ApiOperation({ summary: 'Get a specific uncategorized transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the uncategorized transaction details',
  })
  @ApiResponse({
    status: 404,
    description: 'Uncategorized transaction not found',
  })
  @ApiParam({
    name: 'uncategorizedTransactionId',
    required: true,
    type: Number,
    description: 'Uncategorized transaction ID',
  })
  async getUncategorizedTransaction(
    @Param('uncategorizedTransactionId') uncategorizedTransactionId: number,
  ) {
    return this.bankingTransactionsApplication.getUncategorizedTransaction(
      Number(uncategorizedTransactionId),
    );
  }
}
