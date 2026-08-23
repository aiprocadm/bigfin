import {
  CreditNoteEmailProps,
  renderCreditNoteEmailTemplate,
} from '@bigfin/email-components';
import { Injectable } from '@nestjs/common';
import { GetCreditNoteService } from './GetCreditNote.service';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { GetPdfTemplateService } from '@/modules/PdfTemplate/queries/GetPdfTemplate.service';
import { GetCreditNoteMailTemplateAttributesTransformer } from './GetCreditNoteMailTemplate.transformer';

@Injectable()
export class GetCreditNoteMailTemplateService {
  constructor(
    private readonly getCreditNoteService: GetCreditNoteService,
    private readonly transformer: TransformerInjectable,
    private readonly getBrandingTemplate: GetPdfTemplateService,
  ) {}

  /**
   * Атрибуты шаблона письма кредит-ноты: сама кредит-нота + фирменный стиль.
   * @param {number} creditNoteId - Credit note id.
   * @returns {Promise<CreditNoteEmailProps>}
   */
  public async getMailTemplateAttributes(
    creditNoteId: number,
  ): Promise<CreditNoteEmailProps> {
    const creditNote =
      await this.getCreditNoteService.getCreditNote(creditNoteId);
    const brandingTemplate = await this.getBrandingTemplate.getPdfTemplate(
      creditNote.pdfTemplateId,
    );
    const mailTemplateAttributes = await this.transformer.transform(
      creditNote,
      new GetCreditNoteMailTemplateAttributesTransformer(),
      { creditNote, brandingTemplate },
    );
    return mailTemplateAttributes;
  }

  /**
   * Html-содержимое письма кредит-ноты.
   * @param {number} creditNoteId - Credit note id.
   * @param overrideAttributes - Переопределяемые атрибуты (тело письма).
   * @returns {Promise<string>}
   */
  public async getMailTemplate(
    creditNoteId: number,
    overrideAttributes?: Partial<any>,
  ): Promise<string> {
    const attributes = await this.getMailTemplateAttributes(creditNoteId);
    const mergedAttributes = { ...attributes, ...overrideAttributes };

    return renderCreditNoteEmailTemplate(mergedAttributes);
  }
}
