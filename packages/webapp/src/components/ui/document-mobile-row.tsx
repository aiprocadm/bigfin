import * as React from 'react';

import { Money } from '@/components/ui/money';
import { Money as LegacyMoney } from '@/components/Money/Money';

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
  /** Сумма: готовая строка ИЛИ число (тогда нужен `currency`). */
  amount?: React.ReactNode;
  /** Код валюты — когда сумма пришла числом. */
  currency?: string;
  /** Метка состояния: оплачен, просрочен, черновик. */
  status?: React.ReactNode;
  /** Срок оплаты и подобное — одной строкой под состоянием. */
  note?: React.ReactNode;
}


/**
 * Сумма может прийти ДВУМЯ видами, и это не небрежность.
 *
 * Сервер отдаёт часть сумм уже готовой строкой («1 140 000 ₽»), а часть —
 * голым числом плюс код валюты: у документа валюта своя, и форматировать её
 * надо с ней. Оба вида живут в ответах рядом много лет.
 *
 * ЖИВАЯ ПРОВЕРКА НА ТЕЛЕФОНЕ: в карточке контрагента стояло «1140000» — без
 * пробелов и без рубля. Число было передано туда, где ждали готовый текст, и
 * напечаталось как есть. Ни один тест этого не увидел: строка есть, ошибки
 * нет, просто нечитаемо.
 *
 * Поэтому блок разбирается сам, а не требует этого от каждого вызывающего:
 * четырнадцать списков — четырнадцать шансов забыть.
 */
function MoneyCell({
  amount,
  currency,
}: {
  amount?: React.ReactNode;
  currency?: string;
}) {
  if (typeof amount === 'number') {
    return <LegacyMoney amount={amount} currency={currency} />;
  }

  return <Money>{amount || '—'}</Money>;
}

export const DocumentMobileRow = ({
  title,
  number,
  date,
  amount,
  currency,
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
      <MoneyCell amount={amount} currency={currency} />
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
