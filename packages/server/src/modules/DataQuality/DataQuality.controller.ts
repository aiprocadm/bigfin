// © 2026 Bigfin
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { DataQualityApplication } from './DataQuality.application';
import { DataQualityQueryDto } from './dtos/DataQualityQuery.dto';

/**
 * Отчёт «Качество данных» — read-only, считается на лету. Чтение доступно
 * авторизованному пользователю (без отдельного CASL-subject, как Deals/Debts).
 */
@Controller('data-quality')
@ApiTags('Data quality')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class DataQualityController {
  constructor(private readonly application: DataQualityApplication) {}

  @Get('unmapped-operations')
  @ApiOperation({
    summary: 'P&L accounts without a management article, with their operations.',
  })
  getUnmappedOperations(@Query() query: DataQualityQueryDto) {
    return this.application.getUnmappedOperations(query);
  }

  @Get('duplicates')
  @ApiOperation({
    summary: 'Possible duplicated documents: same (date, account, amount, side) from different sources.',
  })
  getPossibleDuplicates(@Query() query: DataQualityQueryDto) {
    return this.application.getPossibleDuplicates(query);
  }

  @Get('pl-cashflow')
  @ApiOperation({
    summary: 'Monthly P&L vs cashflow comparison (plNet/cashNet/diff).',
  })
  getPlCashflowComparison(@Query() query: DataQualityQueryDto) {
    return this.application.getPlCashflowComparison(query);
  }
}
