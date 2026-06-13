import { Transformer } from '@/modules/Transformer/Transformer';

export class GetInvoicePaymentMailAttributesTransformer extends Transformer {
  /**
   * Include these attributes to item entry object.
   * @returns {Array}
   */
  public includeAttributes = (): string[] => {
    return [
      'companyLogoUri',
      'companyName',

      'invoiceAmount',

      'primaryColor',

      'invoiceAmount',
      'invoiceMessage',

      'dueDate',
      'dueDateLabel',

      'invoiceNumber',
      'invoiceNumberLabel',

      'total',
      'totalLabel',

      'subtotal',
      'subtotalLabel',

      'discount',
      'discountLabel',

      'adjustment',
      'adjustmentLabel',

      'dueAmount',
      'dueAmountLabel',

      'viewInvoiceButtonLabel',
      'viewInvoiceButtonUrl',

      'items',
    ];
  };

  public excludeAttributes = (): string[] => {
    return ['*'];
  };

  public companyLogoUri(): string {
    return this.options.brandingTemplate?.companyLogoUri;
  }

  public companyName(): string {
    return this.context.organization.name;
  }

  public invoiceAmount(): string {
    return this.options.invoice.totalFormatted;
  }

  public primaryColor(): string {
    return this.options?.brandingTemplate?.attributes?.primaryColor;
  }

  public invoiceMessage(): string {
    return '';
  }

  public dueDate(): string {
    return this.options?.invoice?.dueDateFormatted;
  }

  public dueDateLabel(): string {
    return this.context.i18n.t('mail.invoice.due_date_label', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  public invoiceNumber(): string {
    return this.options?.invoice?.invoiceNo;
  }

  public invoiceNumberLabel(): string {
    return this.context.i18n.t('mail.invoice.number_label', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  public subtotal(): string {
    return this.options.invoice?.subtotalFormatted;
  }

  public subtotalLabel(): string {
    return this.context.i18n.t('mail.label.subtotal', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  public discount(): string {
    return this.options.invoice?.discountAmountFormatted;
  }

  public discountLabel(): string {
    return this.context.i18n.t('mail.label.discount', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  public adjustment(): string {
    return this.options.invoice?.adjustmentFormatted;
  }

  public adjustmentLabel(): string {
    return this.context.i18n.t('mail.label.adjustment', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  public total(): string {
    return this.options.invoice?.totalFormatted;
  }

  public totalLabel(): string {
    return this.context.i18n.t('mail.label.total', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  public dueAmount(): string {
    return this.options?.invoice.dueAmountFormatted;
  }

  public dueAmountLabel(): string {
    return this.context.i18n.t('mail.label.due_amount', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  public viewInvoiceButtonLabel(): string {
    return this.context.i18n.t('mail.invoice.view_button', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  public viewInvoiceButtonUrl(): string {
    return '';
  }

  public items(): Array<any> {
    return this.item(
      this.options.invoice?.entries,
      new GetInvoiceMailTemplateItemAttrsTransformer(),
    );
  }
}

class GetInvoiceMailTemplateItemAttrsTransformer extends Transformer {
  /**
   * Include these attributes to item entry object.
   * @returns {Array}
   */
  public includeAttributes = (): string[] => {
    return ['quantity', 'label', 'rate'];
  };

  public excludeAttributes = (): string[] => {
    return ['*'];
  };

  public quantity(entry): string {
    return entry?.quantity;
  }

  public label(entry): string {
    return entry?.item?.name;
  }

  public rate(entry): string {
    return entry?.rateFormatted;
  }
}
