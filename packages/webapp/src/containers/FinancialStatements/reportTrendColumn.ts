import type {
  ReportTableColumn,
  ReportTableRow,
} from '@/components/ui/report-table';

/**
 * Колонка «Тренд» в отчётах по периодам (T-38 ТЗ-2).
 *
 * ЗАЧЕМ. Отчёт по месяцам — это дюжина колонок цифр. Понять по ним, растёт
 * статья или падает, можно, только читая их подряд глазами. Тонкая линия
 * рядом отвечает на это мгновенно, а цифры остаются на месте для тех, кому
 * нужна точность.
 *
 * БЕЗ ЛИШНИХ ЗАПРОСОВ. Значения берутся из УЖЕ ПРИШЕДШИХ ячеек строки:
 * второй запрос за теми же числами был бы вторым источником правды, и
 * однажды линия перестала бы совпадать с цифрами над ней.
 *
 * ПОЧЕМУ ЧИСЛА ПРИХОДИТСЯ РАЗБИРАТЬ ОБРАТНО. Сервер отдаёт ячейки уже
 * напечатанными («1 749 839,09 ₽»): так устроен весь движок отчётов.
 * Разбор здесь один на все отчёты и проверен спекой — переписывать движок
 * ради линии было бы несоразмерно.
 */

/** Неразрывные пробелы, которыми печатаются разряды. */
const SPACES = /[\s  ]/g;

/**
 * Число из напечатанной суммы.
 *
 * `null` — в ячейке не число: заголовок, прочерк или пустая строка. Ноль
 * здесь был бы враньём: «нет значения» и «ноль» на графике выглядят
 * одинаково, а значат разное.
 *
 * @param {string} printed напечатанная сумма
 * @returns {number | null}
 */
export function parsePrintedAmount(printed: string): number | null {
  const text = String(printed ?? '').trim();
  if (!text) return null;

  // Убираем разряды, знак валюты и любые буквы. Минус бывает
  // типографским: как знак числа он не распознаётся.
  const digits = text
    .replace(SPACES, '')
    .replace(/[^\d,.\-−]/g, '')
    .replace(/−/g, '-');

  if (!digits || digits === '-' || digits === '.') return null;

  // КОПЕЙКИ ОТДЕЛЯЕТ ПОСЛЕДНИЙ ИЗ ЗНАКОВ — правило, уже записанное в
  // проекте (`utils/amountInput.ts`). По-русски разряды идут пробелом, а
  // копейки запятой; по-английски наоборот, и «1,234.50» без этого
  // правила разбиралось бы как «1.234.50», то есть никак.
  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  const decimalAt = Math.max(lastComma, lastDot);

  const cleaned =
    decimalAt === -1
      ? digits.replace(/[.,]/g, '')
      : digits.slice(0, decimalAt).replace(/[.,]/g, '') +
        '.' +
        digits.slice(decimalAt + 1);

  const value = Number(cleaned);

  return Number.isFinite(value) ? value : null;
}

/**
 * Значения строки по колонкам периодов.
 *
 * @param {ReportTableRow} row строка отчёта
 * @param {number[]} cellIndexes индексы ячеек периодов
 * @returns {number[]}
 */
export function trendValuesOfRow(
  row: ReportTableRow,
  cellIndexes: number[],
): number[] {
  return (cellIndexes ?? [])
    .map((index) => parsePrintedAmount(row?.cells?.[index]?.value ?? ''))
    .filter((value): value is number => value !== null);
}

/**
 * Показывать ли тренд для этой строки.
 *
 * Меньше двух точек — это не тренд, а точка: линия из одного значения
 * ничего не сообщает, а место занимает. Все нули — тоже: ровная линия по
 * нулю читается как «данные есть», хотя их нет.
 *
 * @param {number[]} values значения строки
 * @returns {boolean}
 */
export function hasTrend(values: number[]): boolean {
  if ((values ?? []).length < 2) return false;

  return values.some((value) => value !== 0);
}

/**
 * Индексы колонок, которые являются периодами.
 *
 * Первая колонка — название, последние могут быть планом и отклонением:
 * ни те, ни другие в тренд не входят. Периоды — это колонки с индексом
 * ячейки, кроме самой первой.
 *
 * @param {ReportTableColumn[]} columns колонки таблицы
 * @returns {number[]}
 */
export function periodCellIndexes(columns: ReportTableColumn[]): number[] {
  return (columns ?? [])
    .filter((column) => typeof column.cellIndex === 'number')
    .map((column) => column.cellIndex as number)
    .filter((index) => index > 0);
}
