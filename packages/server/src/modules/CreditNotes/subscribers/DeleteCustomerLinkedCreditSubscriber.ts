import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { DeleteCustomerLinkedCreditNoteService } from '@/modules/CreditNotesApplyInvoice/commands/DeleteCustomerLinkedCreditNote.service';
import { events } from '@/common/events/events';
import { ICustomerDeletingPayload } from '@/modules/Customers/types/Customers.types';
import { ServiceError } from '@/modules/Items/ServiceError';

const ERRORS = {
  CUSTOMER_HAS_TRANSACTIONS: 'CUSTOMER_HAS_TRANSACTIONS',
};

@Injectable()
export class DeleteCustomerLinkedCreditSubscriber {
  constructor(
    private readonly deleteCustomerLinkedCredit: DeleteCustomerLinkedCreditNoteService,
  ) {}

  /**
   * Validate vendor has no associated credit transaction once the vendor deleting.
   * @param {IVendorEventDeletingPayload} payload -
   */
  // Без suppressErrors:false Nest глушил отказ валидации (грабля v7) —
  // удаление шло дальше и падало голым 500 по внешнему ключу.
  @OnEvent(events.customers.onDeleting, { suppressErrors: false })
  public async validateCustomerHasNoLinkedCreditsOnDeleting({
    customerId,
  }: ICustomerDeletingPayload) {
    try {
      await this.deleteCustomerLinkedCredit.validateCustomerHasNoCreditTransaction(
        customerId,
      );
    } catch (error) {
      throw new ServiceError(ERRORS.CUSTOMER_HAS_TRANSACTIONS);
    }
  }
}
