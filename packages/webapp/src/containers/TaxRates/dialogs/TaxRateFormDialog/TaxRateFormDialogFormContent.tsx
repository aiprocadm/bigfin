// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { useFormikContext } from 'formik';
import { Tag, Text } from '@blueprintjs/core';
import styled from 'styled-components';
import { FCheckbox, FFormGroup, FInputGroup, Hint } from '@/components';
import { transformTaxRateCodeValue, useIsTaxRateChanged } from './utils';
import { useTaxRateFormDialogContext } from './TaxRateFormDialogBoot';

/**
 * Tax rate form content.
 * @returns {JSX.Element}
 */
export default function TaxRateFormDialogContent() {
  return (
    <div>
      <FFormGroup
        name={'name'}
        label={intl.get('tax_rates.label.name')}
        labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
        subLabel={
          'The name as you would like it to appear in customers invoices.'
        }
        fastField={true}
      >
        <FInputGroup name={'name'} fastField={true} />
      </FFormGroup>

      <TaxRateCodeField />
      <FFormGroup
        name={'rate'}
        label={intl.get('tax_rates.label.rate')}
        labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
        fastField={true}
      >
        <RateFormGroup
          name={'rate'}
          rightElement={<Tag minimal>%</Tag>}
          fill={false}
          fastField={true}
        />
      </FFormGroup>

      <FFormGroup
        name={'description'}
        label={intl.get('description')}
        labelInfo={
          <Hint content="This description is for internal use only and will not be visiable to your customers." />
        }
        fastField={true}
      >
        <FInputGroup name={'description'} fastField={true} />
      </FFormGroup>

      <CompoundFormGroup name={'is_compound'} fastField={true}>
        <FCheckbox
          label={intl.get('tax_rates.label.is_compound')}
          name={'is_compound'}
          fastField={true}
        />
      </CompoundFormGroup>

      <CompoundFormGroup name={'is_non_recoverable'} fastField={true}>
        <FCheckbox
          label={intl.get('tax_rates.label.is_non_recoverable')}
          name={'is_non_recoverable'}
          fastField={true}
        />
      </CompoundFormGroup>

      <ConfirmEditingTaxRate />
    </div>
  );
}

/**
 * Tax rate code input group
 * @returns {JSX.Element}
 */
function TaxRateCodeField() {
  const { setFieldValue } = useFormikContext();

  // Handle the field change.
  const handleChange = (event) => {
    const transformedValue = transformTaxRateCodeValue(event.target.value);
    setFieldValue('code', transformedValue);
  };

  return (
    <FFormGroup
      name={'code'}
      label={intl.get('code')}
      labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
      fastField={true}
    >
      <FInputGroup name={'code'} fastField={true} onChange={handleChange} />
    </FFormGroup>
  );
}

function ConfirmEditingTaxRate() {
  const isTaxRateChanged = useIsTaxRateChanged();
  const { isNewMode } = useTaxRateFormDialogContext();

  // Can't continue if it is new mode or tax rate not changed.
  if (!isTaxRateChanged || isNewMode) return null;

  return (
    <EditWarningWrap>
      <Text color={'#766f58'}>{intl.get('tax_rates.form.please_note')}</Text>
      <ConfirmEditFormGroup name={'confirm_edit'} helperText={''}>
        <FCheckbox
          name={'confirm_edit'}
          label={`I understand that updating the
          tax will mark the existing tax inactive, create a new tax, and update
          it in the chosen transactions.`}
        />
      </ConfirmEditFormGroup>
    </EditWarningWrap>
  );
}

const RateFormGroup = styled(FInputGroup)`
  max-width: 100px;
`;

const CompoundFormGroup = styled(FFormGroup)`
  margin-bottom: 0;
`;

const EditWarningWrap = styled(`div`)`
  background: #fcf8ec;
  margin-left: -20px;
  margin-right: -20px;
  padding: 14px 20px;
  font-size: 13px;
  margin-top: 8px;
  border-top: 1px solid #f2eddf;
  border-bottom: 1px solid #f2eddf;
`;

const ConfirmEditFormGroup = styled(FFormGroup)`
  margin-bottom: 0;
`;
