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

  // Top details.
  showEstimateNumber: true,
  estimateNumberLabel: 'Смета №',

  estimateDateLabel: 'Дата выставления',
  showEstimateDate: true,

  showExpirationDate: true,
  expirationDateLabel: 'Действует до',

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

  // Totals
  showSubtotal: true,
  subtotalLabel: 'Подытог',

  showTotal: true,
  totalLabel: 'Итого',

  // Statements
  showCustomerNote: true,
  customerNoteLabel: 'Примечание для клиента',

  // Terms & Conditions
  showTermsConditions: true,
  termsConditionsLabel: 'Условия',
};

// Подписи вкладок редактора считаются при вызове: словарь к моменту
// импорта модуля ещё не загружен (К3 карты v17).
export const getFieldsGroups = () => [
  {
    label: intl.get('branding.editor.header'),
    fields: [
      {
        labelKey: 'estimateNumberLabel',
        enableKey: 'showEstimateNumber',
        label: intl.get('branding.editor.estimate_no'),
      },
      {
        labelKey: 'estimateDateLabel',
        enableKey: 'showEstimateDate',
        label: intl.get('branding.editor.issue_date'),
      },
      {
        labelKey: 'expirationDateLabel',
        enableKey: 'showExpirationDate',
        label: intl.get('branding.editor.expiration_date'),
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
        label: intl.get('branding.editor.statement'),
        labelPlaceholder: 'Statement',
      },
    ],
  },
];
