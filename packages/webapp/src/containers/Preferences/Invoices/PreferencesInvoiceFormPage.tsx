import { useEffect } from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHistory } from 'react-router-dom';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { PreferencesInvoicesForm } from './PreferencesInvoicesForm';
import {
  invoicesSchema,
  type InvoicesFormValues,
} from './PreferencesInvoices.zod';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { transferObjectOptionsToArray } from '../Accountant/utils';
import { compose, transformToForm, transfromToSnakeCase } from '@/utils';
import { useSaveSettings } from '@/hooks/query';

const defaultValues: InvoicesFormValues = {
  customerNotes: '',
  termsConditions: '',
};

interface PreferencesInvoiceFormPageProps {
  // #withDashboardActions
  changePreferencesPageTitle: (title: string) => void;
  // #withSettings
  invoiceSettings: Record<string, unknown>;
}

function PreferencesInvoiceFormPage({
  changePreferencesPageTitle,
  invoiceSettings,
}: PreferencesInvoiceFormPageProps) {
  const history = useHistory();
  const { mutateAsync: saveSettingMutate } = useSaveSettings({});
  // useSaveSettings — легаси-хук (ts-nocheck (директива легаси)), TVariables выводится как void.
  // Уточняем тип payload точечно, не трогая общий хук.
  const saveSettings = saveSettingMutate as unknown as (
    vars: { options: unknown },
  ) => Promise<unknown>;

  useEffect(() => {
    changePreferencesPageTitle(intl.get('preferences.invoices'));
  }, [changePreferencesPageTitle]);

  const initialValues: InvoicesFormValues = {
    ...defaultValues,
    ...transformToForm(invoiceSettings, defaultValues),
  };

  const form = useForm<InvoicesFormValues>({
    resolver: zodResolver(invoicesSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: InvoicesFormValues) => {
    const options = transferObjectOptionsToArray(
      transfromToSnakeCase({ salesInvoices: { ...values } }),
    );

    try {
      await saveSettings({ options });
      AppToaster.show({
        message: intl.get('preferences.invoices.success_message'),
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
            <PreferencesInvoicesForm />
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
  withDashboardActions,
  withSettings((mapped: { invoiceSettings: Record<string, unknown> }) => ({
    invoiceSettings: mapped.invoiceSettings,
  })),
)(PreferencesInvoiceFormPage);
