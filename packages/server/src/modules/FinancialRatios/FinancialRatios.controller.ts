import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { RequireAnyPermission } from '@/modules/Roles/RequireAnyPermission.decorator';
import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import * as moment from 'moment';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { GetFinancialRatiosService } from './GetFinancialRatios.service';
import { FinancialRatiosQueryDto } from './dtos/FinancialRatiosQuery.dto';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

@Controller('financial-ratios')
@ApiTags('financial-ratios')
@ApiCommonHeaders()
// Гварды как у соседних модулей: без них ролевой слой не подключается
// (request.ability не заполняется), и модуль выпадает из общей схемы доступа.
@UseGuards(AuthorizationGuard, PermissionGuard)
export class FinancialRatiosController {
  constructor(
    private readonly getRatios: GetFinancialRatiosService,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @RequireAnyPermission({ ability: 'read-balance-sheet', subject: AbilitySubject.Report }, { ability: 'read-profit-loss', subject: AbilitySubject.Report })
  @Get()
  @ApiOperation({
    summary: 'Финансовые коэффициенты, вертикальный и горизонтальный анализ.',
  })
  async ratios(@Query() query: FinancialRatiosQueryDto) {
    const enabled = await this.featuresManager.accessible(
      Features.FINANCIAL_RATIOS,
    );
    if (!enabled) throw new ForbiddenException('Показатели выключены');

    // Единый период для Баланса и ОПиУ: пустые значения дополняем сами,
    // иначе Баланс считал бы по всем проводкам, а ОПиУ — с начала года.
    const fromDate =
      query.fromDate || moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate || moment().format('YYYY-MM-DD');

    if (moment(fromDate).isAfter(moment(toDate))) {
      throw new BadRequestException(
        'Дата начала периода позже даты окончания.',
      );
    }
    return this.getRatios.getRatios(fromDate, toDate);
  }
}
