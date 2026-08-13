import {
  Controller,
  Get,
  Query,
  Param,
  Patch,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { GetContactsAutoCompleteQuery } from './dtos/GetContactsAutoCompleteQuery.dto';
import { GetAutoCompleteContactsService } from './queries/GetAutoCompleteContacts.service';
import { allowedContactServices } from './utils/allowedContactServices';
import { GetContactService } from './queries/GetContact.service';
import { ActivateContactService } from './commands/ActivateContact.service';
import { InactivateContactService } from './commands/InactivateContact.service';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequireAnyPermission } from '@/modules/Roles/RequireAnyPermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import {
  CustomerAction,
  VendorAction,
} from '@/modules/Customers/types/Customers.types';

/**
 * Контрагент — это покупатель ИЛИ поставщик, поэтому здесь пометка «любое из
 * прав»: одного из двух достаточно.
 *
 * Списки покупателей и поставщиков закрыты правами давно, а подсказка
 * контрагентов стояла открытой и отдавала весь список вместе с долгами —
 * то есть обходила уже принятое решение.
 */
const CONTACT_VIEW = [
  { ability: CustomerAction.View, subject: AbilitySubject.Customer },
  { ability: VendorAction.View, subject: AbilitySubject.Vendor },
];

const CONTACT_EDIT = [
  { ability: CustomerAction.Edit, subject: AbilitySubject.Customer },
  { ability: VendorAction.Edit, subject: AbilitySubject.Vendor },
];

@Controller('contacts')
@ApiTags('Contacts')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ContactsController {
  constructor(
    private readonly getAutoCompleteService: GetAutoCompleteContactsService,
    private readonly getContactService: GetContactService,
    private readonly activateContactService: ActivateContactService,
    private readonly inactivateContactService: InactivateContactService,
  ) {}

  @Get('auto-complete')
  @RequireAnyPermission(...CONTACT_VIEW)
  @ApiOperation({ summary: 'Get the auto-complete contacts' })
  getAutoComplete(
    @Query() query: GetContactsAutoCompleteQuery,
    @Req() request: any,
  ) {
    // Пометка выше пускает при любом из двух прав, а выдача сужается до
    // доверенной стороны: «только поставщики» не видят покупателей.
    const allowedServices = allowedContactServices(request.ability);

    return this.getAutoCompleteService.autocompleteContacts(
      query,
      allowedServices,
    );
  }

  @Get(':id')
  @RequireAnyPermission(...CONTACT_VIEW)
  @ApiOperation({ summary: 'Get contact by ID (customer or vendor)' })
  @ApiParam({ name: 'id', type: Number, description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact details (under "customer" key for form/duplicate use)' })
  getContact(@Param('id', ParseIntPipe) contactId: number) {
    return this.getContactService.getContact(contactId);
  }

  @Patch(':id/activate')
  @RequireAnyPermission(...CONTACT_EDIT)
  @ApiOperation({ summary: 'Activate a contact' })
  @ApiParam({ name: 'id', type: 'number', description: 'Contact ID' })
  async activateContact(@Param('id', ParseIntPipe) contactId: number) {
    await this.activateContactService.activateContact(contactId);
    return { id: contactId, activated: true };
  }

  @Patch(':id/inactivate')
  @RequireAnyPermission(...CONTACT_EDIT)
  @ApiOperation({ summary: 'Inactivate a contact' })
  @ApiParam({ name: 'id', type: 'number', description: 'Contact ID' })
  async inactivateContact(@Param('id', ParseIntPipe) contactId: number) {
    await this.inactivateContactService.inactivateContact(contactId);
    return { id: contactId, inactivated: true };
  }
}
