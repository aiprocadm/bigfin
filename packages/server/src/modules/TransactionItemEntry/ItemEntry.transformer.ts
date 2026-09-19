import { Transformer } from '../Transformer/Transformer';
import { ItemEntry } from './models/ItemEntry';

interface ItemEntryTransformerContext {
  currencyCode: string;
}

export class ItemEntryTransformer extends Transformer<{}, ItemEntryTransformerContext> {
  /**
   * Include these attributes to item entry object.
   * @returns {Array}
   */
  public includeAttributes = (): string[] => {
    return ['quantityFormatted', 'rateFormatted', 'totalFormatted'];
  };

  /**
   * Retrieves the formatted quantitty of item entry.
   * @param {IItemEntry} entry
   * @returns {string}
   */
  protected quantityFormatted = (entry: ItemEntry): string => {
    // Количество — не деньги, но разделитель дробной части у него тот же:
    // «1,00», а не «1.00».
    return this.formatNumber(entry.quantity, {
      currencyCode: this.entryCurrencyCode,
      money: false,
    });
  };

  /**
   * Retrieves the formatted rate of item entry.
   * @param {IItemEntry} itemEntry -
   * @returns {string}
   */
  /**
   * Валюта строки документа.
   *
   * ЧИТАЕТСЯ ИЗ НАСТРОЕК, А НЕ ИЗ ОКРУЖЕНИЯ. Все вызывающие — счёт, смета,
   * счёт поставщика, чек — кладут валюту ТРЕТЬИМ доводом в `item(...)`, а он
   * отправляет её в `setOptions`. Здесь же её читали из `context`, куда она
   * не попадает никогда.
   *
   * Из-за этого строки документов выводились ПО-АНГЛИЙСКИ: «200,000.00»
   * вместо «200 000,00» — при том что итог того же счёта выводился верно.
   * Найдено обходом ответов сервера после живого прохода.
   *
   * Запасной вариант — валюта организации: строка документа без валюты
   * невозможна, но молчать о том, что её не передали, тоже нельзя.
   */
  private get entryCurrencyCode(): string {
    return (
      this.options?.currencyCode ??
      this.context?.currencyCode ??
      this.context?.organization?.baseCurrency
    );
  }

  protected rateFormatted = (entry: ItemEntry): string => {
    return this.formatNumber(entry.rate, {
      currencyCode: this.entryCurrencyCode,
      money: false,
    });
  };

  /**
   * Retrieves the formatted total of item entry.
   * @param {IItemEntry} entry
   * @returns {string}
   */
  protected totalFormatted = (entry: ItemEntry): string => {
    return this.formatNumber(entry.total, {
      currencyCode: this.entryCurrencyCode,
      money: false,
    });
  };
}
