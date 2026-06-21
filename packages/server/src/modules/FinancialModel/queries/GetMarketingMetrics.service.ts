// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { MarketingChannel } from '../models/MarketingChannel.model';
import { MarketingMonthly } from '../models/MarketingMonthly.model';
import {
  MetricValue,
  computeCac,
  computeRomi,
  computeAverageCheck,
  computeLtv,
  enumerateMonths,
} from '../utils/financialMath';
import {
  FINANCIAL_MODEL_SETTINGS_GROUP,
  CUSTOMER_LIFETIME_KEY,
} from '../commands/MarketingData.service';

export interface MarketingChannelMetric {
  channelId: number;
  name: string;
  spend: number;
  newCustomers: number;
  cac: MetricValue;
}

export interface MarketingMetrics {
  revenue: number;
  margin: number; // доля 0..1
  totalSpend: number;
  totalNewCustomers: number;
  customerCount: number;
  customerLifetimeMonths: number;
  averageCheck: MetricValue;
  cacTotal: MetricValue;
  romi: MetricValue;
  ltv: MetricValue;
  channels: MarketingChannelMetric[];
  hasData: boolean; // есть ли введённые маркетинговые цифры за период
}

/**
 * Маркетинговые метрики за период: CAC (по каналам и итого), ROMI и LTV.
 * Выручка/маржа — свёртка статей всей фирмы (как в обзоре). Срок жизни клиента
 * читается из настройки financial_model.customer_lifetime_months. Сами формулы —
 * в чистых функциях (computeCac/computeRomi/computeLtv), покрытых тестами.
 */
@Injectable()
export class GetMarketingMetricsService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,

    @Inject(MarketingChannel.name)
    private readonly channelModel: TenantModelProxy<typeof MarketingChannel>,

    @Inject(MarketingMonthly.name)
    private readonly monthlyModel: TenantModelProxy<typeof MarketingMonthly>,

    @Inject(SaleInvoice.name)
    private readonly invoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => Promise<SettingsStore>,
  ) {}

  public async getMetrics(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<MarketingMetrics> {
    const fromDate =
      query.fromDate ?? moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate ?? moment().format('YYYY-MM-DD');

    // Выручка и маржа всей фирмы за период.
    const rows = await this.rollup.getRollup({ fromDate, toDate } as any);
    const { revenue, margin } = computeDealMargin(rows as any);

    // Маркетинг по каналам за месяцы периода.
    const channels = await this.buildChannelMetrics(fromDate, toDate);
    const totalSpend = channels.reduce((s, c) => s + c.spend, 0);
    const totalNewCustomers = channels.reduce((s, c) => s + c.newCustomers, 0);

    // Число клиентов с продажами за период (для среднего чека).
    const customerCount = await this.countCustomersWithSales(fromDate, toDate);
    const averageCheck = computeAverageCheck(revenue, customerCount);

    const customerLifetimeMonths = await this.getCustomerLifetime();

    const cacTotal = computeCac(totalSpend, totalNewCustomers);
    const romi = computeRomi(revenue, totalSpend);
    const ltv = computeLtv(averageCheck.value, margin, customerLifetimeMonths);

    return {
      revenue,
      margin,
      totalSpend,
      totalNewCustomers,
      customerCount,
      customerLifetimeMonths,
      averageCheck,
      cacTotal,
      romi,
      ltv,
      channels,
      hasData: channels.some((c) => c.spend > 0 || c.newCustomers > 0),
    };
  }

  private async buildChannelMetrics(
    fromDate: string,
    toDate: string,
  ): Promise<MarketingChannelMetric[]> {
    const months = enumerateMonths(fromDate, toDate);
    const channels = await this.channelModel()
      .query()
      .where('active', true)
      .orderBy('name');
    if (channels.length === 0 || months.length === 0) {
      return channels.map((c: any) => ({
        channelId: c.id,
        name: c.name,
        spend: 0,
        newCustomers: 0,
        cac: computeCac(0, 0),
      }));
    }

    const monthly = await this.monthlyModel()
      .query()
      .whereIn('month', months);

    const byChannel = new Map<number, { spend: number; newCustomers: number }>();
    for (const m of monthly as any[]) {
      const acc = byChannel.get(m.channelId) ?? { spend: 0, newCustomers: 0 };
      acc.spend += Number(m.spend ?? 0);
      acc.newCustomers += Number(m.newCustomers ?? 0);
      byChannel.set(m.channelId, acc);
    }

    return channels.map((c: any) => {
      const acc = byChannel.get(c.id) ?? { spend: 0, newCustomers: 0 };
      return {
        channelId: c.id,
        name: c.name,
        spend: acc.spend,
        newCustomers: acc.newCustomers,
        cac: computeCac(acc.spend, acc.newCustomers),
      };
    });
  }

  private async countCustomersWithSales(
    fromDate: string,
    toDate: string,
  ): Promise<number> {
    const res: any = await this.invoiceModel()
      .query()
      .modify('delivered')
      .modify('filterDateRange', fromDate, toDate)
      .countDistinct({ c: 'customerId' })
      .first();
    return Number(res?.c ?? 0);
  }

  private async getCustomerLifetime(): Promise<number> {
    const store = await this.settingsStore();
    return Number(
      store.get(
        { group: FINANCIAL_MODEL_SETTINGS_GROUP, key: CUSTOMER_LIFETIME_KEY },
        0,
      ),
    );
  }
}
