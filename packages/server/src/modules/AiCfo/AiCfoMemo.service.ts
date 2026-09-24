// © 2026 Bigfin
import { Inject, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as moment from 'moment';

import { events } from '@/common/events/events';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Employee } from '@/modules/Payroll/models/Employee.model';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { SaleReceipt } from '@/modules/SaleReceipts/models/SaleReceipt';
import { ChromiumlyTenancy } from '@/modules/ChromiumlyTenancy/ChromiumlyTenancy.service';

import { AiCfoCaller, AiCfoDataClient } from './AiCfoData.client';
import { BusinessContext, buildMemo, Memo, memoHtml } from './utils/memo';
import { inferContext, mergeContext, SALES_MODELS, SIZES, STAGES } from './utils/businessContext';
import { Period } from './utils/evidence';

const GROUP = 'ai_cfo';
const KEY = 'context';

/**
 * Аналитическая записка (FT-100) и контекст бизнеса (FT-101).
 */
@Injectable()
export class AiCfoMemoService {
  constructor(
    private readonly data: AiCfoDataClient,
    private readonly tenancyContext: TenancyContext,
    private readonly pdf: ChromiumlyTenancy,
    @Inject(SETTINGS_PROVIDER) private readonly settingsStore: () => Promise<SettingsStore>,
    @Inject(AccountTransaction.name) private readonly ledgerModel: TenantModelProxy<typeof AccountTransaction>,
    @Inject(Employee.name) private readonly employeeModel: TenantModelProxy<typeof Employee>,
    @Inject(SaleInvoice.name) private readonly invoiceModel: TenantModelProxy<typeof SaleInvoice>,
    @Inject(SaleReceipt.name) private readonly receiptModel: TenantModelProxy<typeof SaleReceipt>,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  public async memo(period: Period, caller: AiCfoCaller): Promise<Memo> {
    const q = { from_date: period.fromDate, to_date: period.toDate, date_group: 'total' };
    const [cash, pnl, debts, gaps, context] = await Promise.all([
      this.data.get('reports/cash-flow-articles', q, caller),
      this.data.get('reports/managerial-profit-loss', q, caller),
      this.data.get('debts/overview', { as_date: period.toDate }, caller).catch(() => null),
      this.data.get('payment-calendar/cash-gaps', {}, caller).catch(() => null),
      this.context(caller).then((c) => c.effective),
    ]);
    return buildMemo({ period, context, cash, pnl, debts, gaps });
  }

  public async memoPdf(period: Period, caller: AiCfoCaller): Promise<Buffer> {
    const memo = await this.memo(period, caller);
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    return this.pdf.convertHtmlContent(memoHtml(memo, metadata?.name ?? 'Организация'), {
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
    } as any);
  }

  public async rate(useful: boolean, comment: string | undefined, period: Partial<Period> | undefined) {
    await this.eventEmitter?.emitAsync(events.aiCfo.onMemoRated, {
      useful: Boolean(useful),
      comment: String(comment ?? '').slice(0, 1000) || null,
      period: period ?? null,
    });
    return { saved: true };
  }

  /** Контекст: сохранённое человеком поверх выведенного из данных. */
  public async context(caller: AiCfoCaller) {
    const store = await this.settingsStore();
    let saved: Partial<BusinessContext> | null = null;
    try {
      const raw = store.get({ group: GROUP, key: KEY }, null);
      saved = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
    } catch {
      saved = null;
    }
    const inferred = inferContext(await this.signals(caller));
    return { inferred, saved, effective: mergeContext(inferred, saved) };
  }

  public async saveContext(input: Partial<BusinessContext>) {
    const clean: Partial<BusinessContext> = {
      industry: input.industry ? String(input.industry).slice(0, 120) : null,
      stage: (STAGES as readonly string[]).includes(String(input.stage)) ? (input.stage as BusinessContext['stage']) : null,
      size: (SIZES as readonly string[]).includes(String(input.size)) ? (input.size as BusinessContext['size']) : null,
      salesModel: (SALES_MODELS as readonly string[]).includes(String(input.salesModel)) ? (input.salesModel as BusinessContext['salesModel']) : null,
      note: input.note ? String(input.note).slice(0, 500) : null,
    };
    const store = await this.settingsStore();
    store.set({ group: GROUP, key: KEY, value: JSON.stringify(clean) });
    await store.save();
    return clean;
  }

  private async signals(caller: AiCfoCaller) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const count = async (model: () => any) => {
      try {
        const [row]: any[] = await model().query().count('id as total');
        return Number(row?.total) || 0;
      } catch {
        return 0;
      }
    };
    const [first]: any[] = await this.ledgerModel().query().min('date as first');
    const yearAgo = moment().subtract(12, 'months').format('YYYY-MM-DD');
    const pnl = await this.data
      .get('reports/managerial-profit-loss', { from_date: yearAgo, to_date: moment().format('YYYY-MM-DD'), date_group: 'total' }, caller)
      .catch(() => null);
    return {
      industry: metadata?.industry ?? null,
      firstOperationDate: first?.first ? moment(first.first).format('YYYY-MM-DD') : null,
      yearRevenue: Number(pnl?.data?.total?.amounts?.revenue) || 0,
      employees: await count(this.employeeModel),
      invoices: await count(this.invoiceModel),
      receipts: await count(this.receiptModel),
    };
  }
}
