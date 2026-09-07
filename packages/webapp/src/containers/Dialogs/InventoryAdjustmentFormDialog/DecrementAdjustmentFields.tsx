// @ts-nocheck
import React from 'react';
import { Field, ErrorMessage, FastField, useFormikContext } from 'formik';
import { FormGroup, InputGroup } from '@blueprintjs/core';
import { inputIntent, toSafeNumber } from '@/utils';
import {
  Row,
  Col,
  MoneyInputGroup,
  FormattedMessage as T,
  FMoneyInputGroup,
  FFormGroup,
  FInputGroup,
} from '@/components';
import { useAutofocus } from '@/hooks';
import { decrementQuantity } from './utils';

/**
 * Decrement adjustment fields.
 */
function DecrementAdjustmentFields() {
  const decrementFieldRef = useAutofocus();
  const { values, setFieldValue } = useFormikContext<any>();

  return (
    <Row className={'row--decrement-fields'}>
      {/*------------ Quantity on hand  -----------*/}
      <Col className={'col--quantity-on-hand'}>
        <FFormGroup name={'quantity_on_hand'} label={<T id={'qty_on_hand'} />}>
          <FInputGroup
            name={'quantity_on_hand'}
            disabled={true}
          />
        </FFormGroup>
      </Col>

      <Col className={'col--sign'}>
        <span>–</span>
      </Col>

      {/*------------ Decrement -----------*/}
      <Col className={'col--decrement'}>
        <FFormGroup name={'quantity'} label={<T id={'decrement'} />}>
          <FMoneyInputGroup
            name={'quantity'}
            allowDecimals={false}
            allowNegativeValue={true}
            inputRef={(ref) => (decrementFieldRef.current = ref)}
            onBlurValue={(value) => {
              setFieldValue(
                'new_quantity',
                decrementQuantity(
                  toSafeNumber(value),
                  toSafeNumber(values.quantity_on_hand),
                ),
              );
            }}
          />
        </FFormGroup>
      </Col>

      <Col className={'col--sign'}>
        <span>=</span>
      </Col>
      {/*------------ New quantity -----------*/}
      <Col className={'col--quantity'}>
        <FFormGroup
          name={'new_quantity'}
          label={<T id={'new_quantity'} />}
        >
          <FMoneyInputGroup
            name={'new_quantity'}
            allowDecimals={false}
            allowNegativeValue={true}
            onBlurValue={(value) => {
              setFieldValue(
                'quantity',
                decrementQuantity(
                  toSafeNumber(value),
                  toSafeNumber(values.quantity_on_hand),
                ),
              );
            }}
          />
        </FFormGroup>
      </Col>
    </Row>
  );
}

export default DecrementAdjustmentFields;
