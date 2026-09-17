import React, { useMemo } from 'react';
import intl from 'react-intl-universal';
import { formatOrganizationDate } from '@/utils/organizationDate';
import classNames from 'classnames';
import styled from 'styled-components';
import {
  Position,
  Classes,
  ControlGroup,
  Button,
} from '@blueprintjs/core';
import { isEmpty, toSafeInteger } from 'lodash';
import { useFormikContext } from 'formik';
import { css } from '@emotion/css';
import { Theme, useTheme } from '@emotion/react';

import {
  FeatureCan,
  CustomersSelect,
  FormattedMessage as T,
  FMoneyInputGroup,
  FInputGroup,
  Stack,
  FDateInput,
} from '@/components';
import { safeSumBy } from '@/utils';
import {
  FFormGroup,
  AccountsSelect,
  FieldRequiredHint,
  Icon,
  InputPrependText,
  CustomerDrawerLink,
  Hint,
  Money,
} from '@/components';
import { usePaymentReceiveFormContext } from './PaymentReceiveFormProvider';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { ProjectsSelect } from '@/containers/Projects/components';
import {
  PaymentReceiveExchangeRateInputField,
  PaymentReceiveProjectSelectButton,
} from './components';

import {
  amountPaymentEntries,
  fullAmountPaymentEntries,
  customersFieldShouldUpdate,
  accountsFieldShouldUpdate,
} from './utils';
import { Features } from '@/constants';
import { PaymentReceivePaymentNoField } from './PaymentReceivePaymentNoField';

const getHeaderFieldsStyle = (theme: Theme) => css`
  .${theme.bpPrefix}-form-group {
    margin-bottom: 0;

    &.${theme.bpPrefix}-inline {
      max-width: 470px;
    }
    .${theme.bpPrefix}-label {
      min-width: 160px;
    }
    .${theme.bpPrefix}-form-content {
      width: 100%;
    }
  }
`;

/**
 * Payment receive header fields.
 */
export default function PaymentReceiveHeaderFields() {
  const theme = useTheme();
  const styleClassName = getHeaderFieldsStyle(theme);

  // Payment receive form context.
  const { accounts, projects } = usePaymentReceiveFormContext();

  // Formik form context.
  const {
    values: { entries, currency_code },
    setFieldValue,
  } = useFormikContext<any>();

  // Calculates the full-amount received.
  const totalDueAmount = useMemo(
    () => safeSumBy(entries, 'due_amount'),
    [entries],
  );
  // Handle receive full-amount link click.
  const handleReceiveFullAmountClick = () => {
    const newEntries = fullAmountPaymentEntries(entries);
    const fullAmount = safeSumBy(newEntries, 'payment_amount');

    setFieldValue('entries', newEntries);
    setFieldValue('amount', fullAmount);
  };
  // Handles the full-amount field blur.
  const onFullAmountBlur = (value: any) => {
    const newEntries = amountPaymentEntries(toSafeInteger(value), entries);
    setFieldValue('entries', newEntries);
  };

  return (
    <Stack spacing={18} flex={1} className={styleClassName}>
      {/* ------------- Customer name ------------- */}
      <PaymentReceiveCustomerSelect />

      {/* ----------- Exchange rate ----------- */}
      <PaymentReceiveExchangeRateInputField
        name={'exchange_rate'}
        formGroupProps={{ label: ' ', inline: true }}
      />

      {/* ------------- Payment date ------------- */}
      <FFormGroup
        name={'payment_date'}
        label={<T id={'payment_date'} />}
        labelInfo={<FieldRequiredHint />}
        inline
      >
        <FDateInput
          name={'payment_date'}
          formatDate={formatOrganizationDate}
          parseDate={(str) => new Date(str)}
          popoverProps={{ position: Position.BOTTOM_LEFT, minimal: true }}
          inputProps={{
            leftIcon: <Icon icon={'date-range'} />,
            fill: true,
          }}
          fill
        />
      </FFormGroup>

      {/* ------------ Full amount ------------ */}
      <FFormGroup
        name={'amount'}
        label={<T id={'full_amount'} />}
        inline={true}
        labelInfo={<Hint content={intl.get('payment_receive.full_amount.hint')} />}
      >
        {/*
          Пакет объявляет у группы полей ровно одного ребёнка, хотя передаёт
          их насквозь. Собираем в один прозрачный узел — разметка та же
          (Д19 карты v88).
        */}
        <>
        <ControlGroup>
          <InputPrependText text={currency_code} />
          <FMoneyInputGroup
            name={'amount'}
            onBlurValue={onFullAmountBlur}
            fastField
          />
        </ControlGroup>

        {!isEmpty(entries) && (
          <Button
            onClick={handleReceiveFullAmountClick}
            className={css`
              &:not([class*='${theme.bpPrefix}-intent-']) {
                &.${theme.bpPrefix}-minimal {
                  width: auto;
                  padding: 0;
                  min-height: auto;
                  font-size: 12px;
                  margin-top: 4px;
                  background-color: transparent;
                  color: #0052cc;

                  &:hover {
                    text-decoration: underline;
                  }
                }
              }
            `}
            small
            minimal
          >
            <T id={'receive_full_amount'} /> (
            <Money amount={totalDueAmount} currency={currency_code} />)
          </Button>
        )}
        </>
      </FFormGroup>

      {/* ------------ Payment receive no. ------------ */}
      <PaymentReceivePaymentNoField />

      {/* ------------ Deposit account ------------ */}
      <FFormGroup
        name={'deposit_account_id'}
        label={<T id={'deposit_to'} />}
        inline={true}
        labelInfo={<FieldRequiredHint />}
      >
        <AccountsSelect
          name={'deposit_account_id'}
          items={accounts}
          labelInfo={<FieldRequiredHint />}
          placeholder={<T id={'select_deposit_account'} />}
          filterByTypes={[
            ACCOUNT_TYPE.CASH,
            ACCOUNT_TYPE.BANK,
            ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
          ]}
          fill={true}
        />
      </FFormGroup>

      {/* ------------ Reference No. ------------ */}
      <FFormGroup
        name={'reference_no'}
        label={<T id={'reference'} />}
        inline
      >
        {/*
          Здесь стояло обычное поле ввода Blueprint: обёртка `FFormGroup`
          детей с формой НЕ связывает (она только рисует метку и ошибку), а
          `fastField` это поле не читает вовсе. Введённая ссылка никуда не
          попадала — ни при создании, ни при правке, хотя поле есть и в
          начальных значениях, и в схеме проверки, и на сервере
          (Д18 карты v88).
        */}
        <FInputGroup name={'reference_no'} fastField />
      </FFormGroup>

      {/*------------ Project name -----------*/}
      <FeatureCan feature={Features.Projects}>
        <FFormGroup
          name={'project_id'}
          label={<T id={'payment_receive.project_name.label'} />}
          inline={true}
          className={classNames('form-group--select-list', Classes.FILL)}
        >
          <ProjectsSelect
            name={'project_id'}
            projects={projects}
            input={PaymentReceiveProjectSelectButton}
            popoverFill={true}
          />
        </FFormGroup>
      </FeatureCan>
    </Stack>
  );
}

const CustomerButtonLink = styled(CustomerDrawerLink)`
  font-size: 11px;
  margin-top: 6px;
`;

/**
 * Customer select field of payment receive form.
 * @returns {React.ReactNode}
 */
function PaymentReceiveCustomerSelect() {
  // Payment receive form context.
  const { customers, isNewMode } = usePaymentReceiveFormContext();

  // Formik form context.
  const { values, setFieldValue } = useFormikContext<any>();

  return (
    <FFormGroup
      label={<T id={'customer_name'} />}
      inline={true}
      labelInfo={<FieldRequiredHint />}
      name={'customer_id'}
    >
      <>
      <CustomersSelect
        name={'customer_id'}
        items={customers}
        placeholder={<T id={'select_customer_account'} />}
        onItemChange={(customer: any) => {
          setFieldValue('customer_id', customer.id);
          setFieldValue('full_amount', '');
          setFieldValue('currency_code', customer?.currency_code);
        }}
        popoverFill={true}
        disabled={!isNewMode}
        allowCreate={true}
      />
      {values.customer_id && (
        <CustomerButtonLink customerId={values.customer_id}>
          <T id={'view_customer_details'} />
        </CustomerButtonLink>
      )}
      </>
    </FFormGroup>
  );
}
