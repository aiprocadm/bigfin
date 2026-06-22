import { Module } from '@nestjs/common';
import { GetAutoCompleteContactsService } from './queries/GetAutoCompleteContacts.service';
import { GetContactService } from './queries/GetContact.service';
import { GetContactByInnService } from './queries/GetContactByInn.service';
import { ContactsController } from './Contacts.controller';
import { ActivateContactService } from './commands/ActivateContact.service';
import { InactivateContactService } from './commands/InactivateContact.service';

@Module({
  providers: [
    GetAutoCompleteContactsService,
    GetContactService,
    GetContactByInnService,
    ActivateContactService,
    InactivateContactService,
  ],
  controllers: [ContactsController],
  exports: [GetContactByInnService],
})
export class ContactsModule {}
