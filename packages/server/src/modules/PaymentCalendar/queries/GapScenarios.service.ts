// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { FORECAST_STATUSES } from '../constants';
import { GetPaymentCalendarForecastService } from './GetPaymentCalendarForecast.service';
import { gapScenarios, PlannedMove, simulateMoves } from '../utils/gapScenarios';

export const GAP_SCENARIO_ERRORS = {
  NOT_MOVABLE: 'PLANNED_OPERATION_NOT_MOVABLE',
} as const;

/**
 * Сценарий против кассового разрыва (FT-051 ТЗ-3): что можно перенести и
 * к какому дню разрыв исчезнет. Считается на том же прогнозе, что видит
 * календарь, — иначе карточка обещала бы то, чего календарь не покажет.
 */
@Injectable()
export class GapScenariosService {
  constructor(
    private readonly forecast: GetPaymentCalendarForecastService,
    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  private async days(tenantId: number, horizonDays = 90, accountId?: number) {
    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment().add(horizonDays, 'days').format('YYYY-MM-DD');
    return this.forecast.getForecast(tenantId, { fromDate, toDate, accountId, granularity: 'day' } as any);
  }

  public async scenarios(tenantId: number, horizonDays?: number, accountId?: number) {
    const forecast = await this.days(tenantId, horizonDays, accountId);
    return { gap: forecast.gaps?.[0] ?? null, ...gapScenarios(forecast.openingBalance, forecast.days as any) };
  }

  /** «Что если» — ничего не сохраняется. */
  public async whatIf(tenantId: number, moves: PlannedMove[], horizonDays?: number, accountId?: number) {
    const forecast = await this.days(tenantId, horizonDays, accountId);
    const result = simulateMoves(forecast.openingBalance, forecast.days as any, moves);
    return { gap: result.gap, gaps: result.gaps };
  }

  /**
   * «Перенести»: новая дата РАЗОВОГО плана. У повторяющегося сдвиг даты
   * сдвинул бы весь график — это правка графика, её делают в плане.
   */
  public async reschedule(id: number, plannedDate: string) {
    const operation: any = await this.operationModel().query().findById(id);
    if (!operation || operation.recurrence || !(FORECAST_STATUSES as readonly string[]).includes(operation.status)) {
      throw new ServiceError(
        GAP_SCENARIO_ERRORS.NOT_MOVABLE,
        'Перенести можно только разовый план, который ещё не исполнен',
        { id },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.operationModel().query().findById(id).patch({ plannedDate } as any);
    return { id, plannedDate };
  }
}
