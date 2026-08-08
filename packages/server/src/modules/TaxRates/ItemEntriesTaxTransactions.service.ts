import { Inject, Injectable } from '@nestjs/common';
import { keyBy, sumBy } from 'lodash';
import { ItemEntry } from '@/modules/TransactionItemEntry/models/ItemEntry';
import { TaxRateModel } from './models/TaxRate.model';
import { TenantModelProxy } from '../System/models/TenantBaseModel';

@Injectable()
export class ItemEntriesTaxTransactions {
  constructor(
    @Inject(ItemEntry.name)
    private itemEntryModel: TenantModelProxy<typeof ItemEntry>,

    @Inject(TaxRateModel.name)
    private taxRateModel: TenantModelProxy<typeof TaxRateModel>,
  ) {}

  /**
   * Associates tax amount withheld to the model.
   * @param model
   * @returns
   */
  public assocTaxAmountWithheldFromEntries = (model: any) => {
    const entries = model.entries.map((entry) =>
      this.itemEntryModel().fromJson(entry),
    );
    // Устойчиво к позициям без налоговой ставки: у них taxAmount = NaN, и
    // обычная сумма превращала налог всего документа в «не число» — тогда
    // условие ниже не срабатывало, налог не записывался вовсе, а строки
    // журнала по облагаемым позициям всё равно проводились. Смешанный счёт
    // (одна позиция с НДС, другая без) из-за этого не сходился.
    const taxAmountWithheld = sumBy(entries, (entry: any) =>
      Number.isFinite(entry.taxAmount) ? entry.taxAmount : 0,
    );

    // Присваиваем всегда: иначе снятие налога со всех позиций оставляло
    // в документе прежнюю сумму налога.
    model.taxAmountWithheld = taxAmountWithheld;

    return model;
  };

  /**
   * Associates tax rate id from tax code to entries.
   * @param {any} entries
   */
  public assocTaxRateIdFromCodeToEntries = async (entries: any) => {
    const entriesWithCode = entries.filter((entry) => entry.taxCode);
    const taxCodes = entriesWithCode.map((entry) => entry.taxCode);
    const foundTaxCodes = await this.taxRateModel()
      .query()
      .whereIn('code', taxCodes);

    const taxCodesMap = keyBy(foundTaxCodes, 'code');

    return entries.map((entry) => {
      if (entry.taxCode) {
        entry.taxRateId = taxCodesMap[entry.taxCode]?.id;
      }
      return entry;
    });
  };

  /**
   * Associates tax rate from tax id to entries.
   * @returns {Promise<ItemEntry[]>}
   */
  public assocTaxRateFromTaxIdToEntries = async (entries: ItemEntry[]) => {
    const entriesWithId = entries.filter((e) => e.taxRateId);
    const taxRateIds = entriesWithId.map((e) => e.taxRateId);
    const foundTaxes = await this.taxRateModel()
      .query()
      .whereIn('id', taxRateIds);

    const taxRatesMap = keyBy(foundTaxes, 'id');

    return entries.map((entry) => {
      if (entry.taxRateId) {
        entry.taxRate = taxRatesMap[entry.taxRateId]?.rate;
      }
      return entry;
    });
  };
}
