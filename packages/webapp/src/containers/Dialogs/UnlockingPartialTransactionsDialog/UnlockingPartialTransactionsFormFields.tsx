import React from 'react';
import { Classes, Position } from '@blueprintjs/core';
import classNames from 'classnames';
import { CLASSES } from '@/constants/classes';
import {
  FieldRequiredHint,
  Col,
  Row,
  FormattedMessage as T,
  FFormGroup,
  FDateInput,
  FTextArea,
} from '@/components';
import { momentFormatter } from '@/utils';
import { useAutofocus } from '@/hooks';

/**
 * Parial Unlocking transactions form fields.
 */
export default function UnlockingPartialTransactionsFormFields() {
  const reasonFieldRef = useAutofocus();

  return (
    <div className={Classes.DIALOG_BODY}>
      <Row>
        <Col xs={6}>
          {/*------------  Unlocking from date  -----------*/}
          <FFormGroup
            name={'unlock_from_date'}
            label={<T id={'unlocking_partial_transactions.dialog.from_date'} />}
            labelInfo={<FieldRequiredHint />}
          >
            <FDateInput
              name={'unlock_from_date'}
              {...momentFormatter('YYYY/MM/DD')}
              popoverProps={{
                position: Position.BOTTOM,
                minimal: true,
              }}
            />
          </FFormGroup>
        </Col>

        <Col xs={6}>
          {/*------------  Unlocking to date  -----------*/}
          <FFormGroup
            name={'unlock_to_date'}
            label={<T id={'unlocking_partial_transactions.dialog.to_date'} />}
            labelInfo={<FieldRequiredHint />}
          >
            <FDateInput
              name={'unlock_to_date'}
              {...momentFormatter('YYYY/MM/DD')}
              popoverProps={{
                position: Position.BOTTOM,
                minimal: true,
              }}
            />
          </FFormGroup>
        </Col>
      </Row>

      {/*------------ unLocking  reason -----------*/}
      <FFormGroup
        name={'reason'}
        label={<T id={'unlocking_partial_transactions.dialog.reason'} />}
        labelInfo={<FieldRequiredHint />}
      >
        <FTextArea
          name={'reason'}
          growVertically={true}
          large={true}
          inputRef={(ref) => (reasonFieldRef.current = ref)}
          fill
          fastField
        />
      </FFormGroup>
    </div>
  );
}
