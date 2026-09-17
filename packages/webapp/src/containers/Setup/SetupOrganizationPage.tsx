import React from 'react';
import { Formik, FormikHelpers } from 'formik';
import intl from 'react-intl-universal';
import { FormattedMessage as T } from '@/components';
import { x } from '@xstyled/emotion';

import SetupOrganizationForm from './SetupOrganizationForm';

import { useOrganizationSetup } from '@/hooks/query';
import { withSettingsActions } from '@/containers/Settings/withSettingsActions';

import type { SetupOrganizationFormValues } from './SetupOrganization.schema';
import { getSetupOrganizationValidation } from './SetupOrganization.schema';
import { setCookie, compose, transfromToSnakeCase } from '@/utils';

// Initial values.
const defaultValues = {
  name: '',
  location: '',
  baseCurrency: '',
  language: 'ru',
  fiscalYear: '',
  timezone: '',
  // ③ Целевая аудитория — не бухгалтеры: по умолчанию простой режим.
  interfaceMode: 'business',
  // Н1 карты v22: налоговый режим. Пусто = «не выбран»; для России форма
  // потребует выбрать, остальным странам поле не показывается.
  taxRegime: '',
  // Н6 карты v22: юридическая форма — по тому же правилу.
  legalForm: '',
};

/**
 * Returns locale-aware defaults to layer on top of `defaultValues`.
 * When the current UI locale is Russian, we pre-fill base currency (RUB)
 * and language (ru) — typical for the target audience.
 */
function getLocaleAwareDefaults(): Partial<SetupOrganizationFormValues> {
  const currentLocale =
    (intl.getInitOptions && intl.getInitOptions()?.currentLocale) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('lang'));
  if (currentLocale === 'ru') {
    return { baseCurrency: 'RUB', language: 'ru' };
  }
  return {};
}

/**
 * Setup organization form.
 *
 * Шаг мастера здесь не переключается руками: номер шага считает
 * `withSetupWizard` из состояния организации, и после удачного запроса
 * `onSuccess` крючка обновляет её. Раньше в конце стоял `wizard.next()`, но
 * свойства `wizard` странице никто не передавал — вызов бросал исключение,
 * которое молча глотал `catch` ниже (Д12 карты v85).
 */
function SetupOrganizationPage() {
  const { mutateAsync: organizationSetupMutate } = useOrganizationSetup();

  // Validation schema.
  const validationSchema = getSetupOrganizationValidation();

  // Initialize values.
  const initialValues: SetupOrganizationFormValues = {
    ...defaultValues,
    ...getLocaleAwareDefaults(),
  };

  // Handle the form submit.
  const handleSubmit = (
    values: SetupOrganizationFormValues,
    { setSubmitting }: FormikHelpers<SetupOrganizationFormValues>,
  ) => {
    organizationSetupMutate({ ...transfromToSnakeCase(values) })
      .then(() => {
        setSubmitting(false);

        // Sets locale cookie to next boot cycle.
        setCookie('locale', values.language);
      })
      .catch(() => {
        setSubmitting(false);
      });
  };

  return (
    <x.div
      maxWidth={'600px'}
      w="100%"
      mx="auto"
      pt={'45px'}
      pb={'20px'}
      px={'25px'}
    >
      <Formik
        validationSchema={validationSchema}
        initialValues={initialValues}
        component={SetupOrganizationForm}
        onSubmit={handleSubmit}
      />
    </x.div>
  );
}

export default compose(withSettingsActions)(SetupOrganizationPage);
