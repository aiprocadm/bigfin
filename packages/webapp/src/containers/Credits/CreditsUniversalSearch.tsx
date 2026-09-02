// © 2026 Bigfin
import intl from 'react-intl-universal';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { makeSectionSelectAction } from '@/containers/UniversalSearch/sectionSearchBind';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const CreditUniversalSearchSelect = makeSectionSelectAction(
  RESOURCES_TYPES.CREDIT,
  '/credits',
);

/** Кредит узнают по названию; справа — остаток долга. */
const creditsToSearch = (credit: any) => ({
  id: credit.id,
  text: credit.name,
  label: formatOrganizationMoney(Number(credit.outstandingPrincipal) || 0),
  reference: credit,
});

export const universalSearchCreditBind = () => ({
  resourceType: RESOURCES_TYPES.CREDIT,
  optionItemLabel: intl.get('credits.page.title'),
  selectItemAction: CreditUniversalSearchSelect,
  itemSelect: creditsToSearch,
});
