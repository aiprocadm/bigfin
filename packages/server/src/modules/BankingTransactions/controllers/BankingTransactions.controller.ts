import { RequireApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
import { SetAccrualPeriodService } from '../commands/SetAccrualPeriod.service';
import {
  Patch,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { BankingTransactionsApplication } from '../BankingTransactionsApplication.service';
import { GetTransactionsSummaryService } from '../queries/GetTransactionsSummary.service';
import {
  BulkCreateBankTransactionsDto,
  CreateBankTransactionDto,
} from '../dtos/CreateBankTransaction.dto';
import { GetBankTransactionsQueryDto } from '../dtos/GetBankTranasctionsQuery.dto';
import { BankTransactionResponseDto } from '../dtos/BankTransactionResponse.dto';
import { PaginatedResponseDto } from '@/common/dtos/PaginatedResults.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '../types/BankingTransactions.types';
import { FixAccountBalanceService } from '../commands/FixAccountBalance.service';
import { FixAccountBalanceDto } from '../dtos/FixAccountBalance.dto';

@Controller('banking/transactions')
@ApiTags('Banking Transactions')
@ApiExtraModels(BankTransactionResponseDto, PaginatedResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankingTransactionsController {
  constructor(
    private readonly setAccrualPeriodService: SetAccrualPeriodService,
    private readonly bankingTransactionsApplication: BankingTransactionsApplication,
    private readonly summaryService: GetTransactionsSummaryService,
    private readonly fixAccountBalanceService: FixAccountBalanceService,
  ) {}

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get('summary')
  @ApiOperation({
    summary: 'Итоги реестра операций под тем же отбором, что и список.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Сколько операций и на какую сумму. Переводы между своими счетами ' +
      'в итог не входят и показываются отдельно.',
  })
  @RequireApiScope('transactions:read')
  getSummary(@Query() filter: GetBankTransactionsQueryDto) {
    return this.summaryService.getSummary(filter);
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get()
  @ApiOperation({ summary: 'Get bank account transactions' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of bank account transactions',
    schema: {
      allOf: [
        {
          $ref: getSchemaPath(PaginatedResponseDto),
        },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(BankTransactionResponseDto) },
            },
          },
        },
      ],
    },
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
  @RequireApiScope('transactions:read')
  async getBankAccountTransactions(
    @Query() query: GetBankTransactionsQueryDto,
  ) {
    return this.bankingTransactionsApplication.getBankAccountTransactions(
      query,
    );
  }

  @Post()
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Create a new bank transaction' })
  @ApiResponse({
    status: 201,
    description: 'The bank transaction has been successfully created',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiBody({ type: CreateBankTransactionDto })
  @RequireApiScope('transactions:write')
  async createTransaction(@Body() transactionDTO: CreateBankTransactionDto) {
    return this.bankingTransactionsApplication.createTransaction(
      transactionDTO,
    );
  }

  /**
   * Пакетный ввод «Несколько» (FT-024 ТЗ-3): до 100 операций одним
   * запросом. Строки проверяются по одной — ответ говорит, какие легли и
   * что не так с остальными.
   */
  @Post('bulk')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Создать несколько операций одним запросом; ошибка строки не отменяет остальные.' })
  @RequireApiScope('transactions:write')
  async createTransactionsBulk(@Body() body: BulkCreateBankTransactionsDto) {
    return this.bankingTransactionsApplication.createTransactionsBulk(body.items);
  }

  /**
   * Фиксация остатка на дату (FT-071 ТЗ-3): «по выписке на конец дня
   * столько-то». Разница с учётом становится корректирующей операцией —
   * поэтому и право то же, что на создание операции.
   * Разницы нет — операция не создаётся, ответ `created: false`.
   */
  @Post('fix-balance')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({
    summary:
      'Зафиксировать остаток счёта на конец дня: на разницу создаётся корректирующая операция.',
  })
  @ApiBody({ type: FixAccountBalanceDto })
  @RequireApiScope('transactions:write')
  async fixAccountBalance(@Body() body: FixAccountBalanceDto) {
    return this.fixAccountBalanceService.fixBalance(body);
  }

  /**
   * Месяц начисления нескольким операциям сразу (FT-013 ТЗ-3) — из реестра.
   * `accrualPeriod: null` — снять, операция вернётся в месяц платежа.
   */
  @Patch('accrual-period')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Проставить месяц начисления операциям' })
  async setAccrualPeriod(
    @Body() body: { ids: number[]; accrualPeriod: string | null },
  ) {
    return this.setAccrualPeriodService.setAccrualPeriod(
      Array.isArray(body?.ids) ? body.ids : [],
      body?.accrualPeriod ?? null,
    );
  }

  @Delete(':id')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Delete a bank transaction' })
  @ApiResponse({
    status: 200,
    description: 'The bank transaction has been successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank transaction not found',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Bank transaction ID',
  })
  async deleteTransaction(@Param('id') transactionId: string) {
    return this.bankingTransactionsApplication.deleteTransaction(
      Number(transactionId),
    );
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific bank transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the bank transaction details',
    schema: {
      $ref: getSchemaPath(BankTransactionResponseDto),
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Bank transaction not found',
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Bank transaction ID',
  })
  @RequireApiScope('transactions:read')
  async getTransaction(@Param('id') transactionId: string) {
    return this.bankingTransactionsApplication.getTransaction(
      Number(transactionId),
    );
  }
}
