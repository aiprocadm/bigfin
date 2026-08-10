// © 2026 Bigfin
import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { DataQualityApplication } from './DataQuality.application';
import { DataQualityQueryDto } from './dtos/DataQualityQuery.dto';

/**
 * Отчёт «Качество данных» — read-only, считается на лету. Чтение доступно
 * авторизованному пользователю (без отдельного CASL-subject, как Deals/Debts).
 * Единственная операция записи — перепроведение — закрыта правом «управление».
 */
@Controller('data-quality')
@ApiTags('Data quality')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class DataQualityController {
  constructor(
    private readonly application: DataQualityApplication,
    private readonly featuresManager: FeaturesManager,
  ) {}

  /**
   * Модуль выключен — ручки отвечать не должны.
   *
   * Приёмка на свежей организации показала расхождение: страница «Качество
   * данных» была спрятана за флагом, а её ручки отвечали 200 (соседние модули
   * ㉖ и ㉕ при этом честно отдавали 403). Особенно неприятно это для
   * перепроведения: операция записи была доступна при выключенном модуле.
   */
  private async assertEnabled() {
    const enabled = await this.featuresManager.accessible(
      Features.DATA_QUALITY,
    );
    if (!enabled) throw new ForbiddenException('Качество данных выключено');
  }

  @Get('unmapped-operations')
  @ApiOperation({
    summary: 'P&L accounts without a management article, with their operations.',
  })
  async getUnmappedOperations(@Query() query: DataQualityQueryDto) {
    await this.assertEnabled();
    return this.application.getUnmappedOperations(query);
  }

  @Get('duplicates')
  @ApiOperation({
    summary: 'Possible duplicated documents: same (date, account, amount, side) from different sources.',
  })
  async getPossibleDuplicates(@Query() query: DataQualityQueryDto) {
    await this.assertEnabled();
    return this.application.getPossibleDuplicates(query);
  }

  @Get('pl-cashflow')
  @ApiOperation({
    summary: 'Monthly P&L vs cashflow comparison (plNet/cashNet/diff).',
  })
  async getPlCashflowComparison(@Query() query: DataQualityQueryDto) {
    await this.assertEnabled();
    return this.application.getPlCashflowComparison(query);
  }

  @Get('unbalanced-journals')
  @ApiOperation({
    summary: 'Documents whose journal does not balance (debit ≠ credit).',
  })
  async getUnbalancedJournals(@Query() query: DataQualityQueryDto) {
    await this.assertEnabled();
    return this.application.getUnbalancedJournals(query);
  }

  @Post('repost-vat-documents')
  @RequirePermission('manage', 'all')
  @ApiOperation({
    summary:
      'Re-posts VAT documents of the period: recalculates document tax from its entries and rewrites GL entries.',
  })
  async repostVatDocuments(@Query() query: DataQualityQueryDto) {
    await this.assertEnabled();
    return this.application.repostVatDocuments(query);
  }
}
