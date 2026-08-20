/**
 * Курс, по которому пересчитывать сумму документа в базовую валюту.
 *
 * Раньше в платёжном календаре стояло «курс документа ИЛИ единица». Для
 * документа в базовой валюте единица законна: курса у него и нет. А вот
 * валютный документ без курса единица превращала в рубли один к одному и
 * молча завышала прогноз (Р1 срез 1 карты v16).
 *
 * @param {string} currencyCode - Валюта документа.
 * @param {string} baseCurrency - Базовая валюта организации.
 * @param {unknown} exchangeRate - Курс, записанный в документе.
 * @returns {number | null} Курс либо `null`, если пересчитать нечем.
 */
export function resolveDocumentExchangeRate(
  currencyCode: string | null | undefined,
  baseCurrency: string | null | undefined,
  exchangeRate: unknown,
): number | null {
  // Валюта не указана или совпадает с базовой — пересчитывать нечего.
  if (!currencyCode || currencyCode === baseCurrency) {
    return 1;
  }
  const rate = Number(exchangeRate);

  return Number.isFinite(rate) && rate > 0 ? rate : null;
}
