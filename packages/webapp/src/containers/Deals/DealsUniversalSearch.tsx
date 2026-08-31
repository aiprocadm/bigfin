// © 2026 Bigfin
import intl from 'react-intl-universal';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { makeSectionSelectAction } from '@/containers/UniversalSearch/sectionSearchBind';

const DealUniversalSearchSelect = makeSectionSelectAction(
  RESOURCES_TYPES.DEAL,
  '/deals',
);

/** Сделку узнают по названию; справа — её состояние. */
const dealsToSearch = (deal: any) => ({
  id: deal.id,
  text: deal.name,
  label: intl.get(`deals.status.${deal.status}`),
  reference: deal,
});

export const universalSearchDealBind = () => ({
  resourceType: RESOURCES_TYPES.DEAL,
  optionItemLabel: intl.get('deals.page_title'),
  selectItemAction: DealUniversalSearchSelect,
  itemSelect: dealsToSearch,
});
