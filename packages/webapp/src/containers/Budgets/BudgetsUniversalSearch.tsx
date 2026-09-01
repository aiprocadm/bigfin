// © 2026 Bigfin
import intl from 'react-intl-universal';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { makeSectionSelectAction } from '@/containers/UniversalSearch/sectionSearchBind';

const BudgetUniversalSearchSelect = makeSectionSelectAction(
  RESOURCES_TYPES.BUDGET,
  '/budgets',
);

/** Бюджет узнают по названию; справа — финансовый год. */
const budgetsToSearch = (budget: any) => ({
  id: budget.id,
  text: budget.name,
  label: String(budget.fiscalYear ?? ''),
  reference: budget,
});

export const universalSearchBudgetBind = () => ({
  resourceType: RESOURCES_TYPES.BUDGET,
  optionItemLabel: intl.get('budgets.page_title'),
  selectItemAction: BudgetUniversalSearchSelect,
  itemSelect: budgetsToSearch,
});
