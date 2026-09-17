import React from 'react';
import intl from 'react-intl-universal';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster, FormattedHTMLMessage } from '@/components';

import { useDeleteTaxRate } from '@/hooks/query/taxRates';

import {
  withAlertStoreConnect,
  AlertReduxProps,
} from '@/containers/Alert/withAlertStoreConnect';
import {
  withAlertActions,
  WithAlertActionsProps,
} from '@/containers/Alert/withAlertActions';
import {
  withDrawerActions,
  WithDrawerActionsProps,
} from '@/containers/Drawer/withDrawerActions';

import { compose } from '@/utils';
import { DRAWERS } from '@/constants/drawers';

type TaxRateDeleteAlertProps = AlertReduxProps<{ taxRateId: number }> &
  WithAlertActionsProps &
  WithDrawerActionsProps;

/**
 * Item delete alerts.
 */
function TaxRateDeleteAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { taxRateId },

  // #withAlertActions
  closeAlert,

  // #withDrawerActions
  closeDrawer,
}: TaxRateDeleteAlertProps) {
  const { mutateAsync: deleteTaxRate, isLoading } = useDeleteTaxRate();

  // Handle cancel delete item alert.
  const handleCancelItemDelete = () => {
    closeAlert(name);
  };
  // Handle confirm delete item.
  const handleConfirmDeleteItem = () => {
    deleteTaxRate(taxRateId)
      .then(() => {
        AppToaster.show({
          message: intl.get('tax_rates.alert.deleted_successfully'),
          intent: Intent.SUCCESS,
        });
        closeDrawer(DRAWERS.TAX_RATE_DETAILS);
      })
      .catch((error: any) => {
        const type = error?.response?.data?.errors?.[0]?.type;
        AppToaster.show({
          message: intl.get(
            type === 'TAX_RATE_IN_USE'
              ? 'tax_rates.alert.in_use'
              : 'something_wentwrong',
          ),
          intent: Intent.DANGER,
        });
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('delete')}
      icon="trash"
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancelItemDelete}
      onConfirm={handleConfirmDeleteItem}
      loading={isLoading}
    >
      {/*
        Раньше оба абзаца были английским текстом прямо в разметке — мимо
        словаря, да ещё с дырой в вопросе («delete ?»). Теперь это обычный
        ключ, как у соседних предупреждений (Д2 карты v88).
      */}
      <p>
        <FormattedHTMLMessage id={'tax_rates.alert.once_delete_this_tax_rate'} />
      </p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
  withDrawerActions,
)(TaxRateDeleteAlert);
