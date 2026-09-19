import * as React from 'react';
import intl from 'react-intl-universal';
import { Sparkles } from 'lucide-react';

import { Money } from '@/components/ui/money';

export interface TransactionContextHeaderProps {
  formattedDate?: string | null;
  formattedAmount?: string | null;
  isDeposit?: boolean;
  payee?: string | null;
  /** Назначение платежа — то, по чему и принимают решение. */
  description?: string | null;
  /** Операция узнана правилом разноски. */
  recognizedByRuleName?: string | null;
  /** Статью подсказала память по контрагенту. */
  suggestedByContact?: boolean;
}

/**
 * Шапка окна разноса: что именно разносим.
 *
 * ЗАЧЕМ. Раньше здесь была одна сумма. А решение «к какой статье отнести» люди
 * принимают по НАЗНАЧЕНИЮ ПЛАТЕЖА и по контрагенту: «Оплата по счёту 1042 за
 * аренду» — это аренда, и никакая сумма этого не скажет. Назначение видно в
 * списке, но окно разноса открывается ПОВЕРХ списка и закрывает собой ту
 * самую строку. Человеку приходилось помнить её наизусть или закрывать окно
 * и открывать заново.
 *
 * Порядок строк — порядок чтения: сначала когда и сколько, потом от кого,
 * потом за что.
 */
export const TransactionContextHeader = ({
  formattedDate,
  formattedAmount,
  isDeposit,
  payee,
  description,
  recognizedByRuleName,
  suggestedByContact,
}: TransactionContextHeaderProps) => (
  <div className="border-b border-border pb-4">
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[0.8125rem] text-text-secondary">
        {formattedDate || '—'}
      </span>
      {/* Сумма расхода НЕ красная: расход — норма работы, а не авария.
          Красный в этом продукте значит «проблема», и разносимая операция
          проблемой не является. Приход отмечается зелёным, потому что это
          и правда хорошая новость. */}
      <Money tone={isDeposit ? 'positive' : 'default'} className="text-lg">
        {formattedAmount || '—'}
      </Money>
    </div>

    {payee && (
      <p className="mt-2 text-sm font-medium text-text-primary">{payee}</p>
    )}

    <p className="mt-1 text-sm text-text-secondary">
      <span className="text-text-muted">
        {intl.get('all_transactions.column.note')}:{' '}
      </span>
      {description || '—'}
    </p>

    {(recognizedByRuleName || suggestedByContact) && (
      // Откуда взялась подсказка. Молча подставленная статья выглядит так
      // же, как выбранная человеком, — и человек либо не заметит ошибку
      // правила, либо перестанет доверять подстановке вообще.
      <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {recognizedByRuleName
          ? intl.get('categorize.hint_by_rule', { rule: recognizedByRuleName })
          : intl.get('bank_import.suggested_by_contact')}
      </p>
    )}
  </div>
);
