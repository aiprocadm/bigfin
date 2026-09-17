import {
  NavbarGroup,
  NavbarDivider,
  Button,
  Classes,
} from '@blueprintjs/core';
import {
  Icon,
  FormattedMessage as T,
  AdvancedFilterPopover,
  DashboardFilterButton,
  DashboardActionsBar,
} from '@/components';

import { withItemCategories } from './withItemCategories';
import { withItemCategoriesActions } from './withItemCategoriesActions';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';

import { compose } from '@/utils';
import { useItemsCategoriesContext } from './ItemsCategoriesProvider';
import { useHistory } from 'react-router-dom';
import { DialogsName } from '@/constants/dialogs';

/**
 * Items categories actions bar.
 */
function ItemsCategoryActionsBar({
  // #withItemCategories
  categoriesFilterConditions,

  //
  setItemsCategoriesTableState,

  // #withDialog
  openDialog,
}: {
  categoriesFilterConditions?: any[];
  setItemsCategoriesTableState: (state: any) => void;
  openDialog: (name: string, payload?: any) => void;
}) {
  const { fields } = useItemsCategoriesContext();
  const history = useHistory();

  const onClickNewCategory = () => {
    openDialog('item-category-form', {});
  };

  const handleImportBtnClick = () => {
    history.push('/item/categories/import');
  };

  // Handle the export button click.
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

        {/*
          Здесь была кнопка «удалить выбранные». Она не работала никогда:
          выделение строк категорий нигде не хранится, предупреждение
          `item-categories-bulk-delete` не было записано в реестр, действие
          `requestDeleteBulkItemCategories` не существует, а на сервере нет
          ручки массового удаления категорий — только по одной (Д3 карты v88).
        */}
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="file-import-16" iconSize={16} />}
          text={<T id={'import'} />}
          onClick={handleImportBtnClick}
        />
        <Button
          className={Classes.MINIMAL}
          icon={<Icon icon="file-export-16" iconSize={16} />}
          text={<T id={'export'} />}
          onClick={handleExportBtnClick}
        />
      </NavbarGroup>
    </DashboardActionsBar>
  );
}

export default compose(
  withDialogActions,
  withItemCategories(({ itemsCategoriesTableState }: any) => ({
    categoriesFilterConditions: itemsCategoriesTableState.filterRoles,
  })),
  withItemCategoriesActions,
)(ItemsCategoryActionsBar);
