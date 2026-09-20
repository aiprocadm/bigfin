import { Module } from '@nestjs/common';
import { GetAutoCompleteContactsService } from './queries/GetAutoCompleteContacts.service';
import { GetContactService } from './queries/GetContact.service';
import { GetContactByInnService } from './queries/GetContactByInn.service';
import { ContactsController } from './Contacts.controller';
import { ActivateContactService } from './commands/ActivateContact.service';
import { InactivateContactService } from './commands/InactivateContact.service';
import { GetContactDebtBreakdownService } from './queries/GetContactDebtBreakdown.service';

@Module({
  providers: [
    GetAutoCompleteContactsService,
    GetContactService,
    GetContactByInnService,
    ActivateContactService,
    InactivateContactService,
    GetContactDebtBreakdownService,
  ],
  controllers: [ContactsController],
  // Разбор долга нужен и спискам покупателей и поставщиков: провайдер
  // чужого модуля обязан быть в exports, иначе сервер не поднимается.
  exports: [GetContactByInnService, GetContactDebtBreakdownService],
})
export class ContactsModule {}
