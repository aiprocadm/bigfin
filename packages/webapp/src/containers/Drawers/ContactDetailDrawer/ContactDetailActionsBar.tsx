// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  Button,
  NavbarGroup,
  Classes,
  NavbarDivider,
  Intent,
} from '@blueprintjs/core';

import { useContactDetailDrawerContext } from './ContactDetailDrawerProvider';

import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';

import { DrawerActionsBar, Icon, FormattedMessage as T } from '@/components';
import { FeatureCan } from '@/components';
import { Features } from '@/constants/features';
import useApiRequest from '@/hooks/useRequest';

import { safeCallback, compose } from '@/utils';

function ContactDetailActionsBar({
  // #withAlertActions
  openAlert,

  // #withDrawerActions
  closeDrawer,
}) {
  const { contact, contactId } = useContactDetailDrawerContext();
  const history = useHistory();

  // Handle edit contact.
  const onEditContact = () => {
    return contactId
      ? (history.push(`/${contact?.contact_service}s/${contactId}/edit`),
        closeDrawer('contact-detail-drawer'))
      : null;
  };

  const apiRequest = useApiRequest();

  /**
   * Акт сверки взаимных расчётов за последний квартал (К2 карты v19).
   * Период по умолчанию — три месяца назад: именно так сверяются чаще
   * всего, а выбрать другой можно будет из отчёта.
   */
  const onReconciliationAct = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);

    const iso = (date) => date.toISOString().slice(0, 10);

    apiRequest
      .http({
        method: 'get',
        url: `/api/ru-print-forms/customers/${contactId}/reconciliation-act`,
        params: { fromDate: iso(fromDate), toDate: iso(toDate) },
        headers: { accept: 'application/pdf' },
        responseType: 'blob',
      })
      .then((response) => {
        const file = new Blob([response.data], { type: 'application/pdf' });
        window.open(URL.createObjectURL(file));
      });
  };

  // Handle delete contact.
  const onDeleteContact = () => {
    return contactId
      ? (openAlert(`${contact?.contact_service}-delete`, { contactId }),
        closeDrawer('contact-detail-drawer'))
      : null;
  };

  return (
    <DrawerActionsBar>
      <NavbarGroup>
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="pen-18" />}
          text={intl.get('edit_contact', { name: contact?.contact_service })}
          onClick={safeCallback(onEditContact)}
        />
        <FeatureCan feature={Features.RuPrintForms}>
          {contact?.contact_service === 'customer' && (
            <>
              <NavbarDivider />
              <Button
                className={Classes.MINIMAL}
                icon={<Icon icon="print-16" />}
                text={<T id={'ru_print_forms.reconciliation_act.button'} />}
                onClick={safeCallback(onReconciliationAct)}
              />
            </>
          )}
        </FeatureCan>
        <NavbarDivider />
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon={'trash-16'} iconSize={16} />}
          text={<T id={'delete'} />}
          intent={Intent.DANGER}
          onClick={safeCallback(onDeleteContact)}
        />
      </NavbarGroup>
    </DrawerActionsBar>
  );
}

export default compose(
  withDrawerActions,
  withAlertActions,
)(ContactDetailActionsBar);
