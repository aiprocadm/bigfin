// © 2026 Bigfin
import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ToNumber } from '@/common/decorators/Validators';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '../types/BankingTransactions.types';
import { TransactionActionsService } from '../commands/TransactionActions.service';
import { GetTransactionHistoryService } from '../queries/GetTransactionHistory.service';

class HistoryQueryDto {
  @IsString()
  @MaxLength(64)
  referenceType: string;

  @ToNumber()
  @IsInt()
  referenceId: number;
}

class SetTagDto {
  @IsString()
  @MaxLength(64)
  referenceType: string;

  @ToNumber()
  @IsInt()
  referenceId: number;

  /** Пусто или `null` — снять метку. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tag?: string | null;
}

class LinkDealDto {
  /** `null` — снять привязку. */
  @IsOptional()
  @ToNumber()
  @IsInt()
  dealId?: number | null;
}

class ConvertToTransferDto {
  @ToNumber()
  @IsInt()
  toAccountId: number;
}

class SplitLineDto {
  @ToNumber()
  @IsNumber()
  amount: number;

  @ToNumber()
  @IsInt()
  articleId: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  projectId?: number | null;
}

class SetSplitsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SplitLineDto)
  lines: SplitLineDto[];
}

/**
 * Действия с операцией из реестра (FT-022…FT-025 ТЗ-3). Каждый отказ —
 * названная ошибка с текстом, который меню показывает человеку.
 */
@Controller('banking')
@ApiTags('Banking Transaction Actions')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankingTransactionActionsController {
  constructor(
    private readonly actions: TransactionActionsService,
    private readonly historyService: GetTransactionHistoryService,
  ) {}

  @Get('transaction-history')
  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'История изменений документа реестра: журнал действий и автоправила.' })
  history(@Query() query: HistoryQueryDto) {
    return this.historyService.history(query.referenceType, query.referenceId);
  }

  @Get('transaction-tags')
  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Метки операций организации — для подсказки и отбора.' })
  listTags() {
    return this.actions.listTags();
  }

  @Put('transaction-tags')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Поставить или снять метку документа реестра.' })
  setTag(@Body() body: SetTagDto) {
    return this.actions.setTag(body.referenceType, body.referenceId, body.tag ?? null);
  }

  @Put('transactions/:id/deal')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Привязать денежную операцию к сделке или снять привязку.' })
  linkDeal(@Param('id', ParseIntPipe) id: number, @Body() body: LinkDealDto) {
    return this.actions.linkDeal(id, body.dealId ?? null);
  }

  @Post('transactions/:id/convert-to-transfer')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Превратить поступление или выплату в перевод между своими счетами.' })
  convertToTransfer(@Param('id', ParseIntPipe) id: number, @Body() body: ConvertToTransferDto) {
    return this.actions.convertToTransfer(id, body.toAccountId);
  }

  @Put('transactions/:id/splits')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Разбить сумму операции по статьям; пустой список снимает разбиение.' })
  setSplits(@Param('id', ParseIntPipe) id: number, @Body() body: SetSplitsDto) {
    return this.actions.setSplits(
      id,
      body.lines.map((line) => ({
        amount: line.amount,
        articleId: line.articleId,
        projectId: line.projectId ?? null,
      })),
    );
  }
}
