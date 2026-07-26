// © 2026 Bigfin
/**
 * Сумма прописью и денежный формат для печатных форм РФ.
 * Пример: 1500 → «Одна тысяча пятьсот рублей 00 копеек».
 */

const ONES_MASCULINE = [
  '',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
];
const ONES_FEMININE = [
  '',
  'одна',
  'две',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
];
const TEENS = [
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
];
const TENS = [
  '',
  '',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто',
];
const HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
];

/** Максимум: до триллиона не включительно. */
const MAX_SUPPORTED = 1_000_000_000_000;

/**
 * Выбор формы слова по числу: pluralizeRu(2, ['рубль', 'рубля', 'рублей']) → 'рубля'.
 */
export const pluralizeRu = (
  count: number,
  [one, few, many]: [string, string, string],
): string => {
  const abs = Math.abs(Math.trunc(count));
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = abs % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

/** Прописью число 1–999. */
const tripleToWords = (triple: number, feminine: boolean): string => {
  const ones = feminine ? ONES_FEMININE : ONES_MASCULINE;
  const words: string[] = [];

  words.push(HUNDREDS[Math.floor(triple / 100)]);
  const rest = triple % 100;
  if (rest >= 10 && rest <= 19) {
    words.push(TEENS[rest - 10]);
  } else {
    words.push(TENS[Math.floor(rest / 10)]);
    words.push(ones[rest % 10]);
  }
  return words.filter(Boolean).join(' ');
};

interface ScaleUnit {
  feminine: boolean;
  forms: [string, string, string];
}
// Порядок: [тысячи, миллионы, миллиарды]
const SCALE_UNITS: ScaleUnit[] = [
  { feminine: true, forms: ['тысяча', 'тысячи', 'тысяч'] },
  { feminine: false, forms: ['миллион', 'миллиона', 'миллионов'] },
  { feminine: false, forms: ['миллиард', 'миллиарда', 'миллиардов'] },
];

/** Целое число прописью (род — мужской: «один», «два»). */
export const integerToWordsRu = (value: number): string => {
  const int = Math.trunc(value);
  if (int < 0) throw new Error('integerToWordsRu: отрицательные числа не поддерживаются');
  if (int >= MAX_SUPPORTED)
    throw new Error('integerToWordsRu: поддерживаются числа до триллиона');
  if (int === 0) return 'ноль';

  // Разбиваем на тройки: [единицы, тысячи, миллионы, миллиарды].
  const triples: number[] = [];
  let rest = int;
  while (rest > 0) {
    triples.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const words: string[] = [];
  for (let i = triples.length - 1; i >= 1; i -= 1) {
    const triple = triples[i];
    if (triple === 0) continue;
    const unit = SCALE_UNITS[i - 1];
    words.push(tripleToWords(triple, unit.feminine));
    words.push(pluralizeRu(triple, unit.forms));
  }
  if (triples[0] > 0) words.push(tripleToWords(triples[0], false));
  return words.join(' ');
};

/**
 * Сумма прописью для счёта: рубли словами, копейки цифрами.
 * 1500.05 → «Одна тысяча пятьсот рублей 05 копеек».
 */
export const amountToWordsRu = (amount: number): string => {
  if (!Number.isFinite(amount))
    throw new Error('amountToWordsRu: сумма должна быть числом');
  if (amount < 0)
    throw new Error('amountToWordsRu: отрицательные суммы не поддерживаются');

  // Округляем до копеек и разделяем.
  const totalKopecks = Math.round(amount * 100);
  const rubles = Math.floor(totalKopecks / 100);
  const kopecks = totalKopecks % 100;

  // Рубль — мужского рода: «один рубль», «два рубля».
  let rublesWords = integerToWordsRu(rubles);
  rublesWords = rublesWords.charAt(0).toUpperCase() + rublesWords.slice(1);

  const rubleWord = pluralizeRu(rubles, ['рубль', 'рубля', 'рублей']);
  const kopeckWord = pluralizeRu(kopecks, ['копейка', 'копейки', 'копеек']);
  const kopecksPadded = String(kopecks).padStart(2, '0');

  return `${rublesWords} ${rubleWord} ${kopecksPadded} ${kopeckWord}`;
};

/**
 * Денежный формат печатных форм: 1500 → «1 500,00» (пробел — разряды, запятая — копейки).
 */
export const formatMoneyRu = (amount: number): string => {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const totalKopecks = Math.round(abs * 100);
  const rubles = Math.floor(totalKopecks / 100);
  const kopecks = String(totalKopecks % 100).padStart(2, '0');
  const grouped = String(rubles).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped},${kopecks}`;
};

const RU_MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** Дата для печатной формы: 2026-07-26 → «26 июля 2026 г.» */
export const formatDateRu = (date: Date | string): string => {
  // ISO-строку разбираем вручную, чтобы полночь UTC не уехала
  // на день назад в западных часовых поясах.
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return '';
    const [, year, month, day] = match;
    return `${Number(day)} ${RU_MONTHS_GENITIVE[Number(month) - 1]} ${year} г.`;
  }
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${RU_MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()} г.`;
};
