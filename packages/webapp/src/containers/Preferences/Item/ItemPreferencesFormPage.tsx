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
import ItemPreferencesForm from './ItemPreferencesForm';
import {
  itemPreferencesSchema,
  type ItemPreferencesFormValues,
} from './ItemPreferences.zod';
import { useItemPreferencesFormContext } from './ItemPreferencesFormProvider';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withSettings } from '@/containers/Settings/withSettings';
import {
  compose,
  optionsMapToArray,
  transformGeneralSettings,
  transformToForm,
} from '@/utils';

const defaultFormValues: ItemPreferencesFormValues = {
  preferred_sell_account: '',
  preferred_cost_account: '',
  preferred_inventory_account: '',
};

interface ItemPreferencesFormPageProps {
  // #withSettings
  itemsSettings: Record<string, unknown>;
  // #withDashboardActions
  changePreferencesPageTitle: (title: string) => void;
}

function ItemPreferencesFormPage({
  itemsSettings,
  changePreferencesPageTitle,
}: ItemPreferencesFormPageProps) {
  const history = useHistory();
  const { saveSettingMutate } = useItemPreferencesFormContext() as {
    saveSettingMutate: (vars: { options: unknown }) => Promise<unknown>;
  };

  useEffect(() => {
    changePreferencesPageTitle(intl.get('items'));
  }, [changePreferencesPageTitle]);

  // Из настроек id счетов приходят числами/строками — в форме держим строками.
  const stored = transformToForm(
    transformGeneralSettings(itemsSettings),
    defaultFormValues,
  ) as Record<string, unknown>;
  const initialValues: ItemPreferencesFormValues = {
    ...defaultFormValues,
    ...Object.fromEntries(
      Object.entries(stored).map(([k, v]) => [k, v == null ? '' : String(v)]),
    ),
  };

  const form = useForm<ItemPreferencesFormValues>({
    resolver: zodResolver(itemPreferencesSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: ItemPreferencesFormValues) => {
    // Непустые id обратно в числа — тот же контракт, что у легаси-формы.
    const numeric = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? '' : Number(v)]),
    );
    const options = (
      optionsMapToArray(numeric) as Array<Record<string, unknown>>
    ).map((option) => ({ ...option, group: 'items' }));

    try {
      await saveSettingMutate({ options });
      AppToaster.show({
        message: intl.get('the_items_preferences_has_been_saved'),
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
            <ItemPreferencesForm />
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
  withSettings((mapped: { itemsSettings: Record<string, unknown> }) => ({
    itemsSettings: mapped.itemsSettings,
  })),
  withDashboardActions,
)(ItemPreferencesFormPage);
