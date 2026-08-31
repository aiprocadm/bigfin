// © 2026 Bigfin
import intl from 'react-intl-universal';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { makeSectionSelectAction } from '@/containers/UniversalSearch/sectionSearchBind';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const FixedAssetUniversalSearchSelect = makeSectionSelectAction(
  RESOURCES_TYPES.FIXED_ASSET,
  '/fixed-assets',
);

/** Объект узнают по названию; справа — остаточная стоимость. */
const fixedAssetsToSearch = (asset: any) => ({
  id: asset.id,
  text: asset.name,
  label: formatOrganizationMoney(Number(asset.netValue) || 0),
  reference: asset,
});

export const universalSearchFixedAssetBind = () => ({
  resourceType: RESOURCES_TYPES.FIXED_ASSET,
  optionItemLabel: intl.get('fixed_assets.page.title'),
  selectItemAction: FixedAssetUniversalSearchSelect,
  itemSelect: fixedAssetsToSearch,
});
