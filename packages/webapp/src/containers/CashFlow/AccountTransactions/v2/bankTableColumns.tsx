import intl from 'react-intl-universal';

/**
 * Общий билдер колонок банковских таблиц вкладки «без категории» под примитив
 * components/ui/data-table.tsx (D-redesign, слайс 4).
 *
 * Набор колонок (date/description/payee/deposit/withdrawal) задублировался на
 * втором экране (Excluded, слайс 4b) — выносим сюда (раньше было бы YAGNI).
 * Каждая фабрика возвращает конфиг в shape react-table v7 (id/Header/accessor/align).
 * Заголовки локализуются на вызове (внутри useMemo колоночного хука, после init intl);
 * легаси-хардкод английского («Description»/«Payee»/«Ref.#») не переносим.
 */
export const bankDateColumn = () => ({
  id: 'date',
  Header: intl.get('date'),
  accessor: 'formatted_date',
});

export const bankDescriptionColumn = () => ({
  id: 'description',
  Header: intl.get('description'),
  accessor: 'description',
});

export const bankPayeeColumn = () => ({
  id: 'payee',
  Header: intl.get('payee'),
  accessor: 'payee',
});

export const bankReferenceNumberColumn = () => ({
  id: 'reference_number',
  Header: intl.get('reference_no'),
  accessor: 'reference_no',
});

export const bankDepositColumn = () => ({
  id: 'deposit',
  Header: intl.get('banking.label.deposit'),
  accessor: 'formatted_deposit_amount',
  align: 'right',
});

export const bankWithdrawalColumn = () => ({
  id: 'withdrawal',
  Header: intl.get('banking.label.withdrawal'),
  accessor: 'formatted_withdrawal_amount',
  align: 'right',
});
