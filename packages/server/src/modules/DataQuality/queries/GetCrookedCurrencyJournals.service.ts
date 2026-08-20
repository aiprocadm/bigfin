// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManualJournal } from '@/modules/ManualJournals/models/ManualJournal';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { DataQualityQueryDto } from '../dtos/DataQualityQuery.dto';
import {
  findCrookedCurrencyJournals,
  CrookedCurrencyJournalsResult,
} from '../utils/findCrookedCurrencyJournals';
import { MAX_UNBALANCED_JOURNALS } from '../constants';

/**
 * «Валютные проводки без курса» (вопрос 28 карты v16).
 *
 * До Р1 среза 3 ручная проводка в валюте уходила в журнал БЕЗ умножения на
 * курс: 1000 USD при курсе 80 лежат как 1000 ₽ — занижение в 80 раз, и дебет
 * с кредитом сходятся, так что ошибка бесшумна. Отчёт делает накопленные
 * кривые проводки видимыми; перепроведение — отдельной командой по явному
 * нажатию, молча ничего не пересчитывается.
 */
@Injectable()
export class GetCrookedCurrencyJournalsService {
  constructor(
    private readonly tenancyContext: TenancyContext,

    @Inject(ManualJournal.name)
    private readonly manualJournalModel: TenantModelProxy<typeof ManualJournal>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  public async getCrookedCurrencyJournals(
    query: DataQualityQueryDto,
  ): Promise<CrookedCurrencyJournalsResult> {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();
    const baseCurrency = tenantMeta?.baseCurrency;

    const candidates = await this.manualJournalModel()
      .query()
      .onBuild((qb) => {
        qb.select(['id', 'journalNumber', 'date', 'amount', 'currencyCode', 'exchangeRate']);
        qb.whereNotNull('currencyCode');
        if (baseCurrency) qb.whereNot('currencyCode', baseCurrency);
        if (query.fromDate) qb.where('date', '>=', query.fromDate);
        if (query.toDate) qb.where('date', '<=', query.toDate);
      });

    const glRows = candidates.length
      ? await this.accountTransactionModel()
          .query()
          .onBuild((qb) => {
            qb.select(['referenceId', 'debit', 'credit']);
            qb.where('referenceType', 'Journal');
            qb.whereIn(
              'referenceId',
              candidates.map((journal: any) => journal.id),
            );
          })
      : [];

    return findCrookedCurrencyJournals(
      candidates as any[],
      glRows as any[],
      baseCurrency,
      MAX_UNBALANCED_JOURNALS,
    );
  }
}
