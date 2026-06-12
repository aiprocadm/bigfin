// @ts-nocheck
import intl from 'react-intl-universal';
import * as R from 'ramda';
import { Button, Intent, Position, Tag } from '@blueprintjs/core';
import { Form, Formik, FormikHelpers, useFormikContext } from 'formik';
import moment from 'moment';
import { round } from 'lodash';
import {
  AccountsSelect,
  AppToaster,
  Box,
  BranchSelect,
  FDateInput,
  FeatureCan,
  FFormGroup,
  FInputGroup,
  FMoneyInputGroup,
  Group,
  Icon,
} from '@/components';
import { Aside } from '@/components/Aside/Aside';
import { momentFormatter } from '@/utils';
import styles from './MatchingReconcileTransactionForm.module.scss';
import { ContentTabs } from '@/components/ContentTabs';
import { withBankingActions } from '../../withBankingActions';
import {
  MatchingReconcileTransactionBoot,
  useMatchingReconcileTransactionBoot,
} from './MatchingReconcileTransactionBoot';
import { useCreateCashflowTransaction } from '@/hooks/query';
import { useAccountTransactionsContext } from '../../AccountTransactions/AccountTransactionsProvider';
import { MatchingReconcileFormSchema } from './MatchingReconcileTransactionForm.schema';
import { initialValues, transformToReq } from './_utils';
import { withBanking } from '../../withBanking';
import { Features } from '@/constants';

interface MatchingReconcileTransactionFormProps {
  onSubmitSuccess?: (values: any) => void;
}

function MatchingReconcileTransactionFormRoot({
  closeReconcileMatchingTransaction,
  reconcileMatchingTransactionPendingAmount,

  // #props¿
  onSubmitSuccess,
}: MatchingReconcileTransactionFormProps) {
  // Mutation create cashflow transaction.
  const { mutateAsync: createCashflowTransactionMutate } =
    useCreateCashflowTransaction();

  const { accountId } = useAccountTransactionsContext();

  // Handles the aside close.
  const handleAsideClose = () => {
    closeReconcileMatchingTransaction();
  };
  // Handle the form submitting.
  const handleSubmit = (
    values: MatchingReconcileTransactionValues,
    {
      setSubmitting,
      setErrors,
    }: FormikHelpers<MatchingReconcileTransactionValues>,
  ) => {
    setSubmitting(true);
    const _values = transformToReq(values, accountId);

    createCashflowTransactionMutate(_values)
      .then((res) => {
        setSubmitting(false);

        AppToaster.show({
          message: intl.get('cashflow.notify.transaction_created'),
          intent: Intent.SUCCESS,
        });
        closeReconcileMatchingTransaction();
        onSubmitSuccess &&
          onSubmitSuccess({ id: res.data.id, type: 'CashflowTransaction' });
      })
      .catch((error) => {
        setSubmitting(false);
        if (
          error.response.data?.errors?.find(
            (e) => e.type === 'BRANCH_ID_REQUIRED',
          )
        ) {
          setErrors({
            branchId: 'The branch is required.',
          });
        } else {
          AppToaster.show({
            message: intl.get('something_wentwrong'),
            intent: Intent.DANGER,
          });
        }
      });
  };

  const _initialValues = {
    ...initialValues,
    amount: round(Math.abs(reconcileMatchingTransactionPendingAmount), 2) || 0,
    date: moment().format('YYYY-MM-DD'),
    type:
      reconcileMatchingTransactionPendingAmount > 0 ? 'deposit' : 'withdrawal',
  };

  return (
    <Aside
      title={intl.get('cashflow.aside.create_reconcile_transactions')}
      className={styles.asideRoot}
      onClose={handleAsideClose}
    >
      <MatchingReconcileTransactionBoot>
        <Formik
          onSubmit={handleSubmit}
          initialValues={_initialValues}
          validationSchema={MatchingReconcileFormSchema}
        >
          <Form className={styles.form}>
            <Aside.Body className={styles.asideContent}>
              <CreateReconcileTransactionContent />
            </Aside.Body>

            <Aside.Footer className={styles.asideFooter}>
              <MatchingReconcileTransactionFooter />
            </Aside.Footer>
          </Form>
        </Formik>
      </MatchingReconcileTransactionBoot>
    </Aside>
  );
}

export const MatchingReconcileTransactionForm = R.compose(
  withBankingActions,
  withBanking(({ reconcileMatchingTransactionPendingAmount }) => ({
    reconcileMatchingTransactionPendingAmount,
  })),
)(MatchingReconcileTransactionFormRoot);

function ReconcileMatchingType() {
  const { setFieldValue, values } =
    useFormikContext<MatchingReconcileFormValues>();

  const handleChange = (value: string) => {
    setFieldValue('type', value);
    setFieldValue('category');
  };
  return (
    <ContentTabs
      value={values?.type || 'deposit'}
      onChange={handleChange}
      small
    >
      <ContentTabs.Tab id={'deposit'} title={intl.get('banking.label.deposit')} />
      <ContentTabs.Tab id={'withdrawal'} title={intl.get('banking.label.withdrawal')} />
    </ContentTabs>
  );
}

function CreateReconcileTransactionContent() {
  const { branches } = useMatchingReconcileTransactionBoot();

  return (
    <Box className={styles.content}>
      <ReconcileMatchingType />

      <FFormGroup label={intl.get('date')} name={'date'} fastField>
        <FDateInput
          {...momentFormatter('YYYY/MM/DD')}
          name={'date'}
          popoverProps={{
            minimal: false,
            position: Position.LEFT,
            modifiers: {
              preventOverflow: { enabled: true },
            },
            boundary: 'viewport',
          }}
          inputProps={{ fill: true, leftElement: <Icon icon={'date-range'} /> }}
          fill
          fastField
        />
      </FFormGroup>

      <FFormGroup
        label={intl.get('amount')}
        name={'amount'}
        labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
        fastField
      >
        <FMoneyInputGroup name={'amount'} fastField />
      </FFormGroup>

      <MatchingReconcileCategoryField />

      <FFormGroup
        label={intl.get('cashflow.label.memo')}
        name={'memo'}
        labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
        fastField
      >
        <FInputGroup name={'memo'} fastField />
      </FFormGroup>

      <FFormGroup label={intl.get('reference_no')} name={'reference_no'} fastField>
        <FInputGroup name={'reference_no'} />
      </FFormGroup>

      <FeatureCan feature={Features.Branches}>
        <FFormGroup
          name={'branchId'}
          label={intl.get('branch')}
          labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
          fastField
        >
          <BranchSelect
            name={'branchId'}
            branches={branches}
            popoverProps={{
              minimal: false,
              position: Position.LEFT,
              modifiers: {
                preventOverflow: { enabled: true },
              },
              boundary: 'viewport',
            }}
            fastField
          />
        </FFormGroup>
      </FeatureCan>
    </Box>
  );
}

function MatchingReconcileCategoryField() {
  const { accounts } = useMatchingReconcileTransactionBoot();
  const { values } = useFormikContext();

  return (
    <FFormGroup
      label={intl.get('category')}
      name={'category'}
      labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
      fastField
    >
      <AccountsSelect
        name={'category'}
        items={accounts}
        popoverProps={{
          minimal: false,
          position: Position.LEFT,
          modifiers: {
            preventOverflow: { enabled: true },
          },
          boundary: 'viewport',
        }}
        filterByRootTypes={values.type === 'deposit' ? 'income' : 'expense'}
        fastField
      />
    </FFormGroup>
  );
}

function MatchingReconcileTransactionFooter() {
  const { isSubmitting } = useFormikContext();

  return (
    <Box className={styles.footer}>
      <Group>
        <Button
          fill
          type={'submit'}
          intent={Intent.PRIMARY}
          loading={isSubmitting}
        >
          Submit
        </Button>
      </Group>
    </Box>
  );
}
