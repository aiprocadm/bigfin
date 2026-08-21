// © 2026 Bigfin
import { IExchangeRateService } from './types';

/**
 * Основной источник курса с запасным (К1 срез 1 карты v17).
 *
 * Основной — ЦБ РФ; запасной — прежний платный OpenExchangeRates, и зовётся
 * он только при отказе основного И когда настроен (задан ключ). Если упали
 * оба, наружу уходит ошибка ОСНОВНОГО — она говорит про ЦБ и полезнее
 * человеку, чем «нет ключа платной службы». Несвежий кэш при полном отказе
 * отдаёт слой выше (ExchangeRatesService) — здесь его нет.
 */
export class FallbackExchangeRate implements IExchangeRateService {
  constructor(
    private readonly primary: IExchangeRateService,
    private readonly backup: IExchangeRateService,
    private readonly backupConfigured: boolean,
  ) {}

  public async latest(
    baseCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    try {
      return await this.primary.latest(baseCurrency, toCurrency);
    } catch (primaryError) {
      if (!this.backupConfigured) throw primaryError;

      try {
        return await this.backup.latest(baseCurrency, toCurrency);
      } catch {
        throw primaryError;
      }
    }
  }
}
