import { ComponentType, useMemo } from 'react';
import {
  CreditNoteSendMailCreditNote,
  CreditNoteSendMailPreviewProps,
} from './CreditNoteSendMailCreditNote';
import { useSendCreditNoteMailMessage } from './_hooks';
import { useCreditNoteSendMailBoot } from './CreditNoteSendMailBoot';
import { defaultCreditNoteMailProps } from './_constants';

/**
 * Подставляет данные состояния письма кредит-ноты в превью.
 */
export const withCreditNoteMailPreviewProps = <
  P extends CreditNoteSendMailPreviewProps,
>(
  WrappedComponent: ComponentType<P & CreditNoteSendMailPreviewProps>,
) => {
  return function WithCreditNoteMailPreviewProps(props: P) {
    const message = useSendCreditNoteMailMessage();
    const { creditNoteMailState } = useCreditNoteSendMailBoot();

    const items = useMemo(
      () =>
        creditNoteMailState?.entries?.map((entry: any) => ({
          quantity: entry.quantity,
          total: entry.totalFormatted,
          label: entry.name,
        })),
      [creditNoteMailState?.entries],
    );

    const mailPreviewProps = {
      ...defaultCreditNoteMailProps,
      companyName: creditNoteMailState?.companyName,
      companyLogoUri: creditNoteMailState?.companyLogoUri,
      primaryColor: creditNoteMailState?.primaryColor,
      total: creditNoteMailState?.totalFormatted,
      subtotal: creditNoteMailState?.subtotalFormatted,
      creditNoteNumber: creditNoteMailState?.creditNoteNumber,
      discount: creditNoteMailState?.discountAmountFormatted,
      // Подпись скидки приходит с сервера уже переведённой и с процентом.
      discountLabel: creditNoteMailState?.discountLabel,
      adjustment: creditNoteMailState?.adjustmentFormatted,
      items,
      message,
    };
    return <WrappedComponent {...mailPreviewProps} {...props} />;
  };
};

export const CreditNoteMailPreviewConnected = withCreditNoteMailPreviewProps(
  CreditNoteSendMailCreditNote,
) as ComponentType<Partial<CreditNoteSendMailPreviewProps>>;
