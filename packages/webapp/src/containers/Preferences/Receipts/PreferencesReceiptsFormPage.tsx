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
import { PreferencesReceiptsForm } from './PreferencesReceiptsForm';
import {
  receiptsSchema,
  type ReceiptsFormValues,
} from './PreferencesReceipts.zod';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { transferObjectOptionsToArray } from '../Accountant/utils';
import { compose, transformToForm, transfromToSnakeCase } from '@/utils';
import { useSaveSettings } from '@/hooks/query';

const defaultValues: ReceiptsFormValues = {
  receiptMessage: '',
  termsConditions: '',
};

interface PreferencesReceiptsFormPageRootProps {
  // #withDashboardActions
  changePreferencesPageTitle: (title: string) => void;
  // #withSettings
  receiptSettings: Record<string, unknown>;
}

function PreferencesReceiptsFormPageRoot({
  changePreferencesPageTitle,
  receiptSettings,
}: PreferencesReceiptsFormPageRootProps) {
  const history = useHistory();
  const { mutateAsync: saveSettingMutate } = useSaveSettings({});
  // useSaveSettings — легаси-хук (ts-nocheck (директива легаси)), TVariables выводится как void.
  // Уточняем тип payload точечно, не трогая общий хук.
  const saveSettings = saveSettingMutate as unknown as (
    vars: { options: unknown },
  ) => Promise<unknown>;

  useEffect(() => {
    changePreferencesPageTitle(intl.get('preferences.receipts'));
  }, [changePreferencesPageTitle]);

  const initialValues: ReceiptsFormValues = {
    ...defaultValues,
    ...transformToForm(receiptSettings, defaultValues),
  };

  const form = useForm<ReceiptsFormValues>({
    resolver: zodResolver(receiptsSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: ReceiptsFormValues) => {
    const options = transferObjectOptionsToArray(
      transfromToSnakeCase({ salesReceipts: { ...values } }),
    );

    try {
      await saveSettings({ options });
      AppToaster.show({
        message: intl.get('preferences.receipts.success_message'),
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
            <PreferencesReceiptsForm />
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

export const PreferencesReceiptsFormPage = compose(
  withDashboardActions,
  withSettings((mapped: { receiptSettings: Record<string, unknown> }) => ({
    receiptSettings: mapped.receiptSettings,
  })),
)(PreferencesReceiptsFormPageRoot);
