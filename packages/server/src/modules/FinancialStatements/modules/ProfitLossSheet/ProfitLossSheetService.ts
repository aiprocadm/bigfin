import {
  IProfitLossSheetQuery,
  IProfitLossSheetMeta,
  IProfitLossSheetNode,
} from './ProfitLossSheet.types';
import ProfitLossSheet from './ProfitLossSheet';
import { mergeQueryWithDefaults } from './utils';
import { ProfitLossSheetRepository } from './ProfitLossSheetRepository';
import { ProfitLossSheetMeta } from './ProfitLossSheetMeta';
import { events } from '@/common/events/events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Features } from '@/common/types/Features';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';

@Injectable()
export class ProfitLossSheetService {
  constructor(
    private readonly profitLossSheetMeta: ProfitLossSheetMeta,
    private readonly eventPublisher: EventEmitter2,
    private readonly i18nService: I18nService,
    private readonly profitLossRepository: ProfitLossSheetRepository,
    private readonly featuresManager: FeaturesManager,
  ) {}

  /**
   * Очередь построений отчёта.
   *
   * НАЙДЕНО ЖИВЫМ ПРОХОДОМ ПО СТЕНДУ. Главная за август показывала ИЮЛЬСКИЕ
   * доходы: 183 333,33 там, где должен быть ноль. Причём и в плитке
   * «за период», и в подписи «к прошлому периоду» стояло одно и то же
   * число, а изменение всегда оказывалось пустым.
   *
   * ПРИЧИНА. Хранилище отчёта (`ProfitLossSheetRepository`) хранит
   * СОСТОЯНИЕ: `setFilter` кладёт период в поля объекта, а
   * `asyncInitialize` загружает по нему данные. Хранилище объявлено
   * «своим на каждое место внедрения», но служба — одна на всё
   * приложение, и внедрено оно в неё ОДИН раз. Значит все вызовы службы
   * делят один объект.
   *
   * Главная зовёт отчёт ДВАЖДЫ ОДНОВРЕМЕННО — за текущий период и за
   * прошлый. Второй вызов успевает переписать период до того, как первый
   * дочитает свои данные, и оба получают один и тот же отчёт. На демо-
   * данных оба периода пустые, поэтому подмену никто не замечал: ноль
   * равен нулю.
   *
   * ПОЧЕМУ ОЧЕРЕДЬ, А НЕ ПОЧИНКА ХРАНИЛИЩА. Сделать хранилище «своим на
   * каждый запрос» значит потянуть за собой и службу, и всех, кто её
   * зовёт, — а зовут её из планировщика, из ИИ-аналитика и из главной.
   * Очередь стоит в ОДНОМ месте — в единственной двери к отчёту — и
   * защищает всех, включая тех, кто о проблеме не знает.
   *
   * Цена — отчёты строятся по очереди, а не одновременно. Отчёт и так
   * тяжёлый, а неверное число дороже лишней секунды.
   */
  private buildQueue: Promise<unknown> = Promise.resolve();

  /**
   * Retrieve profit/loss sheet statement.
   * @param {IProfitLossSheetQuery} query
   * @return { }
   */
  public profitLossSheet = async (
    query: IProfitLossSheetQuery,
  ): Promise<{
    data: IProfitLossSheetNode[];
    query: IProfitLossSheetQuery;
    meta: IProfitLossSheetMeta;
  }> => {
    // Сбой предыдущего построения не должен запирать очередь навсегда:
    // отказ гасится, а следующий вызов идёт своим чередом.
    const run = this.buildQueue.then(
      () => this.buildProfitLossSheet(query),
      () => this.buildProfitLossSheet(query),
    );

    this.buildQueue = run.then(
      () => undefined,
      () => undefined,
    );

    return run;
  };

  /** Само построение отчёта. Зовётся только из очереди выше. */
  private buildProfitLossSheet = async (
    query: IProfitLossSheetQuery,
  ): Promise<{
    data: IProfitLossSheetNode[];
    query: IProfitLossSheetQuery;
    meta: IProfitLossSheetMeta;
  }> => {
    // Whether the accrual P&L feature is enabled. Flag off — the basis is
    // ignored by the engine (legacy behavior, no regression).
    const isAccrualPnlEnabled = await this.featuresManager.accessible(
      Features.ACCRUAL_PNL,
    );
    // Merges the given query with default filter query.
    const filter = mergeQueryWithDefaults(query, isAccrualPnlEnabled);

    // Loads the profit/loss sheet data.
    this.profitLossRepository.setFilter(filter, {
      cashBasisActive: isAccrualPnlEnabled && filter.basis === 'cash',
    });
    await this.profitLossRepository.asyncInitialize();

    // Retrieve the profit/loss sheet meta first to get date format.
    const meta = await this.profitLossSheetMeta.meta(filter);

    // Profit/Loss report instance.
    const profitLossInstance = new ProfitLossSheet(
      this.profitLossRepository,
      filter,
      this.i18nService,
      { baseCurrency: meta.baseCurrency, dateFormat: meta.dateFormat },
    );
    // Profit/loss report data and columns.
    const data = profitLossInstance.reportData();

    // Triggers `onProfitLossSheetViewed` event.
    await this.eventPublisher.emitAsync(
      events.reports.onProfitLossSheetViewed,
      { query },
    );

    return {
      query: filter,
      data,
      meta,
    };
  };
}
