// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import { UserDisplayPreference } from '../models/UserDisplayPreference.model';

/**
 * Настройки отображения по умолчанию (FIN-026 ТЗ-2).
 *
 * УМОЛЧАНИЯ — ЭТО ПРЕЖНЕЕ ПОВЕДЕНИЕ ПРОДУКТА. Человек, который никогда не
 * заходил в эти настройки, не должен заметить, что они появились.
 */
export const DISPLAY_PREFERENCE_DEFAULTS: Record<string, unknown> = {
  /** Показывать копейки. Выключение меняет и выгрузку — иначе экран и файл разойдутся. */
  showCents: true,
  /** Показывать разрывы, начавшиеся в прошлом. */
  showPastGaps: true,
  /** Какие ярусы прибыли показывать в ОПиУ (FIN-015). */
  profitTiers: [],
  /** Какие колонки план-факта показывать в бюджете (FIN-021). */
  budgetColumns: ['plan', 'fact', 'variance'],
  /** Доля под суммой в отчётах (FT-003 ТЗ-3): структура видна без калькулятора. */
  showPercent: true,
  /** Строки с нулём во всех колонках (FT-005 ТЗ-3): по умолчанию спрятаны. */
  showEmptyRows: false,
  /** Переводы между своими счетами в «Деньгах» (FT-006 ТЗ-3). */
  showTransfers: false,
};

/** Ключи, которые продукт умеет хранить. Всё прочее — отказ. */
export const DISPLAY_PREFERENCE_KEYS = Object.keys(
  DISPLAY_PREFERENCE_DEFAULTS,
);

/**
 * Личные настройки отображения.
 *
 * НАСТРОЙКА ОДНОГО ЧЕЛОВЕКА НЕ ВИДНА ДРУГОМУ: всё читается и пишется по
 * `userId`. Настройка, «протёкшая» соседу, выглядит как самопроизвольно
 * изменившийся интерфейс — и объяснить её появление невозможно.
 */
@Injectable()
export class DisplayPreferencesService {
  constructor(
    @Inject(UserDisplayPreference.name)
    private readonly model: TenantModelProxy<typeof UserDisplayPreference>,
  ) {}

  /** Настройки человека, дополненные умолчаниями. */
  public async getPreferences(
    userId: number,
  ): Promise<Record<string, unknown>> {
    const stored = await this.safeRows(userId);
    const result: Record<string, unknown> = {
      ...DISPLAY_PREFERENCE_DEFAULTS,
    };

    stored.forEach((row: any) => {
      if (!DISPLAY_PREFERENCE_KEYS.includes(row.key)) return;
      result[row.key] = this.parse(row.value);
    });

    return result;
  }

  /**
   * Сохраняет переданные настройки.
   *
   * Незнакомые ключи МОЛЧА отбрасываются, а не сохраняются «на всякий
   * случай»: сохранённая опечатка выглядит как настоящая настройка, которая
   * почему-то ни на что не влияет.
   */
  public async setPreferences(
    userId: number,
    values: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const entries = Object.entries(values ?? {}).filter(([key]) =>
      DISPLAY_PREFERENCE_KEYS.includes(key),
    );

    for (const [key, value] of entries) {
      const existing: any = await this.model()
        .query()
        .findOne({ userId, key } as any);

      if (existing) {
        await this.model()
          .query()
          .where('id', existing.id)
          .patch({ value: JSON.stringify(value) } as any);
      } else {
        await this.model()
          .query()
          .insert({ userId, key, value: JSON.stringify(value) } as any);
      }
    }

    return this.getPreferences(userId);
  }

  /**
   * Чтение, переживающее отсутствие таблицы.
   *
   * На базе, где миграция ещё не накатилась, настройки должны вернуться
   * умолчаниями, а не уронить экран: настройка — это удобство, а не данные
   * бизнеса.
   */
  private async safeRows(userId: number): Promise<any[]> {
    try {
      return await this.model().query().where('userId', userId);
    } catch {
      return [];
    }
  }

  private parse(value: unknown): unknown {
    if (typeof value !== 'string') return value;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
