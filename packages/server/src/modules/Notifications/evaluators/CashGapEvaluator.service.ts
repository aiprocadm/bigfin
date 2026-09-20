// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { GetPaymentCalendarForecastService } from '@/modules/PaymentCalendar/queries/GetPaymentCalendarForecast.service';
import { Candidate } from '../utils/selectToFire';
import { cashGapDecide } from './cashGapDecide';
import { DEFAULT_CASH_GAP_HORIZON_DAYS } from '../constants';

@Injectable()
export class CashGapEvaluatorService {
  constructor(
    private readonly tenancyContext: TenancyContext,
    private readonly forecast: GetPaymentCalendarForecastService,
  ) {}

  public async evaluate(threshold: any): Promise<Candidate[]> {
    const tenant = await this.tenancyContext.getTenant();
    const horizonDays =
      Number(threshold?.horizonDays) > 0
        ? Number(threshold.horizonDays)
        : DEFAULT_CASH_GAP_HORIZON_DAYS;
    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment().add(horizonDays, 'days').format('YYYY-MM-DD');

    const res: any = await this.forecast.getForecast(tenant.id, {
      fromDate,
      toDate,
    } as any);

    // ЧИТАЕТСЯ ИМЕННО `gap`, А НЕ `gaps`. С этапа 16 прогноз отдаёт список
    // интервалов с глубиной ямы, и соблазн предупреждать глубиной велик —
    // число крупнее. Но оповещение отвечает на вопрос «когда начнётся», а
    // не «сколько занять»: предупредить о дне дна значит предупредить
    // позже, чем деньги понадобятся. Глубину покажет виджет денег (FIN-007,
    // этап 21), где рядом видны обе даты.
    return cashGapDecide(res?.gap ?? null, horizonDays);
  }
}
