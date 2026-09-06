import React from 'react';
import * as R from 'ramda';

import { ButtonLink } from '../Button';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { DRAWERS } from '@/constants/drawers';

function CustomerDrawerLinkComponent({
  // #ownProps
  children,
  customerId,
  className,

  // #withDrawerActions
  openDrawer,
}: any) {
  // Handle view customer drawer.
  const handleCustomerDrawer = (event: any) => {
    openDrawer(DRAWERS.CUSTOMER_DETAILS, { customerId });
    event.preventDefault();
  };

  return (
    <ButtonLink className={className} onClick={handleCustomerDrawer}>
      {children}
    </ButtonLink>
  );
}

export const CustomerDrawerLink = R.compose(withDrawerActions)(
  CustomerDrawerLinkComponent,
);
