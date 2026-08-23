import { Injectable } from '@nestjs/common';
import { CreateCreditNoteService } from './commands/CreateCreditNote.service';
import { DeleteCreditNoteService } from './commands/DeleteCreditNote.service';
import { EditCreditNoteService } from './commands/EditCreditNote.service';
import { OpenCreditNoteService } from './commands/OpenCreditNote.service';
import { GetCreditNotePdf } from './queries/GetCreditNotePdf.serivce';
import { GetCreditNotesService } from './queries/GetCreditNotes.service';
import { CreateCreditNoteDto, EditCreditNoteDto } from './dtos/CreditNote.dto';
import { GetCreditNotesQueryDto } from './dtos/GetCreditNotesQuery.dto';
import { GetCreditNoteState } from './queries/GetCreditNoteState.service';
import { GetCreditNoteService } from './queries/GetCreditNote.service';
import { BulkDeleteCreditNotesService } from './BulkDeleteCreditNotes.service';
import { ValidateBulkDeleteCreditNotesService } from './ValidateBulkDeleteCreditNotes.service';
import { CreditNoteMailNotification } from './commands/CreditNoteMailNotification';
import { GetCreditNoteMailStateService } from './queries/GetCreditNoteMailState.service';
import { CreditNoteMailOptsDTO } from './types/CreditNotes.types';

@Injectable()
export class CreditNoteApplication {
  constructor(
    private readonly createCreditNoteService: CreateCreditNoteService,
    private readonly editCreditNoteService: EditCreditNoteService,
    private readonly openCreditNoteService: OpenCreditNoteService,
    private readonly deleteCreditNoteService: DeleteCreditNoteService,
    private readonly getCreditNotePdfService: GetCreditNotePdf,
    private readonly getCreditNotesService: GetCreditNotesService,
    private readonly getCreditNoteStateService: GetCreditNoteState,
    private readonly getCreditNoteService: GetCreditNoteService,
    private readonly bulkDeleteCreditNotesService: BulkDeleteCreditNotesService,
    private readonly validateBulkDeleteCreditNotesService: ValidateBulkDeleteCreditNotesService,
    private readonly creditNoteMailNotification: CreditNoteMailNotification,
    private readonly getCreditNoteMailStateService: GetCreditNoteMailStateService,
  ) { }

  /**
   * Отправляет письмо кредит-ноты (Р3б карты v18).
   * @param {number} creditNoteId
   * @param {CreditNoteMailOptsDTO} messageOpts
   * @returns {Promise<void>}
   */
  sendCreditNoteMail(
    creditNoteId: number,
    messageOpts: CreditNoteMailOptsDTO,
  ) {
    return this.creditNoteMailNotification.triggerMail(
      creditNoteId,
      messageOpts,
    );
  }

  /**
   * Отдаёт состояние письма кредит-ноты для формы отправки.
   * @param {number} creditNoteId
   */
  getCreditNoteMail(creditNoteId: number) {
    return this.getCreditNoteMailStateService.getMailState(creditNoteId);
  }

  /**
   * Creates a new credit note.
   * @param {CreateCreditNoteDto} creditNoteDTO
   * @returns {Promise<CreditNote>}
   */
  createCreditNote(creditNoteDTO: CreateCreditNoteDto) {
    return this.createCreditNoteService.creditCreditNote(creditNoteDTO);
  }

  /**
   * Edits a credit note.
   * @param {number} creditNoteId
   * @param {EditCreditNoteDto} creditNoteDTO
   * @returns {Promise<CreditNote>}
   */
  editCreditNote(creditNoteId: number, creditNoteDTO: EditCreditNoteDto) {
    return this.editCreditNoteService.editCreditNote(
      creditNoteId,
      creditNoteDTO,
    );
  }

  /**
   * Opens a credit note.
   * @param {number} creditNoteId
   * @returns {Promise<CreditNote>}
   */
  openCreditNote(creditNoteId: number) {
    return this.openCreditNoteService.openCreditNote(creditNoteId);
  }

  /**
   * Deletes a credit note.
   * @param {number} creditNoteId
   * @returns {Promise<CreditNote>}
   */
  deleteCreditNote(creditNoteId: number) {
    return this.deleteCreditNoteService.deleteCreditNote(creditNoteId);
  }

  /**
   * Retrieves the PDF for a credit note.
   * @param {number} creditNoteId
   * @returns {Promise<string>}
   */
  getCreditNotePdf(creditNoteId: number) {
    return this.getCreditNotePdfService.getCreditNotePdf(creditNoteId);
  }

  /**
   * Отдаёт html печатной формы кредит-ноты (превью письма, Р3б v18).
   * @param {number} creditNoteId
   * @returns {Promise<string>}
   */
  getCreditNoteHtml(creditNoteId: number) {
    return this.getCreditNotePdfService.getCreditNoteHtml(creditNoteId);
  }

  /**
   * Retrieves the credit notes list.
   * @param {GetCreditNotesQueryDto} creditNotesQuery
   * @returns {Promise<GetCreditNotesResponse>}
   */
  getCreditNotes(creditNotesQuery: GetCreditNotesQueryDto) {
    return this.getCreditNotesService.getCreditNotesList(creditNotesQuery);
  }

  /**
   * Retrieves the create/edit initial state of the credit note.
   * @returns {Promise<ICreditNoteState>}
   */
  getCreditNoteState() {
    return this.getCreditNoteStateService.getCreditNoteState();
  }

  /**
   * Retrieves the credit note.
   * @param {number} creditNoteId
   * @returns {Promise<CreditNote>}
   */
  getCreditNote(creditNoteId: number) {
    return this.getCreditNoteService.getCreditNote(creditNoteId);
  }

  /**
   * Deletes multiple credit notes.
   * @param {number[]} creditNoteIds
   * @returns {Promise<void>}
   */
  bulkDeleteCreditNotes(
    creditNoteIds: number[],
    options?: { skipUndeletable?: boolean },
  ) {
    return this.bulkDeleteCreditNotesService.bulkDeleteCreditNotes(
      creditNoteIds,
      options,
    );
  }

  /**
   * Validates which credit notes can be deleted.
   * @param {number[]} creditNoteIds
   * @returns {Promise<{deletableCount: number, nonDeletableCount: number, deletableIds: number[], nonDeletableIds: number[]}>}
   */
  validateBulkDeleteCreditNotes(creditNoteIds: number[]) {
    return this.validateBulkDeleteCreditNotesService.validateBulkDeleteCreditNotes(
      creditNoteIds,
    );
  }
}
