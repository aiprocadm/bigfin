import { x } from '@xstyled/emotion';
import { Group, Stack } from '@/components';
import {
  SendMailReceipt,
  SendMailReceiptProps,
} from '../../Estimates/SendMailViewDrawer/SendMailViewReceiptPreview';
import { isEmpty } from 'lodash';

export interface CreditNoteSendMailPreviewProps extends SendMailReceiptProps {
  // # Компания.
  companyLogoUri?: string;
  companyName: string;

  // # Номер кредит-ноты.
  creditNoteNumberLabel?: string;
  creditNoteNumber: string;

  // # Текст письма.
  message: string;

  // # Позиции.
  items?: Array<{ label: string; total: string; quantity: string | number }>;

  // # Промежуточный итог.
  subtotal: string;
  subtotalLabel?: string;

  // # Скидка.
  discount?: string;
  discountLabel?: string;

  // # Корректировка.
  adjustment?: string;
  adjustmentLabel?: string;

  // # Итог.
  total: string;
  totalLabel?: string;
}

export function CreditNoteSendMailCreditNote({
  companyLogoUri,
  companyName,

  creditNoteNumberLabel = 'Credit Note #',
  creditNoteNumber,

  total,
  totalLabel = 'Total',

  discount,
  discountLabel = 'Discount',

  adjustment,
  adjustmentLabel = 'Adjustment',

  message,

  items,
  subtotal,
  subtotalLabel = 'Subtotal',
  ...rest
}: CreditNoteSendMailPreviewProps) {
  return (
    <SendMailReceipt {...rest}>
      <Stack spacing={16} textAlign={'center'}>
        {companyLogoUri && <SendMailReceipt.CompanyLogo src={companyLogoUri} />}

        <Stack spacing={8}>
          <x.h1 m={0} fontSize={'18px'} fontWeight={500} color="#404854">
            {companyName}
          </x.h1>

          <x.h3 color="#383E47" fontWeight={500}>
            {total}
          </x.h3>

          <x.span fontSize={'13px'} color="#404854">
            {creditNoteNumberLabel} {creditNoteNumber}
          </x.span>
        </Stack>
      </Stack>

      <x.p m={0} whiteSpace={'pre-line'} color="#252A31">
        {message}
      </x.p>

      <Stack spacing={0}>
        {items?.map((item, key) => (
          <Group
            key={key}
            h={'40px'}
            position={'apart'}
            borderBottomStyle="solid"
            borderBottomWidth={'1px'}
            borderBottomColor={'#D9D9D9'}
            borderTopStyle="solid"
            borderTopColor={'#D9D9D9'}
            borderTopWidth={'1px'}
          >
            <x.span>{item.label}</x.span>
            <x.span>
              {item.quantity} x {item.total}
            </x.span>
          </Group>
        ))}

        <Group
          h={'40px'}
          position={'apart'}
          borderBottomStyle="solid"
          borderBottomWidth={'1px'}
          borderBottomColor={'#000'}
        >
          <x.span fontWeight={500}>{subtotalLabel}</x.span>
          <x.span fontWeight={600} fontSize={15}>
            {subtotal}
          </x.span>
        </Group>

        {!isEmpty(discount) && (
          <Group
            h={'40px'}
            position={'apart'}
            borderBottomStyle="solid"
            borderBottomWidth={'1px'}
            borderBottomColor={'#D9D9D9'}
          >
            <x.span>{discountLabel}</x.span>
            <x.span fontSize={15}>{discount}</x.span>
          </Group>
        )}

        {!isEmpty(adjustment) && (
          <Group
            h={'40px'}
            position={'apart'}
            borderBottomStyle="solid"
            borderBottomWidth={'1px'}
            borderBottomColor={'#D9D9D9'}
          >
            <x.span>{adjustmentLabel}</x.span>
            <x.span fontSize={15}>{adjustment}</x.span>
          </Group>
        )}

        <Group
          h={'40px'}
          position={'apart'}
          borderBottomStyle="solid"
          borderBottomWidth={'1px'}
          borderColor={'#000'}
        >
          <x.span fontWeight={500}>{totalLabel}</x.span>
          <x.span fontWeight={600} fontSize={15}>
            {total}
          </x.span>
        </Group>
      </Stack>
    </SendMailReceipt>
  );
}
