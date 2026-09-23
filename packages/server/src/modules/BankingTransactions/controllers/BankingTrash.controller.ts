// © 2026 Bigfin
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ToNumber } from '@/common/decorators/Validators';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { OwnerGuard } from '@/modules/Roles/Owner.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequireOwner } from '@/modules/Roles/RequireOwner.decorator';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '../types/BankingTransactions.types';
import { TRASH_REASONS, TransactionsTrashService } from '../commands/TransactionsTrash.service';

class TrashItemDto {
  @IsIn(['cashflow', 'bank_line'])
  kind: 'cashflow' | 'bank_line';

  @ToNumber()
  @IsInt()
  id: number;
}

class TrashItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => TrashItemDto)
  items: TrashItemDto[];
}

class TrashListQueryDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsIn(TRASH_REASONS as unknown as string[])
  reason?: string;
}

/**
 * Корзина операций (FT-042 ТЗ-3): удалить, посмотреть, вернуть; удалить
 * окончательно может только владелец организации.
 */
@Controller('banking/trash')
@ApiTags('Banking Trash')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankingTrashController {
  constructor(private readonly trash: TransactionsTrashService) {}

  @Get()
  @ApiOperation({ summary: 'Содержимое корзины: операции и строки выписки.' })
  list(@Query() query: TrashListQueryDto) {
    return this.trash.list(query);
  }

  @Post()
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Удалить в корзину: из отчётов уходит сразу, вернуть можно.' })
  moveToTrash(@Body() body: TrashItemsDto) {
    return this.trash.trash(body.items, 'manual');
  }

  @Post('restore')
  @RequirePermission(CashflowAction.Delete, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Вернуть из корзины в тот же период.' })
  restore(@Body() body: TrashItemsDto) {
    return this.trash.restore(body.items);
  }

  @Post('purge')
  @UseGuards(OwnerGuard)
  @RequireOwner()
  @ApiOperation({ summary: 'Удалить окончательно — только владелец, не в закрытом периоде.' })
  purge(@Body() body: TrashItemsDto) {
    return this.trash.purge(body.items);
  }
}
