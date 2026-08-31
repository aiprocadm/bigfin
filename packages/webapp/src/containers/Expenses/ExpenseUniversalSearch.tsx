// @ts-nocheck
import intl from 'react-intl-universal';
import { AbilitySubject, ExpenseAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';

/**
 * Universal search bill item select action.
 */
function ExpenseUniversalSearchItemSelectComponent({
  // #ownProps
  resourceType,
  resourceId,

  // #withDrawerActions
  openDrawer,
}) {
  if (resourceType === RESOURCES_TYPES.EXPENSE) {
    openDrawer(DRAWERS.EXPENSE_DETAILS, { expenseId: resourceId });
  }
  return null;
}

export const ExpenseUniversalSearchItemSelect = withDrawerActions(
  ExpenseUniversalSearchItemSelectComponent,
);

/**
 * К2 карты v41. Строка расхода в окне поиска.
 *
 * У расхода нет номера, как у документов, — человек узнаёт его по ссылке
 * и сумме. Если ссылки нет, показываем дату: пустая строка в списке
 * результатов ничего не говорит.
 */
const expensesToSearch = (expense) => ({
  id: expense.id,
  text: expense.reference_no || expense.formatted_date,
  label: expense.formatted_amount,
  reference: expense,
});

/**
 * Binds universal search expense configure.
 */
export const universalSearchExpenseBind = () => ({
  resourceType: RESOURCES_TYPES.EXPENSE,
  optionItemLabel: intl.get('expenses'),
  selectItemAction: ExpenseUniversalSearchItemSelect,
  itemSelect: expensesToSearch,
  permission: {
    ability: ExpenseAction.View,
    subject: AbilitySubject.Expense,
  },
});
