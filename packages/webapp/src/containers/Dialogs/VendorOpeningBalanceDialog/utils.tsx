import React from 'react';
import { useFormikContext } from 'formik';
import { first, pick } from 'lodash';

import { useVendorOpeningBalanceContext } from './VendorOpeningBalanceFormProvider';

export const useSetPrimaryBranchToForm = () => {
  const { setFieldValue } = useFormikContext<any>();
  const { branches, isBranchesSuccess } = useVendorOpeningBalanceContext();

  React.useEffect(() => {
    if (isBranchesSuccess) {
      const primaryBranch = branches.find((b: any) => b.primary) || first(branches);

      if (primaryBranch) {
        setFieldValue('opening_balance_branch_id', primaryBranch.id);
      }
    }
  }, [isBranchesSuccess, setFieldValue, branches]);
};

export function transfromVendorToForm(values: any) {
  return {
    ...pick(values, [
      'id',
      'opening_balance',
      'opening_balance_exchange_rate',
      'currency_code',
    ]),
  };
}
