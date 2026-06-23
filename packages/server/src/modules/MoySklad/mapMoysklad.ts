/**
 * Чистый маппинг сущностей МойСклад (JSON API remap/1.2) в превью-формат (㉛).
 * Цены/суммы в МойСклад — в копейках (целые), делим на 100.
 */

/** Товар МойСклад в превью-виде. */
export interface MoyskladProduct {
  externalId: string;
  name: string;
  code: string;
  sellPrice: number;
  costPrice: number;
}

/** Продажа (отгрузка) МойСклад в превью-виде. */
export interface MoyskladSale {
  externalId: string;
  name: string;
  amount: number;
  date: string | null;
}

/** Копейки → рубли (число). Пусто/нечисло → 0. */
const kopToRub = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n / 100 : 0;
};

/** Маппинг товара МойСклад (`GET /entity/product`). */
export const mapMoyskladProduct = (raw: any): MoyskladProduct => ({
  externalId: String(raw.id),
  name: raw.name || `Товар ${String(raw.id)}`,
  code: raw.code || raw.article || '',
  sellPrice: kopToRub(raw?.salePrices?.[0]?.value),
  costPrice: kopToRub(raw?.buyPrice?.value),
});

/** Маппинг отгрузки/продажи МойСклад (`GET /entity/demand`). */
export const mapMoyskladSale = (raw: any): MoyskladSale => ({
  externalId: String(raw.id),
  name: raw.name || `Продажа ${String(raw.id)}`,
  amount: kopToRub(raw.sum),
  date: raw.moment || null,
});
