// © 2026 Bigfin

/**
 * Сравнение с прошлым периодом в Движении денег (остаток О3 ТЗ).
 *
 * ПОЧЕМУ НЕ КАК В ДРУГИХ ОТЧЁТАХ. Баланс и ОПиУ держат для прошлого периода
 * отдельные «леджеры»: репозиторий грузит те же проводки ещё раз со сдвинутыми
 * датами, а десяток классов-композеров развешивает значения по узлам.
 *
 * У Движения денег другое устройство: узел зовётся секцией, поле периодов
 * называется иначе, таблица собрана своим классом, а не общими примесями.
 * Повторять там всю машинерию — значит завести ВТОРОЙ способ считать те же
 * числа. Второй способ всегда однажды расходится с первым, и оба выглядят
 * правильными.
 *
 * Поэтому отчёт за прошлый период считается ТЕМ ЖЕ кодом, просто с другими
 * датами, а здесь значения только раскладываются по секциям. Расхождение
 * между «текущим» и «прошлым» становится невозможным по устройству.
 */

/** Секция отчёта — ровно то, что нужно для сравнения. */
interface ComparableSection {
  id: string;
  total?: { amount?: number };
  children?: ComparableSection[];
  [key: string]: any;
}

export interface PreviousPeriodOptions {
  /** Показывать сам прошлый период. */
  showPrevious: boolean;
  /** Показывать изменение в рублях. */
  showChange: boolean;
  /** Показывать изменение в процентах. */
  showPercentage: boolean;
  /** Оформление суммы — то же, что у остальных чисел отчёта. */
  formatAmount: (amount: number) => any;
  /** Оформление процента — то же, что у остальных процентов отчёта. */
  formatPercentage: (amount: number) => any;
}

/** Плоский список сумм прошлого периода по номеру секции. */
export function flattenTotals(
  sections: ComparableSection[] | undefined,
  into: Map<string, number> = new Map(),
): Map<string, number> {
  (sections ?? []).forEach((section) => {
    if (section?.id) {
      into.set(String(section.id), Number(section?.total?.amount ?? 0));
    }
    flattenTotals(section?.children, into);
  });

  return into;
}

/**
 * Изменение в процентах.
 *
 * Прошлый период равен нулю — процента НЕ СУЩЕСТВУЕТ, и возвращается `null`.
 * Не ноль и не «бесконечность»: рост с нуля до миллиона это не «плюс 100%»
 * и не «плюс ∞», это просто «раньше не было». Написать здесь ноль значило бы
 * сказать «ничего не изменилось» ровно там, где изменилось всё.
 */
export function changePercentage(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return null;

  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Развешивает значения прошлого периода по секциям текущего отчёта.
 *
 * Секция, которой в прошлом периоде не было вовсе, получает ноль: её тогда
 * действительно не было, и это честный ответ на вопрос «сколько было раньше».
 */
export function attachPreviousPeriod<T extends ComparableSection>(
  sections: T[],
  previousTotals: Map<string, number>,
  options: PreviousPeriodOptions,
): T[] {
  return (sections ?? []).map((section) => {
    const current = Number(section?.total?.amount ?? 0);
    const previous = previousTotals.get(String(section?.id)) ?? 0;

    const next: any = { ...section };

    if (options.showPrevious) {
      next.previousPeriod = options.formatAmount(previous);
    }
    if (options.showChange) {
      next.previousPeriodChange = options.formatAmount(current - previous);
    }
    if (options.showPercentage) {
      const percentage = changePercentage(current, previous);

      next.previousPeriodPercentage =
        percentage === null ? null : options.formatPercentage(percentage);
    }
    if (Array.isArray(section.children)) {
      next.children = attachPreviousPeriod(
        section.children,
        previousTotals,
        options,
      );
    }

    return next as T;
  });
}
