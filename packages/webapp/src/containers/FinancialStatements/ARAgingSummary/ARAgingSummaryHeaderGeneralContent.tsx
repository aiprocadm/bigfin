import React from 'react';
import intl from 'react-intl-universal';
import { Position } from '@blueprintjs/core';
import FinancialStatementsFilter from '../FinancialStatementsFilter';
import {
  FormattedMessage as T,
  Row,
  Col,
  FieldHint,
  FInputGroup,
  FFormGroup,
  CustomersMultiSelect,
  FDateInput,
} from '@/components';
import { momentFormatter } from '@/utils';
import { useARAgingSummaryGeneralContext } from './ARAgingSummaryGeneralProvider';
import { filterCustomersOptions } from './constants';

/**
 * AR Aging Summary - Drawer Header - General Fields.
 */
export default function ARAgingSummaryHeaderGeneralContent() {
  // AR Aging summary context.
  const { customers } = useARAgingSummaryGeneralContext();

  return (
    <div>
      <Row>
        <Col xs={5}>
          <FFormGroup
            name={'asDate'}
            label={<T id={'as_date'} />}
            labelInfo={<FieldHint content={intl.get('as_date.hint')} />}
          >
            <FDateInput
              name={'asDate'}
              {...momentFormatter('YYYY/MM/DD')}
              popoverProps={{ position: Position.BOTTOM_LEFT, minimal: true }}
              fill
            />
          </FFormGroup>
        </Col>
      </Row>

      <Row>
        <Col xs={5}>
          <FFormGroup
            name={'agingDaysBefore'}
            label={<T id={'aging_before_days'} />}
            labelInfo={<FieldHint content={intl.get('aging_before_days.hint')} />}
          >
            <FInputGroup name={'agingDaysBefore'} fastField />
          </FFormGroup>
        </Col>
      </Row>

      <Row>
        <Col xs={5}>
          <FFormGroup
            name={'agingPeriods'}
            label={<T id={'aging_periods'} />}
            labelInfo={<FieldHint content={intl.get('aging_periods.hint')} />}
          >
            <FInputGroup name={'agingPeriods'}/>
          </FFormGroup>
        </Col>
      </Row>

      <Row>
        <Col xs={5}>
          <FinancialStatementsFilter
            items={filterCustomersOptions}
            label={<T id={'AR_aging_summary.filter_options.label'} />}
          />
        </Col>
      </Row>

      <Row>
        <Col xs={5}>
          <FFormGroup
            name="customersIds"
            label={<T id={'specific_customers'} />}
          >
            <CustomersMultiSelect name="customersIds" items={customers} />
          </FFormGroup>
        </Col>
      </Row>
    </div>
  );
}
