import {
  IAllocatedLandedCostCreatedPayload,
  IAllocatedLandedCostDeletedPayload,
} from '../types/BillLandedCosts.types';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { events } from '@/common/events/events';
import { LandedCostGLEntriesService } from './LandedCostGLEntries.service';

/**
 * Ошибки записи проводок не глушим.
 *
 * Nest по умолчанию проглатывает исключения обработчиков событий, а
 * журнал пишется именно тут. Без этого сбой записи выглядит как успешная
 * операция: документ сохранён, проводок нет, пользователь не знает.
 * С `suppressErrors: false` ошибка доходит до команды и транзакция
 * откатывается целиком.
 */
@Injectable()
export class LandedCostGLEntriesSubscriber {
  constructor(
    private readonly landedCostGLEntries: LandedCostGLEntriesService,
  ) {}

  /**
   * Writes GL entries once landed cost transaction created.
   * @param {IAllocatedLandedCostCreatedPayload} payload -
   */
  @OnEvent(events.billLandedCost.onCreated, { suppressErrors: false })
  async writeGLEntriesOnceLandedCostCreated({
    billLandedCost,
    trx,
  }: IAllocatedLandedCostCreatedPayload) {
    await this.landedCostGLEntries.createLandedCostGLEntries(
      billLandedCost.id,
      trx,
    );
  }

  /**
   * Reverts GL entries associated to landed cost transaction once deleted.
   * @param {IAllocatedLandedCostDeletedPayload} payload -
   */
  @OnEvent(events.billLandedCost.onDeleted, { suppressErrors: false })
  async revertGLEntriesOnceLandedCostDeleted({
    oldBillLandedCost,
    trx,
  }: IAllocatedLandedCostDeletedPayload) {
    await this.landedCostGLEntries.revertLandedCostGLEntries(
      oldBillLandedCost.id,
      trx,
    );
  }
}
