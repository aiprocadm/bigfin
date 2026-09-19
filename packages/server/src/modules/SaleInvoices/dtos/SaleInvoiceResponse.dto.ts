import { ApiProperty } from '@nestjs/swagger';
import { ItemEntryDto } from '@/modules/TransactionItemEntry/dto/ItemEntry.dto';
import { AttachmentLinkDto } from '@/modules/Attachments/dtos/Attachment.dto';
import { PaymentMethodDto } from '../dtos/SaleInvoice.dto';
import { DiscountType } from '@/common/types/Discount';

export class SaleInvoiceResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the sale invoice',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The date of the invoice',
    example: '2023-01-01T00:00:00Z',
  })
  invoiceDate: Date;

  @ApiProperty({
    description: 'The due date of the invoice',
    example: '2023-01-15T00:00:00Z',
  })
  dueDate: Date;

  @ApiProperty({
    description: 'The invoice number',
    example: 'INV-001',
  })
  invoiceNo: string;

  @ApiProperty({
    description: 'The reference number',
    example: 'REF-001',
    required: false,
  })
  referenceNo?: string;

  @ApiProperty({
    description: 'The ID of the customer',
    example: 1,
  })
  customerId: number;

  @ApiProperty({
    description: 'The exchange rate for currency conversion',
    example: 1.0,
    required: false,
  })
  exchangeRate?: number;

  @ApiProperty({
    description: 'The currency code',
    example: 'USD',
    required: false,
  })
  currencyCode?: string;

  @ApiProperty({
    description: 'Custom message on the invoice',
    example: 'Thank you for your business',
    required: false,
  })
  invoiceMessage?: string;

  @ApiProperty({
    description: 'Terms and conditions of the invoice',
    example: 'Payment due within 14 days',
    required: false,
  })
  termsConditions?: string;

  @ApiProperty({
    description: 'Whether tax is inclusive in the item rates',
    example: false,
    required: false,
  })
  isInclusiveTax?: boolean;

  @ApiProperty({
    description: 'The line items of the invoice',
    type: [ItemEntryDto],
  })
  entries: ItemEntryDto[];

  @ApiProperty({
    description: 'Whether the invoice has been delivered',
    example: false,
  })
  delivered: boolean;

  @ApiProperty({
    description: 'The date when the invoice was delivered',
    example: '2023-01-02T00:00:00Z',
    required: false,
  })
  deliveredAt?: Date;

  @ApiProperty({
    description: 'The ID of the warehouse',
    example: 1,
    required: false,
  })
  warehouseId?: number;

  @ApiProperty({
    description: 'The ID of the branch',
    example: 1,
    required: false,
  })
  branchId?: number;

  @ApiProperty({
    description: 'The ID of the project',
    example: 1,
    required: false,
  })
  projectId?: number;

  @ApiProperty({
    description: 'The attachments of the invoice',
    type: [AttachmentLinkDto],
    required: false,
  })
  attachments?: AttachmentLinkDto[];

  @ApiProperty({
    description: 'The payment methods associated with the invoice',
    type: [PaymentMethodDto],
    required: false,
  })
  paymentMethods?: PaymentMethodDto[];

  @ApiProperty({
    description: 'The discount value',
    example: 10,
    required: false,
  })
  discount?: number;

  @ApiProperty({
    description: 'The type of discount (percentage or fixed)',
    enum: DiscountType,
    example: DiscountType.Percentage,
    required: false,
  })
  discountType?: DiscountType;

  @ApiProperty({
    description: 'The adjustment amount',
    example: 5,
    required: false,
  })
  adjustment?: number;

  @ApiProperty({
    description: 'The ID of the PDF template',
    example: 1,
    required: false,
  })
  pdfTemplateId?: number;

  @ApiProperty({
    description: 'The total amount of tax withheld',
    example: 50,
    required: false,
  })
  taxAmountWithheld?: number;

  @ApiProperty({
    description: 'The balance of the invoice',
    example: 1000,
  })
  balance: number;

  @ApiProperty({
    description: 'The amount paid',
    example: 500,
  })
  paymentAmount: number;

  @ApiProperty({
    description: 'The amount credited',
    example: 0,
    required: false,
  })
  creditedAmount?: number;

  @ApiProperty({
    description: 'The subtotal amount before tax and adjustments',
    example: 900,
  })
  subtotal: number;

  @ApiProperty({
    description: 'The total amount including tax and adjustments',
    example: 1000,
  })
  total: number;

  @ApiProperty({
    description: 'The due amount remaining to be paid',
    example: 500,
  })
  dueAmount: number;

  @ApiProperty({
    description: 'Whether the invoice is overdue',
    example: false,
  })
  isOverdue: boolean;

  @ApiProperty({
    description: 'Whether the invoice is partially paid',
    example: true,
  })
  isPartiallyPaid: boolean;

  @ApiProperty({
    description: 'Whether the invoice is fully paid',
    example: false,
  })
  isFullyPaid: boolean;

  @ApiProperty({
    description: 'The date when the invoice was created',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date when the invoice was last updated',
    example: '2023-01-02T00:00:00Z',
    required: false,
  })
  updatedAt?: Date;

  // -------------------------------------------------------------------------
  // Поля ниже добавляет преобразователь ответа (`SaleInvoiceTransformer`) и
  // сам счёт как расчётные. В ответе они были всегда, а вот в описании —
  // нет. Из-за этого письмо покупателю читало их «вслепую»: опечатайся кто
  // в имени — и в письме молча оказалась бы пустота вместо суммы.
  //
  // Описаны те, что и правда читаются кодом. Остальные форматированные поля
  // (их около полутора десятков) в описании по-прежнему отсутствуют — это
  // отдельная работа.
  // -------------------------------------------------------------------------

  @ApiProperty({
    description: 'The customer the invoice is issued to',
    required: false,
  })
  customer?: Record<string, any>;

  @ApiProperty({
    description: 'The invoice date, formatted for display',
    example: '2023-01-01',
    required: false,
  })
  invoiceDateFormatted?: string;

  @ApiProperty({
    description: 'The due date, formatted for display',
    example: '2023-02-01',
    required: false,
  })
  dueDateFormatted?: string;

  @ApiProperty({
    description: 'The due amount, formatted for display',
    example: '$500.00',
    required: false,
  })
  dueAmountFormatted?: string;

  @ApiProperty({
    description: 'The invoice total, formatted for display',
    example: '$1,000.00',
    required: false,
  })
  totalFormatted?: string;

  @ApiProperty({
    description: 'How many days the invoice is overdue',
    example: 12,
    required: false,
  })
  overdueDays?: number;

  // ---------------------------------------------------------------------
  // Поля, которые сервер отдавал, НЕ ОБЪЯВЛЯЯ (остаток О-v90-1).
  //
  // Описание ответа — это не документация «для красоты»: из него собирается
  // библиотека типов для витрины и внешних интеграций. Поле, которого здесь
  // нет, для них НЕ СУЩЕСТВУЕТ — и тот, кто его читает, делает это в обход
  // договора. Именно так уже терялся номер чека.
  //
  // За полнотой теперь следит `responseDtoMatchesTransformer.spec.ts`.
  // ---------------------------------------------------------------------

  @ApiProperty({
    description: 'Дата создания строкой',
    example: '12 Sep 2026',
    required: false,
  })
  createdAtFormatted?: string;

  @ApiProperty({
    description: 'Оплачено строкой',
    example: '$300.00',
    required: false,
  })
  paymentAmountFormatted?: string;

  @ApiProperty({
    description: 'Остаток строкой',
    example: '$700.00',
    required: false,
  })
  balanceAmountFormatted?: string;

  @ApiProperty({
    description: 'Курс строкой',
    example: '1.0000',
    required: false,
  })
  exchangeRateFormatted?: string;

  @ApiProperty({
    description: 'Сумма без налога строкой',
    example: '$900.00',
    required: false,
  })
  subtotalFormatted?: string;

  @ApiProperty({
    description: 'Сумма без налога в валюте учёта строкой',
    example: '900,00 ₽',
    required: false,
  })
  subtotalLocalFormatted?: string;

  @ApiProperty({
    description: 'Сумма без учёта налога строкой',
    example: '$900.00',
    required: false,
  })
  subtotalExludingTaxFormatted?: string;

  @ApiProperty({
    description: 'Удержанный налог строкой',
    example: '$50.00',
    required: false,
  })
  taxAmountWithheldFormatted?: string;

  @ApiProperty({
    description: 'Удержанный налог в валюте учёта строкой',
    example: '50,00 ₽',
    required: false,
  })
  taxAmountWithheldLocalFormatted?: string;

  @ApiProperty({
    description: 'Итог в валюте учёта строкой',
    example: '1 000,00 ₽',
    required: false,
  })
  totalLocalFormatted?: string;

  @ApiProperty({
    description: 'Скидка строкой',
    example: '$100.00',
    required: false,
  })
  discountAmountFormatted?: string;

  @ApiProperty({
    description: 'Скидка в процентах строкой',
    example: '10%',
    required: false,
  })
  discountPercentageFormatted?: string;

  @ApiProperty({
    description: 'Корректировка строкой',
    example: '$0.00',
    required: false,
  })
  adjustmentFormatted?: string;

  @ApiProperty({
    description: 'Налоги счёта: ставка, основание, сумма',
    required: false,
    type: 'array',
    items: { type: 'object' },
  })
  taxes?: Array<Record<string, unknown>>;
}
