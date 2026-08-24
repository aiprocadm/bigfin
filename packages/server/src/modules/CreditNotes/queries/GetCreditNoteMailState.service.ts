import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { Inject, Injectable } from '@nestjs/common';
import { CreditNoteMailNotification } from '../commands/CreditNoteMailNotification';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CreditNote } from '../models/CreditNote';
import { GetCreditNoteMailStateTransformer } from './GetCreditNoteMailState.transformer';

@Injectable()
export class GetCreditNoteMailStateService {
  constructor(
    private readonly transformer: TransformerInjectable,
    private readonly creditNoteMail: CreditNoteMailNotification,

    @Inject(CreditNote.name)
    private readonly creditNoteModel: TenantModelProxy<typeof CreditNote>,
  ) {}

  /**
   * Состояние письма кредит-ноты: настройки письма + данные для превью.
   * @param {number} creditNoteId - Credit note id.
   */
  public async getMailState(creditNoteId: number) {
    const creditNote = await this.creditNoteModel()
      .query()
      .findById(creditNoteId)
      .withGraphFetched('entries.item')
      .withGraphFetched('customer')
      .throwIfNotFound();

    const mailOptions = await this.creditNoteMail.getMailOptions(creditNoteId);

    return this.transformer.transform(
      creditNote,
      new GetCreditNoteMailStateTransformer(),
      { mailOptions },
    );
  }
}
