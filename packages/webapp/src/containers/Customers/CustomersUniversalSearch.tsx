import intl from 'react-intl-universal';
import { AbilitySubject, CustomerAction } from '@/constants/abilityOption';

import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';

import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { DRAWERS } from '@/constants/drawers';

function CustomerUniversalSearchSelectComponent({
  resourceType,
  resourceId,
  onAction,

  // #withDrawerActions
  openDrawer,
}: any) {
  if (resourceType === RESOURCES_TYPES.CUSTOMER) {
    openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId: resourceId });
    onAction && onAction();
  }
  return null;
}

const CustomerUniversalSearchSelectAction = withDrawerActions(
  CustomerUniversalSearchSelectComponent,
);

/**
 * Transformes customers to search.
 * @param {*} contact
 * @returns
 */
const customersToSearch = (contact: any) => ({
  id: contact.id,
  text: contact.display_name,
  label: contact.formatted_balance,
  reference: contact,
});

/**
 * Binds universal search invoice configure.
 */
export const universalSearchCustomerBind = () => ({
  resourceType: RESOURCES_TYPES.CUSTOMER,
  optionItemLabel: intl.get('customers'),
  selectItemAction: CustomerUniversalSearchSelectAction,
  itemSelect: customersToSearch,
  permission: {
    ability: CustomerAction.View,
    subject: AbilitySubject.Customer,
  },
});
