// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React from 'react';
import intl from 'react-intl-universal';
import {
  Button,
  Classes,
  Intent,
  Menu,
  MenuItem,
  NavbarDivider,
  NavbarGroup,
  Popover,
  PopoverInteractionKind,
  Position,
} from '@blueprintjs/core';
import * as R from 'ramda';
import { AppToaster, Can, DrawerActionsBar, Icon } from '@/components';
import { AbilitySubject, TaxRateAction } from '@/constants/abilityOption';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { useTaxRateDetailsContext } from './TaxRateDetailsContentBoot';
import { DialogsName } from '@/constants/dialogs';
import {
  useActivateTaxRate,
  useInactivateTaxRate,
} from '@/hooks/query/taxRates';

/**
 * Tax rate details content actions bar.
 * @returns {JSX.Element}
 */
function TaxRateDetailsContentActionsBar({
  // #withDrawerActions
  openDialog,

  // #withAlertActions
  openAlert,
}) {
  const { taxRateId, taxRate } = useTaxRateDetailsContext();

  const { mutateAsync: activateTaxRateMutate } = useActivateTaxRate();
  const { mutateAsync: inactivateTaxRateMutate } = useInactivateTaxRate();

  // Handle edit tax rate.
  const handleEditTaxRate = () => {
    openDialog(DialogsName.TaxRateForm, { id: taxRateId });
  };
  // Handle delete tax rate.
  const handleDeleteTaxRate = () => {
    openAlert('tax-rate-delete', { taxRateId });
  };
  // Handle activate tax rate.
  const handleActivateTaxRate = () => {
    activateTaxRateMutate(taxRateId)
      .then(() => {
        AppToaster.show({
          message: intl.get('tax_rates.alert.activated_successfully'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('something_wentwrong'),
          intent: Intent.DANGER,
        });
      });
  };
  // Handle inactivate tax rate.
  const handleInactivateTaxRate = () => {
    inactivateTaxRateMutate(taxRateId)
      .then(() => {
        AppToaster.show({
          message: intl.get('tax_rates.alert.inactivated_successfully'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('something_wentwrong'),
          intent: Intent.DANGER,
        });
      });
  };

  return (
    <DrawerActionsBar>
      <NavbarGroup>
        <Can I={TaxRateAction.Edit} a={AbilitySubject.TaxRate}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="pen-18" />}
            text={intl.get('tax_rates.action.edit')}
            onClick={handleEditTaxRate}
          />
        </Can>
        <Can I={TaxRateAction.Delete} a={AbilitySubject.Item}>
          <NavbarDivider />
          <Button
            className={Classes.MINIMAL}
            text={intl.get('delete')}
            icon={<Icon icon={'trash-16'} iconSize={16} />}
            intent={Intent.DANGER}
            onClick={handleDeleteTaxRate}
          />
        </Can>

        <Can I={TaxRateAction.Edit} a={AbilitySubject.TaxRate}>
          <NavbarDivider />
          <Popover
            minimal={true}
            interactionKind={PopoverInteractionKind.CLICK}
            position={Position.BOTTOM_LEFT}
            modifiers={{
              offset: { offset: '0, 4' },
            }}
            content={
              <Menu>
                {!taxRate.active && (
                  <MenuItem
                    text={intl.get('tax_rates.action.activate')}
                    onClick={handleActivateTaxRate}
                  />
                )}
                {!!taxRate.active && (
                  <MenuItem
                    text={intl.get('tax_rates.action.inactivate')}
                    onClick={handleInactivateTaxRate}
                  />
                )}
              </Menu>
            }
          >
            <Button
              icon={<Icon icon="more-vert" iconSize={16} />}
              minimal={true}
            />
          </Popover>
        </Can>
      </NavbarGroup>
    </DrawerActionsBar>
  );
}

export default R.compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(TaxRateDetailsContentActionsBar);
