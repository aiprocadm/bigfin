import React from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import classNames from 'classnames';
import { useFormikContext } from 'formik';
import { Classes, FormGroup, Position } from '@blueprintjs/core';
import {
  FFormGroup,
  FormattedMessage as T,
  FDateInput,
  FInputGroup,
  FTextArea,
  FSelect,
} from '@/components';
import { useAutofocus } from '@/hooks';
import {
  FieldRequiredHint,
  Col,
  Row,
  FeatureCan,
  BranchSelect,
  WarehouseSelect,
  FAccountsSuggestField,
} from '@/components';
import { momentFormatter, toSafeNumber } from '@/utils';
import { Features, CLASSES } from '@/constants';

import { useInventoryAdjContext } from './InventoryAdjustmentFormProvider';
import { useFeatureCan } from '@/hooks/state';

import InventoryAdjustmentQuantityFields from './InventoryAdjustmentQuantityFields';
import {
  diffQuantity,
  useSetPrimaryBranchToForm,
  useSetPrimaryWarehouseToForm,
  useGetAdjustmentTypeOptions,
} from './utils';

/**
 * Inventory adjustment form dialogs fields.
 */
export default function InventoryAdjustmentFormDialogFields() {
  // Features guard.
  const { featureCan } = useFeatureCan();

  // Retrieves memorized adjustment types options.
  const adjustmentTypes = useGetAdjustmentTypeOptions();

  const dateFieldRef = useAutofocus();

  // Inventory adjustment dialog context.
  const { accounts, branches, warehouses } = useInventoryAdjContext();
  const { values, setFieldValue } = useFormikContext<any>();

  // Sets the primary warehouse to form.
  useSetPrimaryWarehouseToForm();

  // Sets the primary branch to form.
  useSetPrimaryBranchToForm();

  // Handle adjustment type change.
  const handleAdjustmentTypeChange = (type: any) => {
    const result = diffQuantity(
      toSafeNumber(values.quantity),
      toSafeNumber(values.quantity_on_hand),
      type.value,
    );
    setFieldValue('type', type.value);
    setFieldValue('new_quantity', result);
  };

  return (
    <div className={Classes.DIALOG_BODY}>
      <Row>
        <FeatureCan feature={Features.Branches}>
          <Col xs={5}>
            <FormGroup
              label={<T id={'branch'} />}
            >
              <BranchSelect
                name={'branch_id'}
                branches={branches}
                popoverProps={{ minimal: true }}
              />
            </FormGroup>
          </Col>
        </FeatureCan>
        <FeatureCan feature={Features.Warehouses}>
          <Col xs={5}>
            <FormGroup
              label={<T id={'warehouse'} />}
            >
              <WarehouseSelect
                name={'warehouse_id'}
                warehouses={warehouses}
                popoverProps={{ minimal: true }}
              />
            </FormGroup>
          </Col>
        </FeatureCan>
      </Row>

      {featureCan(Features.Warehouses) && featureCan(Features.Branches) && (
        <FeatureRowDivider />
      )}

      <Row>
        <Col xs={5}>
          {/*------------ Date -----------*/}
          <FFormGroup
            name={'date'}
            label={<T id={'date'} />}
            labelInfo={<FieldRequiredHint />}
          >
            <FDateInput
              name={'date'}
              {...momentFormatter('YYYY/MM/DD')}
              popoverProps={{
                position: Position.BOTTOM,
                minimal: true,
              }}
              // Свойства `inputRef` у поля даты нет — оно молча падало на
              // пол, и курсор на поле не наводился. Ссылка передаётся через
              // `inputProps` (Д16 карты v84).
              inputProps={{
                inputRef: (ref: any) => (dateFieldRef.current = ref),
              }}
            />
          </FFormGroup>
        </Col>

        <Col xs={5}>
          {/*------------ Adjustment type -----------*/}
          <FFormGroup
            name={'type'}
            label={<T id={'adjustment_type'} />}
            labelInfo={<FieldRequiredHint />}
          >
            <FSelect
              name={'type'}
              items={adjustmentTypes}
              onItemChange={handleAdjustmentTypeChange}
              filterable={false}
              valueAccessor={'value'}
              textAccessor={'name'}
              popoverProps={{ minimal: true }}
            />
          </FFormGroup>
        </Col>
      </Row>

      <InventoryAdjustmentQuantityFields />

      {/*------------ Adjustment account -----------*/}
      <FFormGroup
        name={'adjustment_account_id'}
        label={<T id={'adjustment_account'} />}
        labelInfo={<FieldRequiredHint />}
      >
        <FAccountsSuggestField
          name={'adjustment_account_id'}
          items={accounts}
          inputProps={{
            placeholder: intl.get('select_adjustment_account'),
          }}
          fill
        />
      </FFormGroup>

      {/*------------ Reference -----------*/}
      <FFormGroup
        name={'reference_no'}
        label={<T id={'reference_no'} />}
      >
        <FInputGroup name={'reference_no'} fastField />
      </FFormGroup>

      {/*------------ Adjustment reasons -----------*/}
      <FFormGroup
        name={'reason'}
        label={<T id={'adjustment_reasons'} />}
        labelInfo={<FieldRequiredHint />}
      >
        <FTextArea name={'reason'} growVertically large fastField fill />
      </FFormGroup>
    </div>
  );
}

export const FeatureRowDivider = styled.div`
  --x-color-background: #e9e9e9;
  .bp4-dark & {
    --x-color-background: rgba(255, 255, 255, 0.1);
  }
  height: 2px;
  background: var(--x-color-background);
  margin-bottom: 15px;
`;
