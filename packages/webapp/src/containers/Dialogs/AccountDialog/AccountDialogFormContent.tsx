// @ts-nocheck
import React from 'react';
import { Form, useFormikContext } from 'formik';
import { Button, Classes, FormGroup, Intent } from '@blueprintjs/core';
import {
  If,
  FieldRequiredHint,
  Hint,
  AccountsSelect,
  AccountsTypesSelect,
  CurrencySelect,
  FormattedMessage as T,
  FFormGroup,
  FInputGroup,
  FCheckbox,
  FTextArea,
} from '@/components';
import { withAccounts } from '@/containers/Accounts/withAccounts';

import { FOREIGN_CURRENCY_ACCOUNTS } from '@/constants/accountTypes';

import { useAutofocus } from '@/hooks';
import { useAccountDialogContext } from './AccountDialogProvider';

import { parentAccountShouldUpdate } from './utils';
import { compose } from '@/utils';

/**
 * Account form dialogs fields.
 */
function AccountFormDialogFields({
  // #ownProps
  onClose,
  action,
}) {
  const { values, isSubmitting, setFieldValue } = useFormikContext<any>();
  const accountNameFieldRef = useAutofocus();

  // Account form context.
  const { fieldsDisabled, accounts, accountsTypes, currencies } =
    useAccountDialogContext();

  return (
    <Form>
      <div className={Classes.DIALOG_BODY}>
        <FFormGroup
          inline={true}
          label={<T id={'account_type'} />}
          labelInfo={<FieldRequiredHint />}
          name={'account_type'}
        >
          <AccountsTypesSelect
            name={'account_type'}
            items={accountsTypes}
            onItemSelect={(accountType) => {
              setFieldValue('account_type', accountType.key);
              setFieldValue('currency_code', '');
            }}
            disabled={fieldsDisabled.accountType}
            popoverProps={{ minimal: true }}
            fastField={true}
            fill={true}
          />
        </FFormGroup>

        <FFormGroup
          name={'name'}
          label={<T id={'account_name'} />}
          labelInfo={<FieldRequiredHint />}
          inline={true}
        >
          <FInputGroup
            inputRef={(ref) => (accountNameFieldRef.current = ref)}
            name={'name'}
            fastField={true}
          />
        </FFormGroup>

        <FFormGroup
          label={<T id={'account_code'} />}
          name={'code'}
          labelInfo={<Hint content={<T id="account_code_hint" />} />}
          inline={true}
        >
          <FInputGroup name={'code'} fastField={true} />
        </FFormGroup>

        <FFormGroup
          label={' '}
          name={'subaccount'}
          inline={true}
        >
          <FCheckbox
            inline={true}
            label={<T id={'sub_account'} />}
            name={'subaccount'}
            fastField={true}
          />
        </FFormGroup>

        {values.subaccount && (
          <FFormGroup
            name={'parent_account_id'}
            label={<T id={'parent_account'} />}
            inline={true}
          >
            <AccountsSelect
              name={'parent_account_id'}
              items={accounts}
              shouldUpdate={parentAccountShouldUpdate}
              placeholder={<T id={'select_parent_account'} />}
              filterByTypes={values.account_type}
              buttonProps={{ disabled: !values.subaccount }}
              fastField={true}
              fill={true}
              allowCreate={true}
            />
          </FFormGroup>
        )}

        <If condition={FOREIGN_CURRENCY_ACCOUNTS.includes(values.account_type)}>
          {/*------------ Currency  -----------*/}
          <FFormGroup
            label={<T id={'currency'} />}
            name={'currency_code'}
            inline={true}
          >
            <CurrencySelect
              name={'currency_code'}
              currencies={currencies}
              popoverProps={{ minimal: true }}
              fastField={true}
              fill={true}
            />
          </FFormGroup>
        </If>

        <FFormGroup
          label={<T id={'description'} />}
          name={'description'}
          inline={true}
        >
          <FTextArea
            name={'description'}
            growVertically={true}
            height={280}
            fill={true}
            fastField={true}
          />
        </FFormGroup>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            disabled={isSubmitting}
            onClick={onClose}
            style={{ minWidth: '75px' }}
          >
            <T id={'close'} />
          </Button>

          <Button
            intent={Intent.PRIMARY}
            loading={isSubmitting}
            style={{ minWidth: '95px' }}
            type="submit"
          >
            {action === 'edit' ? <T id={'edit'} /> : <T id={'submit'} />}
          </Button>
        </div>
      </div>
    </Form>
  );
}

export default compose(
  withAccounts(({ accountsTypes, accountsList }) => ({
    accountsTypes,
    accounts: accountsList,
  })),
)(AccountFormDialogFields);
