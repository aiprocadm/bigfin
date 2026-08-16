import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
  ITaxRateDeletedPayload,
  ITaxRateDeletingPayload,
} from '../TaxRates.types';
import { CommandTaxRatesValidators } from './CommandTaxRatesValidator.service';
import { TaxRateModel } from '../models/TaxRate.model';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { events } from '@/common/events/events';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

/**
 * Таблицы (и колонки), которые ссылаются на налоговую ставку. Если хоть в
 * одной есть строка с этим tax_rate_id — ставку удалять нельзя (иначе ссылка
 * осиротеет). При появлении нового потребителя ставки добавьте его сюда.
 */
const TAX_RATE_CONSUMERS: Array<[table: string, column: string]> = [
  ['items_entries', 'tax_rate_id'],
  ['accounts_transactions', 'tax_rate_id'],
  ['tax_rate_transactions', 'tax_rate_id'],
  ['items', 'sell_tax_rate_id'],
  ['items', 'purchase_tax_rate_id'],
];

@Injectable()
export class DeleteTaxRateService {
  /**
   * @param {EventEmitter2} eventEmitter - The event emitter.
   * @param {UnitOfWork} uow - The unit of work.
   * @param {CommandTaxRatesValidators} validators - The tax rates validators.
   * @param {typeof TaxRateModel} taxRateModel - The tax rate model.
   */
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly uow: UnitOfWork,
    private readonly validators: CommandTaxRatesValidators,

    @Inject(TaxRateModel.name)
    private readonly taxRateModel: TenantModelProxy<typeof TaxRateModel>,
  ) {}

  /**
   * Deletes the given tax rate.
   * @param {number} taxRateId
   * @returns {Promise<void>}
   */
  public async deleteTaxRate(taxRateId: number): Promise<void> {
    const oldTaxRate = await this.taxRateModel().query().findById(taxRateId);

    // Validates the tax rate existance.
    this.validators.validateTaxRateExistance(oldTaxRate);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Нельзя удалить используемую ставку — иначе её ссылки осиротеют.
      for (const [table, column] of TAX_RATE_CONSUMERS) {
        const used = await trx(table).where(column, taxRateId).first();
        if (used) {
          throw new ServiceError(ERRORS.TAX_RATE_IN_USE);
        }
      }

      // Triggers `onTaxRateDeleting` event.
      await this.eventEmitter.emitAsync(events.taxRates.onDeleting, {
        oldTaxRate,
        trx,
      } as ITaxRateDeletingPayload);

      await this.taxRateModel().query(trx).findById(taxRateId).delete();

      // Triggers `onTaxRateDeleted` event.
      await this.eventEmitter.emitAsync(events.taxRates.onDeleted, {
        oldTaxRate,
        trx,
      } as ITaxRateDeletedPayload);
    });
  }
}
