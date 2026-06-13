// @ts-nocheck
import { GetSaleInvoice } from '../queries/GetSaleInvoice.service';
import { GetInvoicePaymentMail } from '../queries/GetInvoicePaymentMail.service';
import { GenerateShareLink } from './GenerateInvoicePaymentLink.service';
import { Inject, Injectable } from '@nestjs/common';
import { SaleInvoice } from '../models/SaleInvoice';
import { ContactMailNotification } from '@/modules/MailNotification/ContactMailNotification';
import { SaleInvoiceMailOptions } from '../SaleInvoice.types';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';

@Injectable()
export class SendSaleInvoiceMailCommon {
  constructor(
    private getSaleInvoiceService: GetSaleInvoice,
    private contactMailNotification: ContactMailNotification,
    private getInvoicePaymentMail: GetInvoicePaymentMail,
    private generatePaymentLinkService: GenerateShareLink,
    private readonly orgI18n: OrganizationI18nService,

    @Inject(SaleInvoice.name)
    private readonly saleInvoiceModel: () => typeof SaleInvoice,
  ) {}

  /**
   * Retrieves the mail options.
   * @param {number} invoiceId - Invoice id.
   * @param {string} defaultSubject - Subject text.
   * @param {string} defaultBody - Subject body.
   * @returns {Promise<SaleInvoiceMailOptions>}
   */
  public async getInvoiceMailOptions(
    invoiceId: number,
    defaultSubject?: string,
    defaultMessage?: string,
  ): Promise<SaleInvoiceMailOptions> {
    const saleInvoice = await this.saleInvoiceModel()
      .query()
      .findById(invoiceId)
      .throwIfNotFound();

    const contactMailDefaultOptions =
      await this.contactMailNotification.getDefaultMailOptions(
        saleInvoice.customerId,
      );
    const formatArgs = await this.getInvoiceFormatterArgs(invoiceId);

    // Тема и тело по умолчанию — на языке организации (tenants_metadata.language).
    // Перевод вызывается БЕЗ args, чтобы Mustache-плейсхолдеры ({Customer Name}
    // и т.п.) сохранились и были подставлены позже в formatMailOptions.
    const subject =
      defaultSubject ?? (await this.orgI18n.translate('mail.invoice.subject'));
    const message =
      defaultMessage ?? (await this.orgI18n.translate('mail.invoice.body'));

    return {
      ...contactMailDefaultOptions,
      subject,
      message,
      attachInvoice: true,
      formatArgs,
    };
  }

  /**
   * Formats the given invoice mail options.
   * @param {number} invoiceId
   * @param {SaleInvoiceMailOptions} mailOptions
   * @returns {Promise<SaleInvoiceMailOptions>}
   */
  public async formatInvoiceMailOptions(
    invoiceId: number,
    mailOptions: SaleInvoiceMailOptions,
  ): Promise<SaleInvoiceMailOptions> {
    const formatterArgs = await this.getInvoiceFormatterArgs(invoiceId);
    const formattedOptions =
      await this.contactMailNotification.formatMailOptions(
        mailOptions,
        formatterArgs,
      );
    // Generates the a new payment link for the given invoice.
    const paymentLink =
      await this.generatePaymentLinkService.generatePaymentLink(
        invoiceId,
        'public',
      );
    const message = await this.getInvoicePaymentMail.getMailTemplate(
      invoiceId,
      {
        // # Invoice message
        invoiceMessage: formattedOptions.message,
        preview: formattedOptions.message,

        // # Payment link
        viewInvoiceButtonUrl: paymentLink.link,
      },
    );
    return { ...formattedOptions, message };
  }

  /**
   * Retrieves the formatted text of the given sale invoice.
   * @param {number} invoiceId - Sale invoice id.
   * @param {string} text - The given text.
   * @returns {Promise<string>}
   */
  // @ts-nocheck
  public getInvoiceFormatterArgs = async (
    invoiceId: number,
  ): Promise<Record<string, string | number>> => {
    const invoice = await this.getSaleInvoiceService.getSaleInvoice(invoiceId);
    const commonArgs = await this.contactMailNotification.getCommonFormatArgs();

    return {
      ...commonArgs,
      'Customer Name': invoice.customer.displayName,
      'Invoice Number': invoice.invoiceNo,
      'Invoice Due Amount': invoice.dueAmountFormatted,
      'Invoice Due Date': invoice.dueDateFormatted,
      'Invoice Date': invoice.invoiceDateFormatted,
      'Invoice Amount': invoice.totalFormatted,
      'Overdue Days': invoice.overdueDays,
    };
  };
}
