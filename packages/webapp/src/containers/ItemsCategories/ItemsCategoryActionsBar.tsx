import {
  NavbarGroup,
  NavbarDivider,
  Button,
  Classes,
  Intent,
} from '@blueprintjs/core';
import {
  If,
  Icon,
  FormattedMessage as T,
  AdvancedFilterPopover,
  DashboardFilterButton,
  DashboardActionsBar,
} from '@/components';

import { withItemCategories } from './withItemCategories';
import { withItemCategoriesActions } from './withItemCategoriesActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';

import { compose } from '@/utils';
import { useItemsCategoriesContext } from './ItemsCategoriesProvider';
import { useHistory } from 'react-router-dom';
import { DialogsName } from '@/constants/dialogs';
import { useCanExport } from '@/hooks/utils/useAbilityContext';

/**
 * Items categories actions bar.
 */
interface ItemsCategoryActionsBarProps {
  /**
   * Выделенные строки. ВСЕГДА пусто: обёртка `withItemCategories` такого поля
   * не отдаёт, и в хранилище его нет — поэтому кнопка «Удалить» ниже не
   * показывается никогда, а предупреждение, которое она открывает, не
   * зарегистрировано (Д3 карты v88). Удаление мёртвого пути предложено
   * владельцу.
   */
  itemCategoriesSelectedRows?: number[];
  categoriesFilterConditions?: any[];
  setItemsCategoriesTableState: (state: any) => void;
  openDialog: (name: string, payload?: any) => void;
  openAlert: (name: string, payload?: any) => void;
}

function ItemsCategoryActionsBar({
  // #withItemCategories
  itemCategoriesSelectedRows = [],
  categoriesFilterConditions,

  //
  setItemsCategoriesTableState,

  // #withDialog
  openDialog,

  // #withAlertActions
  openAlert,
}: ItemsCategoryActionsBarProps) {
  const { fields } = useItemsCategoriesContext();
  const history = useHistory();

  const onClickNewCategory = () => {
    openDialog('item-category-form', {});
  };

  const handleImportBtnClick = () => {
    history.push('/item/categories/import');
  };

  // Handle the items categories bulk delete.
  const handelBulkDelete = () => {
    openAlert('item-categories-bulk-delete', {
      itemCategoriesIds: itemCategoriesSelectedRows,
    });
  };
  // Handle the export button click.
  // Выгрузка таблицей — отдельное право (FT-082 ТЗ-3): без него сервер
  // ответит 403, поэтому кнопку не показываем.
  const canExport = useCanExport();

  const handleExportBtnClick = () => {
    openDialog(DialogsName.Export, { resource: 'item_category' });
  };

  return (
    <DashboardActionsBar>
      <NavbarGroup>
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="plus" />}
          text={<T id={'new_category'} />}
          onClick={onClickNewCategory}
        />
        <NavbarDivider />

        <AdvancedFilterPopover
          advancedFilterProps={{
            conditions: categoriesFilterConditions,
            defaultFieldKey: 'name',
            fields: fields,
            onFilterChange: (filterConditions: any) => {
              setItemsCategoriesTableState({ filterRoles: filterConditions });
            },
          }}
        >
          <DashboardFilterButton
            conditionsCount={categoriesFilterConditions?.length ?? 0}
          />
        </AdvancedFilterPopover>

        <If condition={itemCategoriesSelectedRows.length > 0}>
          <Button
            className={Classes.MINIMAL}
            icon={<Icon icon="trash-16" iconSize={16} />}
            text={<T id={'delete'} />}
            intent={Intent.DANGER}
            onClick={handelBulkDelete}
          />
        </If>

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

export default compose(
  withDialogActions,
  withItemCategories(
    ({ itemCategoriesSelectedRows, itemsCategoriesTableState }: any) => ({
      itemCategoriesSelectedRows,
      categoriesFilterConditions: itemsCategoriesTableState.filterRoles,
    }),
  ),
  withAlertActions,
  withItemCategoriesActions,
)(ItemsCategoryActionsBar);
