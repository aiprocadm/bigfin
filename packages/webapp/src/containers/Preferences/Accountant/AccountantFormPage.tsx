import { useEffect } from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHistory } from 'react-router-dom';
import { Intent } from '@blueprintjs/core';
import { flatten, unflatten } from 'flat';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withSettings } from '@/containers/Settings/withSettings';

import AccountantForm from './AccountantForm';
import {
  accountantSchema,
  type AccountantFormValues,
} from './Accountant.zod';
import { useAccountantFormContext } from './AccountantFormProvider';
import { transferObjectOptionsToArray } from './utils';
import { compose, transformToForm, transfromToSnakeCase } from '@/utils';

const defaultFormValues = flatten({
  organization: {
    accountingBasis: 'accrual',
    weekStartDay: '1',
    highlightWeekends: true,
    showWeekdays: false,
  },
  accounts: {
    accountCodeRequired: false,
    accountCodeUnique: false,
  },
  billPayments: {
    withdrawalAccount: '',
  },
  paymentReceives: {
    preferredDepositAccount: '',
    preferredAdvanceDeposit: '',
  },
}) as Record<string, unknown>;

/** Поля-идентификаторы счетов: в форме строками, на сервер числами. */
const ACCOUNT_ID_KEYS = [
  'billPayments.withdrawalAccount',
  'paymentReceives.preferredDepositAccount',
  'paymentReceives.preferredAdvanceDeposit',
];

interface AccountantFormPageProps {
  // #withDashboardActions
  changePreferencesPageTitle: (title: string) => void;
  // #withSettings
  allSettings: Record<string, unknown>;
}

function AccountantFormPage({
  changePreferencesPageTitle,
  allSettings,
}: AccountantFormPageProps) {
  const history = useHistory();
  const { saveSettingMutate } = useAccountantFormContext() as {
    saveSettingMutate: (vars: { options: unknown }) => Promise<unknown>;
  };

  useEffect(() => {
    changePreferencesPageTitle(intl.get('accountant'));
  }, [changePreferencesPageTitle]);

  // Как в легаси: плоское слияние настроек с дефолтами, потом unflatten.
  // Id счетов приводим к строкам для Combobox.
  const merged: Record<string, unknown> = {
    ...defaultFormValues,
    ...transformToForm(flatten(allSettings), defaultFormValues),
  };
  ACCOUNT_ID_KEYS.forEach((key) => {
    merged[key] = merged[key] == null ? '' : String(merged[key]);
  });
  // День начала недели хранится числом, а в выпадающем списке — строкой.
  merged['organization.weekStartDay'] = String(
    merged['organization.weekStartDay'] || '1',
  );
  const initialValues = unflatten(merged) as AccountantFormValues;

  const form = useForm<AccountantFormValues>({
    resolver: zodResolver(accountantSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: AccountantFormValues) => {
    // Непустые id счетов обратно в числа — тот же контракт, что у легаси.
    const flat = flatten(values) as Record<string, unknown>;
    ACCOUNT_ID_KEYS.forEach((key) => {
      flat[key] = flat[key] === '' ? '' : Number(flat[key]);
    });
    flat['organization.weekStartDay'] = Number(flat['organization.weekStartDay']);
    const options = transferObjectOptionsToArray(
      transfromToSnakeCase(unflatten(flat)),
    );

    try {
      await saveSettingMutate({ options });
      AppToaster.show({
        message: intl.get('the_accountant_preferences_has_been_saved'),
        intent: Intent.SUCCESS,
      });
    } catch {
      // Ошибки полей возвращает бэкенд; глобальный тост не показываем (как в легаси).
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-8"
          >
            <AccountantForm />
            <div className="flex gap-3 border-t border-border pt-6">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {intl.get('save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => history.go(-1)}
              >
                {intl.get('close')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default compose(
  withSettings((mapped: { allSettings: Record<string, unknown> }) => ({
    allSettings: mapped.allSettings,
  })),
  withDashboardActions,
)(AccountantFormPage);
