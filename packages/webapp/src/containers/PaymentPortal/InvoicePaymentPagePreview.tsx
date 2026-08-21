import { InvoicePaymentPage, PaymentPageProps } from './PaymentPage';

export interface InvoicePaymentPagePreviewProps
  extends Partial<PaymentPageProps> { }

export function InvoicePaymentPagePreview(
  props: InvoicePaymentPagePreviewProps,
) {
  return (
    <InvoicePaymentPage
      paidAmount={'100 000,00 ₽'}
      dueDate={'20.09.2026'}
      total={'100 000,00 ₽'}
      subtotal={'100 000,00 ₽'}
      dueAmount={'100 000,00 ₽'}
      customerName={'Иван Петров'}
      organizationName={'ООО «Ромашка»'}
      invoiceNumber={'INV-000001'}
      companyLogoUri={' '}
      organizationAddress={' '}
      {...props}
    />
  );
}
