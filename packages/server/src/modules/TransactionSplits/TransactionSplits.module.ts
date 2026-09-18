// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';

import { TransactionSplitsService } from './TransactionSplits.service';
import { SplitLine } from './utils/splitRules';

/**
 * Разделение операции на части (этап 10 ТЗ).
 *
 * Ручки записи требуют право на операции с деньгами и идут вместе со
 * стражем `PermissionGuard`: пометка без стража — «мнимая защита».
 */
@ApiTags('Transaction Splits')
@Controller('transaction-splits')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class TransactionSplitsController {
  constructor(private readonly service: TransactionSplitsService) {}

  @Get(':referenceType/:referenceId')
  @ApiOperation({ summary: 'Части, на которые разделена операция.' })
  getSplits(
    @Param('referenceType') referenceType: string,
    @Param('referenceId') referenceId: string,
  ) {
    return this.service.getSplits(referenceType, Number(referenceId));
  }

  @Post(':referenceType/:referenceId')
  @ApiOperation({ summary: 'Сохранить разбиение операции.' })
  @ApiResponse({
    status: 200,
    description:
      'Суммы частей обязаны сходиться с родительской. Иначе отчёт разойдётся ' +
      'со сверкой по банку, и расхождение будет выглядеть ошибкой банка.',
  })
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  saveSplits(
    @Param('referenceType') referenceType: string,
    @Param('referenceId') referenceId: string,
    @Body() body: { parentAmount: number; lines: SplitLine[] },
  ) {
    return this.service.saveSplits({
      referenceType,
      referenceId: Number(referenceId),
      parentAmount: body?.parentAmount,
      lines: body?.lines ?? [],
    });
  }

  @Delete(':referenceType/:referenceId')
  @ApiOperation({ summary: 'Убрать разбиение: операция идёт в отчёты целиком.' })
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  clearSplits(
    @Param('referenceType') referenceType: string,
    @Param('referenceId') referenceId: string,
  ) {
    return this.service.clearSplits(referenceType, Number(referenceId));
  }
}

@Module({
  controllers: [TransactionSplitsController],
  providers: [TransactionSplitsService],
  exports: [TransactionSplitsService],
})
export class TransactionSplitsModule {}
