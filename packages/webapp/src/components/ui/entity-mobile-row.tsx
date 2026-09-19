import * as React from 'react';

import { Money } from '@/components/ui/money';
import { Money as LegacyMoney } from '@/components/Money/Money';

/**
 * Строка СПРАВОЧНИКА на телефоне: контрагент, поставщик, товар, счёт учёта.
 *
 * ЧЕМ ОТЛИЧАЕТСЯ ОТ ДОКУМЕНТА. У документа есть номер и дата — их и читают
 * первыми. У записи справочника номера нет, зато есть вид («Услуга»,
 * «Активный счёт») и одно число, ради которого в список и заходят: долг
 * контрагента, цена товара, остаток по счёту.
 *
 * Поэтому раскладка своя, а не приспособленная: приспособленная давала бы
 * пустое «№ — от —» в каждой строке.
 */
export interface EntityMobileRowProps {
  /** Название — то, по чему запись узнают. */
  title?: React.ReactNode;
  /** Уточнение под названием: компания, код, категория. */
  subtitle?: React.ReactNode;
  /** Главное число: готовая строка ИЛИ число (тогда нужен `currency`). */
  amount?: React.ReactNode;
  /** Код валюты — когда сумма пришла числом. */
  currency?: string;
  /** Вид или состояние записи. */
  status?: React.ReactNode;
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

export const EntityMobileRow = ({
  title,
  subtitle,
  amount,
  currency,
  status,
}: EntityMobileRowProps) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <span className="truncate text-sm font-medium text-text-primary">
        {title || '—'}
      </span>
      {amount != null && amount !== '' ? (
        <MoneyCell amount={amount} currency={currency} />
      ) : null}
    </div>

    {(subtitle || status) && (
      <div className="flex items-center justify-between gap-3 text-[0.8125rem] text-text-secondary">
        <span className="truncate">{subtitle}</span>
        {status}
      </div>
    )}
  </div>
);
