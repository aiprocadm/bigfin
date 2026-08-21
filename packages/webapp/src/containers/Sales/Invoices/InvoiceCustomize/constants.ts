import intl from 'react-intl-universal';

export const MANAGE_LINK_URL = '/preferences/payment-methods';

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
  showInvoiceNumber: true,
  invoiceNumberLabel: 'Счёт №',

  // Issue date
  showDateIssue: true,
  dateIssueLabel: 'Дата выставления',

  // Due date.
  showDueDate: true,
  dueDateLabel: 'Оплатить до',

  // Addresses
  showCustomerAddress: true,
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

  // Discount
  showDiscount: true,
  discountLabel: 'Скидка',

  showTaxes: true,

  showTotal: true,
  totalLabel: 'Итого',

  paymentMadeLabel: 'Оплачено',
  showPaymentMade: true,

  // Due amount
  dueAmountLabel: 'К оплате',
  showDueAmount: true,

  // Footer paragraphs.
  termsConditionsLabel: 'Условия',
  showTermsConditions: true,

  // Statement
  statementLabel: 'Примечание',
  showStatement: true,
};

// Подписи вкладок редактора считаются при вызове: словарь к моменту
// импорта модуля ещё не загружен (К3 карты v17).
export const getFieldsGroups = () => [
  {
    label: intl.get('branding.editor.header'),
    fields: [
      {
        labelKey: 'invoiceNumberLabel',
        enableKey: 'showInvoiceNumber',
        label: intl.get('branding.editor.invoice_no'),
      },
      {
        labelKey: 'dateIssueLabel',
        enableKey: 'showDateIssue',
        label: intl.get('branding.editor.issue_date'),
      },
      {
        labelKey: 'dueDateLabel',
        enableKey: 'showDueDate',
        label: intl.get('branding.editor.due_date'),
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
      {
        labelKey: 'discountLabel',
        enableKey: 'showDiscount',
        label: intl.get('branding.editor.discount'),
      },
      { enableKey: 'showTaxes', label: intl.get('branding.editor.taxes') },
      { labelKey: 'totalLabel', enableKey: 'showTotal', label: intl.get('branding.editor.total') },
      {
        labelKey: 'paymentMadeLabel',
        enableKey: 'showPaymentMade',
        label: intl.get('branding.editor.payment_made'),
      },
      {
        labelKey: 'dueAmountLabel',
        enableKey: 'showDueAmount',
        label: intl.get('branding.editor.due_amount'),
      },
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
        labelKey: 'statementLabel',
        enableKey: 'showStatement',
        label: intl.get('branding.editor.statement'),
        labelPlaceholder: 'Statement',
      },
    ],
  },
];
