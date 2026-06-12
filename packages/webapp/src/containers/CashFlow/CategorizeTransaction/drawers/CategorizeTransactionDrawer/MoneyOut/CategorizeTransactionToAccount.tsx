// @ts-nocheck
import intl from 'react-intl-universal';
import { Position } from '@blueprintjs/core';
import {
  AccountsSelect,
  FDateInput,
  FFormGroup,
  FInputGroup,
  FTextArea,
  Icon,
} from '@/components';
import { useCategorizeTransactionBoot } from '../CategorizeTransactionBoot';
import { CategorizeTransactionBranchField } from '../CategorizeTransactionBranchField';

export default function CategorizeTransactionToAccount() {
  const { accounts } = useCategorizeTransactionBoot();

  return (
    <>
      <FFormGroup name={'date'} label={intl.get('date')} fastField inline>
        <FDateInput
          name={'date'}
          popoverProps={{ position: Position.BOTTOM, minimal: true }}
          formatDate={(date) => date.toLocaleDateString()}
          parseDate={(str) => new Date(str)}
          inputProps={{ fill: true, leftElement: <Icon icon={'date-range'} /> }}
        />
      </FFormGroup>

      <FFormGroup
        name={'debitAccountId'}
        label={intl.get('cashflow.label.from_account')}
        fastField
        inline
      >
        <AccountsSelect
          name={'debitAccountId'}
          items={accounts}
          fastField
          fill
          allowCreate
          disabled
        />
      </FFormGroup>

      <FFormGroup
        name={'creditAccountId'}
        label={intl.get('cashflow.label.to_account')}
        fastField
        inline
      >
        <AccountsSelect
          name={'creditAccountId'}
          items={accounts}
          filterByRootTypes={['asset']}
          fastField
          fill
          allowCreate
        />
      </FFormGroup>

      <FFormGroup name={'referenceNo'} label={intl.get('reference_no')} fastField inline>
        <FInputGroup name={'reference_no'} fill />
      </FFormGroup>

      <FFormGroup name={'description'} label={intl.get('description')} fastField inline>
        <FTextArea
          name={'description'}
          growVertically={true}
          large={true}
          fill={true}
        />
      </FFormGroup>

      <CategorizeTransactionBranchField />
    </>
  );
}
