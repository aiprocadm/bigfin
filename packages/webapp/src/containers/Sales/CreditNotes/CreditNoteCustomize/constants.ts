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

  // Address
  showCustomerAddress: true,
  showCompanyAddress: true,
  billedToLabel: 'Плательщик',

  // Entries
  itemNameLabel: 'Позиция',
  itemDescriptionLabel: 'Описание',
  itemRateLabel: 'Цена',
  itemTotalLabel: 'Сумма',

  // Total
  showTotal: true,
  totalLabel: 'Итого',

  // Subtotal
  showSubtotal: true,
  subtotalLabel: 'Подытог',

  // Customer Note.
  showCustomerNote: true,
  customerNoteLabel: 'Примечание для клиента',

  // Terms & Conditions
  showTermsConditions: true,
  termsConditionsLabel: 'Условия',

  // Date issue.
  creditNoteDateLabel: 'Дата выставления',
  showCreditNoteDate: true,

  // Credit Number.
  creditNoteNumberLabel: 'Кредит-нота №',
  showCreditNoteNumber: true,
};

// Подписи вкладок редактора считаются при вызове: словарь к моменту
// импорта модуля ещё не загружен (К3 карты v17).
export const getFieldsGroups = () => [
  {
    label: intl.get('branding.editor.header'),
    fields: [
      {
        labelKey: 'creditNoteDateLabel',
        enableKey: 'showCreditNoteDate',
        label: intl.get('branding.editor.issue_date'),
      },
      {
        labelKey: 'creditNoteNumberLabel',
        enableKey: 'showCreditNoteNumber',
        label: intl.get('branding.editor.credit_note_no'),
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
    label: intl.get('branding.editor.footer'),
    fields: [
      {
        labelKey: 'termsConditionsLabel',
        enableKey: 'showTermsConditions',
        label: intl.get('branding.editor.terms'),
      },
      {
        labelKey: 'customerNoteLabel',
        enableKey: 'showCustomerNote',
        label: intl.get('branding.editor.customer_note'),
        labelPlaceholder: 'Customer Note',
      },
    ],
  },
];
