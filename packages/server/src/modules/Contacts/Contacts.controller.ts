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
import { GetContactDebtBreakdownService } from './queries/GetContactDebtBreakdown.service';
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

/**
 * Список номеров из строки адреса.
 *
 * Пустая строка и мусор дают пустой список, а не `NaN` в запросе: отбор по
 * `NaN` молча вернул бы пустой ответ, и человек решил бы, что долгов нет.
 */
function parseIds(value?: string): number[] {
  if (!value) return [];

  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

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
    private readonly debtBreakdownService: GetContactDebtBreakdownService,
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

  /**
   * Разбор долга по природе (FIN-023 ТЗ-2).
   *
   * СТОИТ ВЫШЕ `:id` НАМЕРЕННО. Nest сопоставляет маршруты в порядке
   * объявления, и ниже `debt-breakdown` угодил бы в `:id`, где его встречает
   * `ParseIntPipe` — ответом было бы «400, ожидалось число», а причину
   * пришлось бы искать глазами.
   */
  @Get('debt-breakdown')
  @RequireAnyPermission(...CONTACT_VIEW)
  @ApiOperation({
    summary:
      'Задолженность, разделённая на денежную и неденежную, по контрагентам.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Аванс закрывается поставкой, а не деньгами: сложенные вместе, они ' +
      'обещают денег больше, чем будет.',
  })
  getDebtBreakdown(
    @Query('contactIds') contactIds?: string,
    @Query('asDate') asDate?: string,
  ) {
    return this.debtBreakdownService.getDebtBreakdown({
      contactIds: parseIds(contactIds),
      asDate,
    });
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
