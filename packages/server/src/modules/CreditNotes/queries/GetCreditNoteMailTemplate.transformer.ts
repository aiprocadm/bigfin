import { Transformer } from '@/modules/Transformer/Transformer';

export class GetCreditNoteMailTemplateAttributesTransformer extends Transformer {
  public includeAttributes = (): string[] => {
    return [
      'lang',
      'companyLogoUri',
      'companyName',

      'primaryColor',

      'creditNoteNumber',
      'creditNoteNumberLabel',

      'total',
      'totalLabel',

      'subtotal',
      'subtotalLabel',

      'discount',
      'discountLabel',

      'adjustment',
      'adjustmentLabel',

      'items',
    ];
  };

  public excludeAttributes = (): string[] => {
    return ['*'];
  };

  /** Язык письма (html lang) — по языку организации (Р3 v18). */
  public lang(): string {
    return this.context.organization?.language === 'ru' ? 'ru' : 'en';
  }

  private lng(): string {
    return this.context.organization?.language ?? 'en';
  }

  public companyLogoUri(): string {
    return this.options.brandingTemplate?.companyLogoUri;
  }

  public companyName(): string {
    return this.context.organization.name;
  }

  public primaryColor(): string {
    return this.options?.brandingTemplate?.attributes?.primaryColor;
  }

  public creditNoteNumber(): string {
    return this.options.creditNote.creditNoteNumber;
  }

  public creditNoteNumberLabel(): string {
    return this.context.i18n.t('mail.credit_note.number_label', {
      lang: this.lng(),
    });
  }

  public total(): string {
    return this.options.creditNote.totalFormatted;
  }

  public totalLabel(): string {
    return this.context.i18n.t('mail.label.total', { lang: this.lng() });
  }

  public subtotal(): string {
    return this.options.creditNote.formattedSubtotal;
  }

  public subtotalLabel(): string {
    return this.context.i18n.t('mail.label.subtotal', { lang: this.lng() });
  }

  public discount(): string {
    return this.options.creditNote?.discountAmountFormatted;
  }

  public discountLabel(): string {
    return this.context.i18n.t('mail.label.discount', { lang: this.lng() });
  }

  public adjustment(): string {
    return this.options.creditNote?.adjustmentFormatted;
  }

  public adjustmentLabel(): string {
    return this.context.i18n.t('mail.label.adjustment', { lang: this.lng() });
  }

  public items(): any[] {
    return this.item(
      this.options.creditNote.entries,
      new GetCreditNoteMailTemplateEntryAttributesTransformer(),
    );
  }
}

class GetCreditNoteMailTemplateEntryAttributesTransformer extends Transformer {
  public includeAttributes = (): string[] => {
    return ['label', 'quantity', 'rate', 'total'];
  };

  public excludeAttributes = (): string[] => {
    return ['*'];
  };

  public label(entry): string {
    return entry?.item?.name;
  }

  public quantity(entry): string {
    return entry?.quantity;
  }

  public rate(entry): string {
    return entry?.rateFormatted;
  }

  public total(entry): string {
    return entry?.totalFormatted;
  }
}
