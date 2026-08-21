// © 2026 Bigfin
import { Injectable, Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ManualJournalGLEntries } from '@/modules/ManualJournals/commands/ManualJournalGLEntries';
import { DataQualityQueryDto } from '../dtos/DataQualityQuery.dto';
import { GetCrookedCurrencyJournalsService } from '../queries/GetCrookedCurrencyJournals.service';

/** Итог перепроведения кривых валютных проводок. */
export interface RepostCrookedResult {
  /** Сколько кривых проводок нашлось. */
  candidates: number;
  /** Сколько успешно перепроведено. */
  reposted: number;
  /** Сколько не удалось (проводка пропущена, остальные — нет). */
  failed: number;
  failures: { journalId: number; journalNumber: string | null; error: string }[];
}

/**
 * Перепроведение кривых валютных проводок (вопрос 28 карты v16).
 *
 * Журнал переписывается тем же кодом, каким это делает обычное сохранение
 * (`ManualJournalGLEntries.editManualJournalGLEntries` = revert + create):
 * после Р1 среза 3 запись умножает суммы на курс. Свойства:
 * - трогаются ТОЛЬКО проводки, найденные детектором кривизны, — правильная
 *   проводка не перепишется даже при повторном запуске (идемпотентность);
 * - сбой на одной проводке не отменяет остальные, а попадает в отчёт;
 * - сам документ (суммы строк, курс) не меняется — только его журнал.
 */
@Injectable()
export class RepostCrookedCurrencyJournalsService {
  private readonly logger = new Logger(
    RepostCrookedCurrencyJournalsService.name,
  );

  constructor(
    private readonly getCrookedJournals: GetCrookedCurrencyJournalsService,
    private readonly manualJournalGLEntries: ManualJournalGLEntries,
    private readonly uow: UnitOfWork,
  ) {}

  public async repost(
    query: DataQualityQueryDto,
  ): Promise<RepostCrookedResult> {
    const { journals } =
      await this.getCrookedJournals.getCrookedCurrencyJournals(query);

    const failures: RepostCrookedResult['failures'] = [];
    let reposted = 0;

    // По очереди, а не параллельно: перепроведение пишет в журнал, и
    // одновременные транзакции по одной базе только мешают друг другу.
    for (const journal of journals) {
      try {
        await this.uow.withTransaction(async (trx: Knex.Transaction) => {
          await this.manualJournalGLEntries.editManualJournalGLEntries(
            journal.journalId,
            trx,
          );
        });
        reposted += 1;
      } catch (error) {
        this.logger.warn(
          `Не удалось перепровести ручную проводку ${journal.journalId}: ${error}`,
        );
        failures.push({
          journalId: journal.journalId,
          journalNumber: journal.journalNumber,
          error: String(error?.message ?? error),
        });
      }
    }

    return {
      candidates: journals.length,
      reposted,
      failed: failures.length,
      failures,
    };
  }
}
