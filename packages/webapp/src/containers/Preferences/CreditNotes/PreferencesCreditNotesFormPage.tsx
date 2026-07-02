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
import { PreferencesCreditNotesForm } from './PreferencesCreditNotesForm';
import {
  creditNotesSchema,
  type CreditNotesFormValues,
} from './PreferencesCreditNotes.zod';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withSettings } from '@/containers/Settings/withSettings';
import { transferObjectOptionsToArray } from '../Accountant/utils';
import { compose, transformToForm, transfromToSnakeCase } from '@/utils';
import { useSaveSettings } from '@/hooks/query';

const defaultValues: CreditNotesFormValues = {
  customerNotes: '',
  termsConditions: '',
};

interface PreferencesCreditNotesFormPageRootProps {
  // #withDashboardActions
  changePreferencesPageTitle: (title: string) => void;
  // #withSettings
  creditNoteSettings: Record<string, unknown>;
}

function PreferencesCreditNotesFormPageRoot({
  changePreferencesPageTitle,
  creditNoteSettings,
}: PreferencesCreditNotesFormPageRootProps) {
  const history = useHistory();
  const { mutateAsync: saveSettingMutate } = useSaveSettings({});
  // useSaveSettings — легаси-хук (ts-nocheck (директива легаси)), TVariables выводится как void.
  // Уточняем тип payload точечно, не трогая общий хук.
  const saveSettings = saveSettingMutate as unknown as (
    vars: { options: unknown },
  ) => Promise<unknown>;

  useEffect(() => {
    changePreferencesPageTitle(intl.get('preferences.creditNotes'));
  }, [changePreferencesPageTitle]);

  const initialValues: CreditNotesFormValues = {
    ...defaultValues,
    ...transformToForm(creditNoteSettings, defaultValues),
  };

  const form = useForm<CreditNotesFormValues>({
    resolver: zodResolver(creditNotesSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: CreditNotesFormValues) => {
    const options = transferObjectOptionsToArray(
      transfromToSnakeCase({ creditNote: { ...values } }),
    );

    try {
      await saveSettings({ options });
      AppToaster.show({
        message: intl.get('preferences.credit_notes.success_message'),
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
            <PreferencesCreditNotesForm />
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

export const PreferencesCreditNotesFormPage = compose(
  withDashboardActions,
  withSettings((mapped: { creditNoteSettings: Record<string, unknown> }) => ({
    creditNoteSettings: mapped.creditNoteSettings,
  })),
)(PreferencesCreditNotesFormPageRoot);
