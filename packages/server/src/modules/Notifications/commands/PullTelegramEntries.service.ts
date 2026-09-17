// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TelegramApiService } from '../delivery/TelegramApi.service';
import { parseQuickEntry } from '../utils/parseQuickEntry';
import { SETTINGS_GROUP, SETTINGS_KEYS } from '../constants';

export interface TelegramEntriesResult {
  imported: number;
  skipped: number;
}

const HELP_TEXT =
  'Отправьте сумму и описание, чтобы записать операцию.\n' +
  'Например: -1500 такси (расход) или +50000 оплата от клиента (приход).\n' +
  'Число без знака считается расходом.';

const NOT_UNDERSTOOD =
  'Не понял сообщение. Пример: -1500 такси. Подсказка — /help';

const NO_ACCOUNT =
  'Счёт для операций из Telegram не выбран. Укажите его в настройках уведомлений.';

/**
 * ㉓ Быстрый ввод операций из Telegram: забирает новые сообщения бота,
 * разбирает их и кладёт в конвейер «Разбор» ⑨ (как выписки и банк-API).
 *
 * Обрабатываются только сообщения из сохранённого при привязке чата.
 * Смещение (`last update_id`) хранится в настройках тенанта, поэтому одно
 * сообщение не обработается дважды даже при параллельных запусках крона.
 */
@Injectable()
export class PullTelegramEntriesService {
  constructor(
    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => SettingsStore,

    private readonly api: TelegramApiService,
    private readonly uow: UnitOfWork,
    private readonly createUncategorized: CreateUncategorizedTransactionService,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<
      typeof UncategorizedBankTransaction
    >,
  ) {}

  public async pull(): Promise<TelegramEntriesResult> {
    const store = await this.settingsStore();

    const token = this.read(store, SETTINGS_KEYS.TELEGRAM_BOT_TOKEN);
    const chatId = this.read(store, SETTINGS_KEYS.TELEGRAM_CHAT_ID);
    if (!token || !chatId) return { imported: 0, skipped: 0 };

    const lastUpdateId = Number(
      this.read(store, SETTINGS_KEYS.TELEGRAM_LAST_UPDATE_ID) || 0,
    );
    const offset = lastUpdateId ? lastUpdateId + 1 : undefined;

    const response = await this.api.getUpdates(token, offset);
    const updates: any[] = Array.isArray(response?.result)
      ? response.result
      : [];
    if (updates.length === 0) return { imported: 0, skipped: 0 };

    const accountId = Number(
      this.read(store, SETTINGS_KEYS.TELEGRAM_ENTRY_ACCOUNT_ID) || 0,
    );

    let imported = 0;
    let skipped = 0;
    let maxUpdateId = lastUpdateId;

    for (const update of updates) {
      const updateId = Number(update?.update_id ?? 0);
      if (updateId > maxUpdateId) maxUpdateId = updateId;

      const message = update?.message ?? update?.edited_message;
      const from = String(message?.chat?.id ?? '');

      // Чужой чат: молча игнорируем, чтобы не подтверждать существование бота.
      if (!message || from !== String(chatId)) {
        skipped += 1;
        continue;
      }

      const parsed = parseQuickEntry(String(message.text ?? ''));

      if (parsed.kind === 'help' || parsed.kind === 'start') {
        await this.reply(token, chatId, HELP_TEXT);
        skipped += 1;
        continue;
      }
      if (parsed.kind === 'unknown') {
        await this.reply(token, chatId, NOT_UNDERSTOOD);
        skipped += 1;
        continue;
      }
      if (!accountId) {
        await this.reply(token, chatId, NO_ACCOUNT);
        skipped += 1;
        continue;
      }

      const created = await this.createEntry(
        accountId,
        updateId,
        parsed.amount,
        parsed.description,
        this.messageDate(message),
      );
      if (created) {
        imported += 1;
        await this.reply(token, chatId, this.confirmation(parsed.amount, parsed.description));
      } else {
        skipped += 1;
      }
    }

    if (maxUpdateId !== lastUpdateId) {
      store.set({
        group: SETTINGS_GROUP,
        key: SETTINGS_KEYS.TELEGRAM_LAST_UPDATE_ID,
        value: String(maxUpdateId),
      });
      await store.save();
    }
    return { imported, skipped };
  }

  /**
   * Дата операции — день, когда сообщение написали, а не день, когда бот его
   * прочитал. Крон ходит за сообщениями раз в несколько минут, но при
   * выключенном модуле или сбое сообщение ждёт часами, и запись «уезжала»
   * на день чтения (вопрос 25 карт v15–v17, закрыт в Д3 карты v86).
   * Telegram отдаёт `date` в секундах UTC; без него — сегодня, как раньше.
   */
  private messageDate(message: { date?: unknown }): string {
    const seconds = Number(message?.date);
    const when =
      Number.isFinite(seconds) && seconds > 0
        ? new Date(seconds * 1000)
        : new Date();
    return when.toISOString().slice(0, 10);
  }

  /** Возвращает false, если операция с таким апдейтом уже заведена. */
  private async createEntry(
    accountId: number,
    updateId: number,
    amount: number,
    description: string | null,
    date: string,
  ): Promise<boolean> {
    const externalId = `telegram:${updateId}`;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const exists = await this.uncategorizedModel()
        .query(trx)
        .findOne({ accountId, externalId });
      if (exists) return false;

      await this.createUncategorized.create(
        {
          date,
          accountId,
          amount,
          currencyCode: 'RUB',
          externalId,
          description: description ?? undefined,
        } as any,
        trx,
      );
      return true;
    });
  }

  private confirmation(amount: number, description: string | null): string {
    const kind = amount > 0 ? 'приход' : 'расход';
    const sum = Math.abs(amount).toLocaleString('ru-RU');
    const tail = description ? ` — ${description}` : '';
    return `Записал: ${kind} ${sum} ₽${tail}`;
  }

  /** Ответ пользователю не должен ронять разбор остальных сообщений. */
  private async reply(token: string, chatId: string, text: string) {
    try {
      await this.api.sendMessage(token, chatId, text);
    } catch {
      console.warn('[TelegramQuickEntry] reply failed (token hidden)');
    }
  }

  /** Счёт, на который записываются операции из Telegram. */
  public async getEntryAccount(): Promise<{ accountId: number | null }> {
    const store = await this.settingsStore();
    const raw = this.read(store, SETTINGS_KEYS.TELEGRAM_ENTRY_ACCOUNT_ID);
    return { accountId: raw ? Number(raw) : null };
  }

  public async setEntryAccount(
    accountId: number | null,
  ): Promise<{ accountId: number | null }> {
    const store = await this.settingsStore();
    store.set({
      group: SETTINGS_GROUP,
      key: SETTINGS_KEYS.TELEGRAM_ENTRY_ACCOUNT_ID,
      value: accountId ? String(accountId) : '',
    });
    await store.save();
    return { accountId: accountId ?? null };
  }

  private read(store: SettingsStore, key: string): string {
    return (store.get({ group: SETTINGS_GROUP, key }, '') as string) || '';
  }
}
