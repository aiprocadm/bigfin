import { Transformer } from '@/modules/Transformer/Transformer';

export class GetEstimateMailTemplateAttributesTransformer extends Transformer {
  public includeAttributes = (): string[] => {
    return [
      'companyLogoUri',
      'companyName',

      'estimateAmount',

      'primaryColor',

      'estimateAmount',
      'estimateMessage',

      'dueDate',
      'dueDateLabel',

      'estimateNumber',
      'estimateNumberLabel',

      'total',
      'totalLabel',

      'subtotal',
      'subtotalLabel',

      'dueAmount',
      'dueAmountLabel',

      'discount',
      'discountLabel',

      'adjustment',
      'adjustmentLabel',

      'viewEstimateButtonLabel',
      'viewEstimateButtonUrl',

      'items',
    ];
  };

  /**
   * Exclude all attributes.
   * @returns {string[]}
   */
  public excludeAttributes = (): string[] => {
    return ['*'];
  };

  /**
   * Company logo uri.
   * @returns {string}
   */
  public companyLogoUri(): string {
    return this.options.brandingTemplate?.companyLogoUri;
  }

  /**
   * Company name.
   * @returns {string}
   */
  public companyName(): string {
    return this.context.organization.name;
  }

  /**
   * Primary color.
   * @returns {string}
   */
  public primaryColor(): string {
    return this.options?.brandingTemplate?.attributes?.primaryColor;
  }

  /**
   * Estimate number.
   * @returns {string}
   */
  public estimateNumber(): string {
    return this.options.estimate.estimateNumber;
  }

  /**
   * Estimate number label.
   * @returns {string}
   */
  public estimateNumberLabel(): string {
    return this.context.i18n.t('mail.estimate.number_label', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  /**
   * Expiration date.
   * @returns {string}
   */
  public expirationDate(): string {
    return this.options.estimate.formattedExpirationDate;
  }

  /**
   * Expiration date label.
   * @returns {string}
   */
  public expirationDateLabel(): string {
    return this.context.i18n.t('mail.estimate.expiration_label', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  /**
   * Estimate total.
   */
  public total(): string {
    return this.options.estimate.totalFormatted;
  }

  /**
   * Estimate total label.
   * @returns {string}
   */
  public totalLabel(): string {
    return this.context.i18n.t('mail.label.total', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  /**
   * Estimate discount.
   * @returns {string}
   */
  public discount(): string {
    return this.options.estimate?.discountAmountFormatted;
  }

  /**
   * Estimate discount label.
   * @returns {string}
   */
  public discountLabel(): string {
    return this.context.i18n.t('mail.label.discount', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  /**
   * Estimate adjustment.
   * @returns {string}
   */
  public adjustment(): string {
    return this.options.estimate?.adjustmentFormatted;
  }

  /**
   * Estimate adjustment label.
   * @returns {string}
   */
  public adjustmentLabel(): string {
    return this.context.i18n.t('mail.label.adjustment', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  /**
   * Estimate subtotal.
   */
  public subtotal(): string {
    return this.options.estimate.formattedSubtotal;
  }

  /**
   * Estimate subtotal label.
   * @returns {string}
   */
  public subtotalLabel(): string {
    return this.context.i18n.t('mail.label.subtotal', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  /**
   * Estimate view button label.
   * @returns {string}
   */
  public viewEstimateButtonLabel(): string {
    return this.context.i18n.t('mail.estimate.view_button', {
      lang: this.context.organization?.language ?? 'en',
    });
  }

  /**
   * Estimate mail items attributes.
   */
  public items(): any[] {
    return this.item(
      this.options.estimate.entries,
      new GetEstimateMailTemplateEntryAttributesTransformer(),
    );
  }
}

class GetEstimateMailTemplateEntryAttributesTransformer extends Transformer {
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
