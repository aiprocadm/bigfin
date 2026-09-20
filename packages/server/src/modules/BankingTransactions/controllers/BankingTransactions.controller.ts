import {
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
import { CreateBankTransactionDto } from '../dtos/CreateBankTransaction.dto';
import { GetBankTransactionsQueryDto } from '../dtos/GetBankTranasctionsQuery.dto';
import { BankTransactionResponseDto } from '../dtos/BankTransactionResponse.dto';
import { PaginatedResponseDto } from '@/common/dtos/PaginatedResults.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '../types/BankingTransactions.types';

@Controller('banking/transactions')
@ApiTags('Banking Transactions')
@ApiExtraModels(BankTransactionResponseDto, PaginatedResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankingTransactionsController {
  constructor(
    private readonly bankingTransactionsApplication: BankingTransactionsApplication,
    private readonly summaryService: GetTransactionsSummaryService,
  ) {}

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
  getSummary(@Query() filter: GetBankTransactionsQueryDto) {
    return this.summaryService.getSummary(filter);
  }

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
  async createTransaction(@Body() transactionDTO: CreateBankTransactionDto) {
    return this.bankingTransactionsApplication.createTransaction(
      transactionDTO,
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
  async getTransaction(@Param('id') transactionId: string) {
    return this.bankingTransactionsApplication.getTransaction(
      Number(transactionId),
    );
  }
}
