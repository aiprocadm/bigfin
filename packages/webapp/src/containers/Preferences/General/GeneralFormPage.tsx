import React, { useEffect } from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHistory } from 'react-router-dom';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import GeneralForm from './GeneralForm';
import { generalSchema, type GeneralFormValues } from './General.zod';
import { useGeneralFormContext } from './GeneralFormProvider';
import type { GeneralFormContextValue } from './General.types';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { compose, transformToForm } from '@/utils';

const defaultValues: GeneralFormValues = {
  name: '',
  industry: '',
  location: '',
  base_currency: '',
  language: '',
  fiscal_year: '',
  date_format: '',
  timezone: '',
  address: {},
  // Реквизиты организации (Р2 срез 1 карты v16).
  legal_form: '',
  tax_regime: '',
  inn: '',
  kpp: '',
  ogrn: '',
  signer_director_name: '',
  signer_director_position: '',
  signer_accountant_name: '',
  bank_name: '',
  bank_bik: '',
  bank_account: '',
  bank_correspondent_account: '',
};

interface GeneralFormPageProps {
  changePreferencesPageTitle: (title: string) => void;
}

function GeneralFormPage({ changePreferencesPageTitle }: GeneralFormPageProps) {
  const history = useHistory();
  const { updateOrganization, organization } =
    useGeneralFormContext() as GeneralFormContextValue;

  useEffect(() => {
    changePreferencesPageTitle(intl.get('general'));
  }, [changePreferencesPageTitle]);

  const initialValues: GeneralFormValues = {
    ...defaultValues,
    ...transformToForm(organization.metadata, defaultValues),
  };

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: GeneralFormValues) => {
    try {
      await updateOrganization({ ...values });
      AppToaster.show({
        message: intl.get('preferences.general.success_message'),
        intent: Intent.SUCCESS,
      });
      // Перезагружаем приложение при смене языка интерфейса (как в легаси).
      if (organization.metadata?.language !== values.language) {
        window.location.reload();
      }
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
            <GeneralForm />
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

export default compose(withDashboardActions)(GeneralFormPage);
