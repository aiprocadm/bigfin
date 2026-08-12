import { SetMetadata } from '@nestjs/common';
import { RequiredPermission } from './RequirePermission.decorator';

export const REQUIRED_ANY_PERMISSION_KEY = 'requiredAnyPermission';

/**
 * Пометка «достаточно любого из перечисленных прав».
 *
 * Нужна там, где одна ручка работает с сущностью, у которой в схеме прав два
 * разных предмета. Живой случай — контрагент: это покупатель ИЛИ поставщик,
 * и одной пометкой `@RequirePermission` его не описать. Требовать право на
 * покупателей от роли, которой доверены только поставщики, было бы неверно.
 *
 * @example
 * ```typescript
 * @RequireAnyPermission(
 *   { ability: CustomerAction.View, subject: AbilitySubject.Customer },
 *   { ability: VendorAction.View, subject: AbilitySubject.Vendor },
 * )
 * @Get('auto-complete')
 * getAutoComplete() { ... }
 * ```
 */
export const RequireAnyPermission = (...permissions: RequiredPermission[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSION_KEY, permissions);
