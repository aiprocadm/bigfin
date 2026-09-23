// © 2026 Bigfin
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ToNumber } from '@/common/decorators/Validators';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { CashflowAction } from '@/modules/BankingTransactions/types/BankingTransactions.types';
import { BankReconciliationService } from './BankReconciliation.service';

class StartIntegrationDto {
  @ToNumber()
  @IsInt()
  accountId: number;

  @IsIn(['tinkoff', 'alfa'])
  provider: 'tinkoff' | 'alfa';

  @IsString()
  accountNumber: string;

  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;
}

class ResolveDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  itemIds: number[];

  @IsIn(['add', 'delete', 'ignore'])
  action: 'add' | 'delete' | 'ignore';
}

/**
 * Сверка счёта с банком (FT-040, FT-041 ТЗ-3): запуск по интеграции или по
 * файлу выписки («сверить, не импортировать»), результат, решения.
 */
@Controller('banking/reconciliations')
@ApiTags('Banking Reconciliation')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankReconciliationController {
  constructor(private readonly reconciliation: BankReconciliationService) {}

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get()
  @ApiOperation({ summary: 'История сверок (180 дней).' })
  list(@Query('accountId') accountId?: string) {
    return this.reconciliation.list(accountId ? Number(accountId) : undefined);
  }

  @RequirePermission(CashflowAction.View, AbilitySubject.Cashflow)
  @Get(':id')
  @ApiOperation({ summary: 'Сверка: остатки, расхождение, два списка.' })
  get(@Param('id') id: string) {
    return this.reconciliation.get(Number(id));
  }

  @Post('integration')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Сверить с банком по интеграции — фоновой задачей.' })
  startIntegration(@Body() body: StartIntegrationDto) {
    return this.reconciliation.startIntegration(body);
  }

  @Post('file')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Сверить по файлу выписки — ничего не импортируя.' })
  startFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('accountId') accountId: string,
    @Body('accountNumber') accountNumber?: string,
  ) {
    if (!file) throw new BadRequestException('Файл выписки не передан');
    if (!/\.(txt|csv|xlsx|xls)$/i.test(file.originalname ?? '')) {
      throw new BadRequestException('Поддерживаются выписки .txt (1С), .csv, .xlsx, .xls');
    }
    return this.reconciliation.startFile({
      accountId: Number(accountId),
      accountNumber,
      fileName: file.originalname,
      buffer: file.buffer,
    });
  }

  @Post(':id/resolve')
  @RequirePermission(CashflowAction.Create, AbilitySubject.Cashflow)
  @ApiOperation({ summary: 'Добавить, удалить или оставить отмеченные строки.' })
  resolve(@Param('id') id: string, @Body() body: ResolveDto) {
    return this.reconciliation.resolve(Number(id), body.itemIds, body.action);
  }
}
