import {
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BankingMatchingApplication } from './BankingMatchingApplication';
import { MatchBankTransactionDto } from './dtos/MatchBankTransaction.dto';
import { GetMatchedTransactionsQueryDto } from './dtos/GetMatchedTransactionsQuery.dto';
import { GetMatchedTransactionsResponseDto } from './dtos/GetMatchedTransactionsResponse.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';
import { UncategorizedTransactionIdsQueryDto } from '@/common/dtos/UncategorizedTransactionIdsQuery.dto';

@Controller('banking/matching')
@ApiTags('Banking Transactions Matching')
@ApiExtraModels(GetMatchedTransactionsResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankingMatchingController {
  constructor(
    private readonly bankingMatchingApplication: BankingMatchingApplication,
  ) {}

  @Get('matched')
  @ApiOperation({ summary: 'Retrieves the matched transactions.' })
  @ApiQuery({
    name: 'uncategorizedTransactionIds',
    required: true,
    type: [Number],
    isArray: true,
    description: 'Uncategorized transaction IDs to match',
  })
  @ApiResponse({
    status: 200,
    description: 'Matched transactions (perfect and possible matches).',
    schema: { $ref: getSchemaPath(GetMatchedTransactionsResponseDto) },
  })
  async getMatchedTransactions(
    @Query() ids: UncategorizedTransactionIdsQueryDto,
    @Query() filter: GetMatchedTransactionsQueryDto,
  ) {
    return this.bankingMatchingApplication.getMatchedTransactions(
      ids.uncategorizedTransactionIds,
      filter as any,
    );
  }

  @Post('/match')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Match the given uncategorized transaction.' })
  async matchTransaction(@Body() matchedTransactions: MatchBankTransactionDto) {
    return this.bankingMatchingApplication.matchTransaction(
      matchedTransactions.uncategorizedTransactions,
      matchedTransactions.matchedTransactions,
    );
  }

  @Patch('/unmatch/:uncategorizedTransactionId')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Unmatch the given uncategorized transaction.' })
  async unmatchMatchedTransaction(
    @Param('uncategorizedTransactionId') uncategorizedTransactionId: number,
  ) {
    return this.bankingMatchingApplication.unmatchMatchedTransaction(
      uncategorizedTransactionId,
    );
  }
}
