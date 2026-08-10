import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IAllocatedLandedCostCreatedPayload,
  IAllocatedLandedCostDeletedPayload,
} from '../types/BillLandedCosts.types';
import { events } from '@/common/events/events';
import { LandedCostInventoryTransactions } from './LandedCostInventoryTransactions.service';

/**
 * Ошибки записи складских движений не глушим.
 *
 * Nest по умолчанию проглатывает исключения обработчиков событий. Для
 * склада это значит: документ сохранён, а остатки не изменились — и никто
 * об этом не знает. Движения пишутся в транзакции самого документа,
 * поэтому с `suppressErrors: false` ошибка откатывает документ целиком:
 * лучше отказать в продаже, чем продать и потерять списание со склада.
 */
@Injectable()
export class LandedCostInventoryTransactionsSubscriber {
  constructor(
    private readonly landedCostInventory: LandedCostInventoryTransactions,
  ) {}

  /**
   * Writes inventory transactions of the landed cost transaction once created.
   * @param {IAllocatedLandedCostCreatedPayload} payload -
   */
  @OnEvent(events.billLandedCost.onCreated, { suppressErrors: false })
  async writeInventoryTransactionsOnceCreated({
    billLandedCost,
    trx,
    bill,
  }: IAllocatedLandedCostCreatedPayload) {
    // Records the inventory transactions.
    await this.landedCostInventory.recordInventoryTransactions(
      billLandedCost,
      bill,
      trx,
    );
  }

  /**
   * Reverts inventory transactions of the landed cost transaction once deleted.
   * @param {IAllocatedLandedCostDeletedPayload} payload -
   */
  @OnEvent(events.billLandedCost.onDeleted, { suppressErrors: false })
  async revertInventoryTransactionsOnceDeleted({
    oldBillLandedCost,
    trx,
  }: IAllocatedLandedCostDeletedPayload) {
    // Removes the inventory transactions.
    await this.landedCostInventory.removeInventoryTransactions(
      oldBillLandedCost.id,
      trx,
    );
  }
}
