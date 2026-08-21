import intl from 'react-intl-universal';

export const initialValues = {
  templateName: '',

  // Colors
  primaryColor: '#2c3dd8',
  secondaryColor: '#2c3dd8',

  // Company logo.
  showCompanyLogo: true,
  companyLogoUri: '',
  companyLogoKey: '',

  // Top details.
  showPaymentReceivedNumber: true,
  paymentReceivedNumberLabel: 'Поступление №',

  // Payment number
  showPaymentReceivedDate: true,
  paymentReceivedDateLabel: 'Дата выставления',

  // Customer address
  showCompanyAddress: true,

  // Company address
  showCustomerAddress: true,
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
};

// Подписи вкладок редактора считаются при вызове: словарь к моменту
// импорта модуля ещё не загружен (К3 карты v17).
export const getFieldsGroups = () => [
  {
    label: intl.get('branding.editor.header'),
    fields: [
      {
        labelKey: 'paymentReceivedNumberLabel',
        enableKey: 'showPaymentReceivedNumber',
        label: intl.get('branding.editor.payment_no'),
      },
      {
        labelKey: 'paymentReceivedDateLabel',
        enableKey: 'showPaymentReceivedDate',
        label: intl.get('branding.editor.payment_date'),
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
];
