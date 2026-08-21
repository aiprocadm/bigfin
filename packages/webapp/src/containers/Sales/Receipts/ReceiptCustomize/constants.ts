import intl from 'react-intl-universal';

export const initialValues = {
  templateName: '',

  // Colors
  primaryColor: '#2c3dd8',
  secondaryColor: '#2c3dd8',

  // Company logo.
  showCompanyLogo: true,
  companyLogoKey: '',
  companyLogoUri: '',

  // Receipt Number
  showReceiptNumber: true,
  receiptNumberLabel: 'Чек №',

  // Receipt Date
  showReceiptDate: true,
  receiptDateLabel: 'Дата выставления',

  // Customer address
  showCustomerAddress: true,

  // Company address
  showCompanyAddress: true,
  billedToLabel: 'Плательщик',

  // Entries
  itemNameLabel: 'Позиция',
  itemDescriptionLabel: 'Описание',
  itemRateLabel: 'Цена',
  itemTotalLabel: 'Сумма',

  // Subtotal
  showSubtotal: true,
  subtotalLabel: 'Подытог',

  // Total
  showTotal: true,
  totalLabel: 'Итого',

  // Terms & Conditions
  termsConditionsLabel: 'Условия',
  showTermsConditions: true,

  // Customer Note
  customerNoteLabel: 'Примечание для клиента',
  showCustomerNote: true,
};

// Подписи вкладок редактора считаются при вызове: словарь к моменту
// импорта модуля ещё не загружен (К3 карты v17).
export const getFieldsGroups = () => [
  {
    label: intl.get('branding.editor.header'),
    fields: [
      {
        labelKey: 'receiptNumberLabel',
        enableKey: 'showReceiptNumber',
        label: intl.get('branding.editor.receipt_no'),
      },
      {
        labelKey: 'receiptDateLabel',
        enableKey: 'showReceiptDate',
        label: intl.get('branding.editor.receipt_date'),
      },
      {
        enableKey: 'showCustomerAddress',
        labelKey: 'billedToLabel',
        label: intl.get('branding.editor.bill_to'),
      },
      {
        enableKey: 'showCompanyAddress',
        label: intl.get('branding.editor.billed_from'),
      },
    ],
  },
  {
    label: intl.get('branding.editor.totals'),
    fields: [
      {
        labelKey: 'subtotalLabel',
        enableKey: 'showSubtotal',
        label: intl.get('branding.editor.subtotal'),
      },
      { labelKey: 'totalLabel', enableKey: 'showTotal', label: intl.get('branding.editor.total') },
    ],
  },
  {
    label: intl.get('branding.editor.statements'),
    fields: [
      {
        enableKey: 'showCustomerNote',
        labelKey: 'customerNoteLabel',
        label: intl.get('branding.editor.customer_note'),
      },
      {
        enableKey: 'showTermsConditions',
        labelKey: 'termsConditionsLabel',
        label: intl.get('branding.editor.terms'),
      },
    ],
  },
];
