// @ts-nocheck
import intl from 'react-intl-universal';
import { FFormGroup, FeatureCan } from '@/components';
import { useCategorizeTransactionBoot } from './CategorizeTransactionBoot';
import { Features } from '@/constants';
import { BranchSuggestField } from '@/components/Branches/BranchSuggestField_';

export function CategorizeTransactionBranchField() {
  const { branches } = useCategorizeTransactionBoot();

  return (
    <FeatureCan feature={Features.Branches}>
      <FFormGroup name={'branchId'} label={intl.get('branch')} fastField inline>
        <BranchSuggestField
          name={'branchId'}
          items={branches}
          popoverProps={{ minimal: true }}
          fill
        />
      </FFormGroup>
    </FeatureCan>
  );
}
