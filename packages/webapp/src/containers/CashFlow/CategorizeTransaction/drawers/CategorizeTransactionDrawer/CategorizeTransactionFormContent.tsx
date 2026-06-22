// @ts-nocheck
import intl from 'react-intl-universal';
import React from 'react';
import styled from 'styled-components';
import { Button, FormGroup, Intent, Tag } from '@blueprintjs/core';
import { useQueryClient } from 'react-query';
import { AppToaster, Box, FFormGroup, FSelect } from '@/components';
import { ContactSelectField } from '@/components/Contacts/ContactSelectField';
import { getAddMoneyInOptions, getAddMoneyOutOptions } from '@/constants';
import { useFormikContext } from 'formik';
import { useCreateCustomer, useCreateVendor } from '@/hooks/query';
import { useCurrentOrganization } from '@/hooks/state';
import { useCategorizeTransactionTabsBoot } from '@/containers/CashFlow/CategorizeTransactionAside/CategorizeTransactionTabsBoot';
import { useCategorizeTransactionBoot } from './CategorizeTransactionBoot';

// Retrieves the add money in button options.
const MoneyInOptions = getAddMoneyInOptions();
const MoneyOutOptions = getAddMoneyOutOptions();

const Title = styled('h3')`
  font-size: 20px;
  font-weight: 400;
  color: #cd4246;
`;

export function CategorizeTransactionFormContent() {
  const { autofillCategorizeValues, contacts } = useCategorizeTransactionBoot();
  const { values, setFieldValue } = useFormikContext();

  const transactionTypes = autofillCategorizeValues?.isDepositTransaction
    ? MoneyInOptions
    : MoneyOutOptions;

  const formattedAmount = autofillCategorizeValues?.formattedAmount;
  const payeeInn = autofillCategorizeValues?.payeeInn;
  const payee = autofillCategorizeValues?.payee;
  const isDeposit = autofillCategorizeValues?.isDepositTransaction;
  const suggestedByContact = autofillCategorizeValues?.suggestedByContact;

  const queryClient = useQueryClient();
  const organization = useCurrentOrganization();
  const { mutateAsync: createCustomer, isLoading: isCreatingCustomer } =
    useCreateCustomer();
  const { mutateAsync: createVendor, isLoading: isCreatingVendor } =
    useCreateVendor();

  const handleContactSelected = (contact) => {
    setFieldValue('contactId', contact ? contact.id : null);
  };

  // «Создать контрагента из {имя, ИНН}» одним кликом: приход → клиент, расход →
  // поставщик. Имя и ИНН берутся из выписки, валюта — базовая валюта организации.
  const canCreateContact = Boolean(payeeInn && payee && !values.contactId);

  const handleCreateContact = async () => {
    const payload = {
      display_name: payee,
      currency_code: organization?.base_currency,
      inn: payeeInn,
      ...(isDeposit ? { customer_type: 'business' } : {}),
    };
    try {
      const res = isDeposit
        ? await createCustomer(payload)
        : await createVendor(payload);
      // Список контрагентов в селекторе берётся из auto-complete — обновляем его.
      await queryClient.invalidateQueries(['CONTACTS', 'AUTO-COMPLETE']);
      const newContactId = res?.data?.id;
      if (newContactId) setFieldValue('contactId', newContactId);
      AppToaster.show({
        message: intl.get('bank_import.contact_created'),
        intent: Intent.SUCCESS,
      });
    } catch (error) {
      AppToaster.show({
        message: intl.get('bank_import.contact_create_failed'),
        intent: Intent.DANGER,
      });
    }
  };

  return (
    <Box style={{ flex: 1, margin: 20 }}>
      <FormGroup label={intl.get('amount')} inline>
        <Title>{formattedAmount}</Title>
      </FormGroup>

      <FFormGroup name={'category'} label={intl.get('category')} fastField inline>
        <FSelect
          name={'transactionType'}
          items={transactionTypes}
          popoverProps={{ minimal: true }}
          valueAccessor={'value'}
          textAccessor={'name'}
          fill
        />
      </FFormGroup>

      {suggestedByContact && (
        <SuggestionHint>
          {intl.get('bank_import.suggested_by_contact')}
        </SuggestionHint>
      )}

      <FormGroup label={intl.get('bank_import.counterparty')} inline>
        <Box>
          <ContactSelectField
            contacts={contacts}
            selectedContactId={values.contactId || null}
            onContactSelected={handleContactSelected}
            popoverFill
          />
          {payeeInn && (
            <InnTag minimal>{intl.get('bank_import.counterparty_inn')}: {payeeInn}</InnTag>
          )}
          {canCreateContact && (
            <Button
              minimal
              small
              intent={Intent.PRIMARY}
              loading={isCreatingCustomer || isCreatingVendor}
              onClick={handleCreateContact}
              style={{ marginTop: 4 }}
            >
              {intl.get('bank_import.create_contact')}
            </Button>
          )}
        </Box>
      </FormGroup>

      <CategorizeTransactionFormSubContent />
    </Box>
  );
}

const CategorizeTransactionOtherIncome = React.lazy(
  () => import('./MoneyIn/CategorizeTransactionOtherIncome'),
);

const CategorizeTransactionOwnerContribution = React.lazy(
  () => import('./MoneyIn/CategorizeTransactionOwnerContribution'),
);

const CategorizeTransactionTransferFrom = React.lazy(
  () => import('./MoneyIn/CategorizeTransactionTransferFrom'),
);

const CategorizeTransactionOtherExpense = React.lazy(
  () => import('./MoneyOut/CategorizeTransactionOtherExpense'),
);

const CategorizeTransactionToAccount = React.lazy(
  () => import('./MoneyOut/CategorizeTransactionToAccount'),
);

const CategorizeTransactionOwnerDrawings = React.lazy(
  () => import('./MoneyOut/CategorizeTransactionOwnerDrawings'),
);

const InnTag = styled(Tag)`
  margin-top: 4px;
  font-size: 12px;
`;

const SuggestionHint = styled('div')`
  margin: -8px 0 14px 140px;
  font-size: 12px;
  color: #5c7080;
`;

function CategorizeTransactionFormSubContent() {
  const { values } = useFormikContext();

  // Other expense.
  if (values.transactionType === 'other_expense') {
    return <CategorizeTransactionOtherExpense />;
    // Owner contribution.
  } else if (values.transactionType === 'owner_contribution') {
    return <CategorizeTransactionOwnerContribution />;
    // Other Income.
  } else if (values.transactionType === 'other_income') {
    return <CategorizeTransactionOtherIncome />;
    // Transfer from account.
  } else if (values.transactionType === 'transfer_from_account') {
    return <CategorizeTransactionTransferFrom />;
    // Transfer to account.
  } else if (values.transactionType === 'transfer_to_account') {
    return <CategorizeTransactionToAccount />;
    // Owner drawings.
  } else if (values.transactionType === 'owner_drawing') {
    return <CategorizeTransactionOwnerDrawings />;
  }
  return null;
}
