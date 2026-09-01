// © 2026 Bigfin
import intl from 'react-intl-universal';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { makeSectionSelectAction } from '@/containers/UniversalSearch/sectionSearchBind';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const PlannedOperationUniversalSearchSelect = makeSectionSelectAction(
  RESOURCES_TYPES.PLANNED_OPERATION,
  '/payment-calendar',
);

/**
 * Плановую операцию узнают по описанию; справа — сумма. Описание
 * необязательно, поэтому пустое подменяется плановой датой: строка без
 * текста в списке результатов ничего не говорит.
 */
const plannedOperationsToSearch = (operation: any) => ({
  id: operation.id,
  text: operation.description || operation.plannedDate,
  label: formatOrganizationMoney(Number(operation.amount) || 0),
  reference: operation,
});

export const universalSearchPlannedOperationBind = () => ({
  resourceType: RESOURCES_TYPES.PLANNED_OPERATION,
  optionItemLabel: intl.get('payment_calendar.page_title'),
  selectItemAction: PlannedOperationUniversalSearchSelect,
  itemSelect: plannedOperationsToSearch,
});
