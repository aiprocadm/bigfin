import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Сумма денег.
 *
 * Один примитив на весь продукт, чтобы деньги везде выглядели одинаково и
 * подчинялись одним правилам.
 *
 * ГЛАВНОЕ ПРАВИЛО: РАСХОД — НЕ КРАСНЫЙ. В управленческом учёте расходы
 * нормальны, это и есть работа бизнеса. Покрасишь каждый расход красным —
 * здоровый бизнес выглядит стеной тревоги, а настоящая беда (просрочка,
 * кассовый разрыв) теряется среди неё. Расход рисуется обычными чернилами со
 * знаком минус; красный оставлен `tone="problem"`.
 *
 * Второе правило: моноширинные цифры и выключка вправо — всегда. Только так
 * столбцы сумм выстраиваются по разрядам и сравниваются взглядом, без чтения.
 */

export type MoneyTone =
  /** Обычная сумма: и приход, и расход. Чернила. */
  | 'default'
  /** Приход, рост, положительная динамика. Зелёный. */
  | 'positive'
  /** ПРОБЛЕМА: просрочка, кассовый разрыв, отрицательный остаток. Красный. */
  | 'problem'
  /** Приглушённая: справочная сумма, прошлый период. */
  | 'muted';

export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Готовая строка суммы с валютой — как её отдал сервер. */
  children: React.ReactNode;
  tone?: MoneyTone;
  /** Крупная сумма-герой. Ровно одна на экран. */
  hero?: boolean;
  /** Выключить влево (например, в шапке блока, где нет столбца). */
  align?: 'left' | 'right';
}

const TONE_CLASS: Record<MoneyTone, string> = {
  default: 'text-text-primary',
  positive: 'text-success',
  problem: 'text-danger',
  muted: 'text-text-secondary',
};

export const Money = React.forwardRef<HTMLSpanElement, MoneyProps>(
  (
    { children, tone = 'default', hero = false, align = 'right', className, ...props },
    ref,
  ) => (
    <span
      ref={ref}
      className={cn(
        'money',
        TONE_CLASS[tone],
        hero ? 'money-hero' : 'font-medium',
        align === 'left' && 'text-left',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  ),
);
Money.displayName = 'Money';

/**
 * Подбирает тон по знаку суммы.
 *
 * Отрицательная сумма САМА ПО СЕБЕ не проблема: расход, возврат и
 * корректировка отрицательны по своей природе. Проблемой её делает смысл, а
 * не знак, — поэтому `problem` здесь не возвращается никогда. Его ставят руками
 * там, где действительно беда.
 */
export function moneyToneBySign(amount: number | null | undefined): MoneyTone {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return 'muted';
  }
  return Number(amount) > 0 ? 'positive' : 'default';
}
