/**
 * Денежная (банковская) операция — мета ресурса (С2 карты v14).
 *
 * Заведена, чтобы операции можно было ЗАБРАТЬ: до этого экспорт был мёртвым —
 * кнопка в списке операций существовала без обработчика, а ресурс не был
 * объявлен экспортируемым.
 */
export const BankTransactionMeta = {
  defaultFilterField: 'date',
  defaultSort: {
    sortOrder: 'DESC',
    sortField: 'date',
  },
  exportable: true,
  print: {
    pageTitle: 'Bank Transactions',
  },
  columns: {
    date: {
      name: 'cash_flow.label.date',
      type: 'date',
    },
    transactionNumber: {
      name: 'cash_flow.label.transaction_number',
      type: 'text',
    },
    referenceNo: {
      name: 'cash_flow.label.reference_no',
      type: 'text',
    },
    transactionType: {
      name: 'cash_flow.label.transaction_type',
      type: 'text',
    },
    amount: {
      name: 'cash_flow.label.amount',
      type: 'number',
    },
    currencyCode: {
      name: 'cash_flow.label.currency_code',
      type: 'text',
      printable: false,
    },
    cashflowAccount: {
      name: 'cash_flow.label.cashflow_account',
      type: 'text',
      accessor: 'cashflowAccount.name',
    },
    creditAccount: {
      name: 'cash_flow.label.credit_account',
      type: 'text',
      accessor: 'creditAccount.name',
    },
    description: {
      name: 'cash_flow.label.description',
      type: 'text',
    },
  },
};
