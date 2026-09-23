// © 2026 Bigfin
import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '../types/BankingTransactions.types';
import { ImportBatchesService } from '../commands/ImportBatches.service';

/**
 * История импорта выписок и откат (FT-043 ТЗ-3). Откат доступен любому
 * источнику — файлу, банку по API, сервисам, — поэтому ручки здесь, а не у
 * импорта файлов за флагом модуля.
 */
@Controller('banking/import-batches')
@ApiTags('Banking Import Batches')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ImportBatchesController {
  constructor(private readonly batches: ImportBatchesService) {}

  @Get()
  @ApiOperation({ summary: 'История импорта выписок.' })
  list(@Query('accountId') accountId?: string) {
    return this.batches.list(accountId ? Number(accountId) : undefined);
  }

  @Post(':id/rollback')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Откатить импорт: все его строки — в корзину одной транзакцией.' })
  rollback(@Param('id') id: string) {
    return this.batches.rollback(Number(id));
  }
}
