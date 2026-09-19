import * as React from 'react';

import { Money } from '@/components/ui/money';

/**
 * Строка ДОКУМЕНТА на телефоне: счёт, акт, смета, платёж.
 *
 * ЗАЧЕМ. Списки документов — это таблицы на шесть-семь столбцов, а на экране
 * в 390 точек помещаются два. Прокрутка вбок спасает от обрезки, но не даёт
 * прочесть строку целиком: чтобы увидеть сумму, приходится увести из вида
 * контрагента, ради которого и смотрели.
 *
 * Здесь всё важное друг под другом, в порядке чтения: кто и на сколько,
 * потом номер и дата, потом состояние документа.
 *
 * Один блок на все списки документов: у них одинаковая суть, и три разных
 * раскладки различались бы без причины.
 */
export interface DocumentMobileRowProps {
  /** Контрагент — то, по чему документ и узнают. */
  title?: React.ReactNode;
  /** Номер документа. */
  number?: React.ReactNode;
  /** Дата документа. */
  date?: React.ReactNode;
  /** Сумма — уже отформатированная. */
  amount?: React.ReactNode;
  /** Метка состояния: оплачен, просрочен, черновик. */
  status?: React.ReactNode;
  /** Срок оплаты и подобное — одной строкой под состоянием. */
  note?: React.ReactNode;
}

export const DocumentMobileRow = ({
  title,
  number,
  date,
  amount,
  status,
  note,
}: DocumentMobileRowProps) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <span className="truncate text-sm font-medium text-text-primary">
        {title || '—'}
      </span>
      {/* Сумма документа — обычные чернила: счёт не бывает «хорошим» или
          «плохим» сам по себе, это просто сумма. Тревогу несёт метка
          состояния, а не число. */}
      <Money>{amount || '—'}</Money>
    </div>

    <div className="flex items-center justify-between gap-3 text-[0.8125rem] text-text-secondary">
      {/* «№ 1042 от 12 октября» — так это и произносят. Соединять мету
          средними точками («1042 · 12 октября») — приём из чужих шаблонов:
          точка ничего не значит и читается как пауза посреди фразы. */}
      <span className="truncate">
        {number ? <>№ {number}</> : null}
        {number && date ? ' от ' : null}
        {date}
      </span>
      {status}
    </div>

    {note && (
      <span className="text-[0.8125rem] text-text-secondary">{note}</span>
    )}
  </div>
);
