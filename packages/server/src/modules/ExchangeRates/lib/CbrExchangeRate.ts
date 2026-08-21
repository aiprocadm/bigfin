// © 2026 Bigfin
import Axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';
import {
  CBR_XML_DAILY_URL,
  EchangeRateErrors,
  IExchangeRateService,
} from './types';

/** Ждать ответа службы курсов дольше нет смысла: экран уже «висит». */
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Курсы Банка России (К1 срез 1 карты v17).
 *
 * Официальный `XML_daily.asp`: бесплатно, без ключа и предела запросов,
 * ~54 валюты, поддерживает курс на дату (`?date_req=DD/MM/YYYY`). Формат —
 * XML в windows-1251; у каждой валюты есть `VunitRate` — рублей ЗА ЕДИНИЦУ
 * (номинал уже учтён, тенге за 100 не ломает расчёт).
 *
 * ЦБ котирует всё к рублю, поэтому кросс-курс двух не-рублёвых валют
 * считается через рубль: rate(A→B) = руб(A) / руб(B).
 */
export class CbrExchangeRate implements IExchangeRateService {
  public async latest(
    baseCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (baseCurrency === toCurrency) return 1;

    const rubPerUnit = await this.fetchRubPerUnit();

    const base = this.rubFor(rubPerUnit, baseCurrency);
    const to = this.rubFor(rubPerUnit, toCurrency);

    return base / to;
  }

  /** Рублей за единицу валюты; рубль — единица по определению. */
  private rubFor(rubPerUnit: Map<string, number>, currency: string): number {
    if (currency === 'RUB') return 1;

    const rate = rubPerUnit.get(currency);
    if (typeof rate !== 'number' || !(rate > 0)) {
      throw new ServiceError(
        EchangeRateErrors.EX_RATE_NOT_FOUND,
        'Курс запрошенной валюты не получен.',
      );
    }
    return rate;
  }

  /** Забирает дневной список ЦБ и строит карту CharCode → VunitRate. */
  private async fetchRubPerUnit(): Promise<Map<string, number>> {
    let payload: Buffer;
    try {
      const result = await Axios.get(CBR_XML_DAILY_URL, {
        timeout: REQUEST_TIMEOUT_MS,
        // Ответ в windows-1251: берём байты и перекодируем сами — иначе
        // axios разобрал бы их как utf-8 и кириллица (и запятые рядом с ней)
        // превратилась бы в кашу.
        responseType: 'arraybuffer',
      });
      payload = Buffer.from(result.data);
    } catch (error) {
      throw new ServiceError(
        EchangeRateErrors.EX_RATE_SERVICE_UNAVAILABLE,
        'Служба курсов ЦБ РФ не ответила.',
      );
    }
    const xml = new TextDecoder('windows-1251').decode(payload);
    const rubPerUnit = new Map<string, number>();

    // Структура плоская и стабильная — тянуть XML-парсер ради двух полей
    // не за чем. Десятичный разделитель у ЦБ — запятая.
    const valuteRe =
      /<CharCode>([A-Z]{3})<\/CharCode>[\s\S]*?<VunitRate>([\d,.]+)<\/VunitRate>/g;
    let match: RegExpExecArray | null;

    while ((match = valuteRe.exec(xml)) !== null) {
      const rate = Number(match[2].replace(',', '.'));
      if (rate > 0) rubPerUnit.set(match[1], rate);
    }
    return rubPerUnit;
  }
}
