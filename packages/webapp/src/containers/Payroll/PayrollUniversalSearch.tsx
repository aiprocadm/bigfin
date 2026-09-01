// © 2026 Bigfin
import intl from 'react-intl-universal';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { makeSectionSelectAction } from '@/containers/UniversalSearch/sectionSearchBind';

const EmployeeUniversalSearchSelect = makeSectionSelectAction(
  RESOURCES_TYPES.EMPLOYEE,
  '/payroll',
);

/** Сотрудника узнают по имени; справа — должность, если она указана. */
const employeesToSearch = (employee: any) => ({
  id: employee.id,
  text: employee.fullName,
  label: employee.position ?? '',
  reference: employee,
});

export const universalSearchEmployeeBind = () => ({
  resourceType: RESOURCES_TYPES.EMPLOYEE,
  optionItemLabel: intl.get('payroll.page_title'),
  selectItemAction: EmployeeUniversalSearchSelect,
  itemSelect: employeesToSearch,
});
