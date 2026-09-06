import React from 'react';
import intl from 'react-intl-universal';
import { Button, Intent } from '@blueprintjs/core';
import * as R from 'ramda';
import { EmptyStatus, Can } from '@/components';
import { SaleInvoiceAction, AbilitySubject } from '@/constants/abilityOption';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { DialogsName } from '@/constants/dialogs';

/**
 * Пустой экран налоговых ставок. Раньше здесь был английский текст и кнопка
 * «Подробнее», которая никуда не вела (М4 карты v15).
 */
function TaxRatesLandingEmptyStateRoot({
  // #withDialogAction
  openDialog,
}: any) {
  return (
    <EmptyStatus
      title={intl.get('tax_rates.empty_state.title')}
      description={<p>{intl.get('tax_rates.empty_state.description')}</p>}
      action={
        <Can I={SaleInvoiceAction.Create} a={AbilitySubject.Invoice}>
          <Button
            intent={Intent.PRIMARY}
            large={true}
            onClick={() => {
              openDialog(DialogsName.TaxRateForm);
            }}
          >
            {intl.get('tax_rates.empty_state.new_button')}
          </Button>
        </Can>
      }
    />
  );
}

export const TaxRatesLandingEmptyState = R.compose(withDialogActions)(
  TaxRatesLandingEmptyStateRoot,
);
