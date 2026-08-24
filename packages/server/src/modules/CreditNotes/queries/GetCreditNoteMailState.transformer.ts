import { DiscountType } from '@/common/types/Discount';
import { ItemEntryTransformer } from '@/modules/TransactionItemEntry/ItemEntry.transformer';
import { Transformer } from '@/modules/Transformer/Transformer';

export class GetCreditNoteMailStateTransformer extends Transformer {
  public excludeAttributes = (): string[] => {
    return ['*'];
  };

  public includeAttributes = (): string[] => {
    return [
      'companyName',
      'companyLogoUri',
      'primaryColor',
      'customerName',
      'total',
      'totalFormatted',
      'subtotal',
      'subtotalFormatted',
      'creditNoteDate',
      'creditNoteDateFormatted',
      'creditNoteNumber',

      'discountAmount',
      'discountAmountFormatted',
      'discountPercentage',
      'discountPercentageFormatted',
      'discountLabel',

      'adjustment',
      'adjustmentFormatted',

      'entries',
    ];
  };

  protected customerName = (creditNote) => {
    return creditNote.customer?.displayName;
  };

  protected companyName = () => {
    return this.context.organization.name;
  };

  protected companyLogoUri = (creditNote) => {
    return creditNote.pdfTemplate?.companyLogoUri;
  };

  protected primaryColor = (creditNote) => {
    return creditNote.pdfTemplate?.attributes?.primaryColor;
  };

  protected total = (creditNote) => {
    return creditNote.amount;
  };

  protected totalFormatted = (creditNote) => {
    return this.formatMoney(creditNote.amount, {
      currencyCode: creditNote.currencyCode,
    });
  };

  protected subtotal = (creditNote) => {
    return creditNote.amount;
  };

  protected subtotalFormatted = (creditNote) => {
    return this.formatMoney(creditNote.amount, {
      currencyCode: creditNote.currencyCode,
    });
  };

  protected creditNoteDate = (creditNote): string => {
    return creditNote.creditNoteDate;
  };

  protected creditNoteDateFormatted = (creditNote): string => {
    return this.formatDate(creditNote.creditNoteDate);
  };

  /**
   * Подпись скидки — переводом, с процентом для процентной скидки
   * (тот же приём, что у чека и счёта, Р3 v18).
   */
  protected discountLabel(creditNote) {
    const label = this.context.i18n.t('mail.label.discount', {
      lang: this.context.organization?.language ?? 'en',
    });
    return creditNote.discountType === DiscountType.Percentage
      ? `${label} [${creditNote.discountPercentageFormatted}]`
      : label;
  }

  protected entries = (creditNote) => {
    return this.item(
      creditNote.entries,
      new GetCreditNoteEntryMailStateTransformer(),
      { currencyCode: creditNote.currencyCode },
    );
  };

  /**
   * Смешивает настройки письма с данными кредит-ноты.
   */
  public transform = (object: any) => {
    return {
      ...this.options.mailOptions,
      ...object,
    };
  };
}

class GetCreditNoteEntryMailStateTransformer extends ItemEntryTransformer {
  public excludeAttributes = (): string[] => {
    return ['*'];
  };

  public name = (entry) => {
    return entry.item.name;
  };

  public includeAttributes = (): string[] => {
    return [
      'name',
      'quantity',
      'quantityFormatted',
      'rate',
      'rateFormatted',
      'total',
      'totalFormatted',
    ];
  };
}
