import intl from 'react-intl-universal';
import React from 'react';
import { NavbarGroup, NavbarDivider, Button, Classes } from '@blueprintjs/core';
import {
  DashboardActionsBar,
  FormattedMessage as T,
  Can,
  Icon,
} from '@/components';
import { AbilitySubject, TaxRateAction } from '@/constants/abilityOption';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';

import { DialogsName } from '@/constants/dialogs';
import { compose } from '@/utils';
import { useCanExport } from '@/hooks/utils/useAbilityContext';
import { useHistory } from 'react-router-dom';

/**
 * Tax rates actions bar.
 */
function TaxRatesActionsBar({
  // #withDialogActions
  openDialog,
}: any) {
  const history = useHistory();

  // Handle `new item` button click.
  const onClickNewItem = () => {
    openDialog(DialogsName.TaxRateForm);
  };

  const handleImportBtnClick = () => {
    history.push('/tax-rates/import');
  };

  // Выгрузка таблицей — отдельное право (FT-082 ТЗ-3): без него сервер
  // ответит 403, поэтому кнопку не показываем.
  const canExport = useCanExport();

  const handleExportBtnClick = () => {
    openDialog(DialogsName.Export, { resource: 'tax_rate' });
  };

  return (
    <DashboardActionsBar>
      <NavbarGroup>
        <Can I={TaxRateAction.Create} a={AbilitySubject.TaxRate}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="plus" />}
            text={intl.get('tax_rates.action.new')}
            onClick={onClickNewItem}
          />
        </Can>
        <NavbarDivider />

        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="file-import-16" iconSize={16} />}
          text={<T id={'import'} />}
          onClick={handleImportBtnClick}
        />
        {canExport && (
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="file-export-16" iconSize={16} />}
            text={<T id={'export'} />}
            onClick={handleExportBtnClick}
          />
        )}
      </NavbarGroup>
    </DashboardActionsBar>
  );
}

export default compose(withDialogActions)(TaxRatesActionsBar);
