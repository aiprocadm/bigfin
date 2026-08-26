import * as Yup from 'yup';
import intl from 'react-intl-universal';
import {
  ORGANIZATION_LEGAL_FORMS,
  TAX_REGIMES,
} from '@/containers/Preferences/General/requisitesOptions';

/** Values for setup organization / create workspace forms (matches Yup schema fields). */
export interface SetupOrganizationFormValues {
  name: string;
  location: string;
  baseCurrency: string;
  language: string;
  fiscalYear: string;
  timezone: string;
  // ③ Есть только в онбординге; форма воркспейсов режим не выбирает.
  interfaceMode?: string;
  // Н1 карты v22: налоговый режим — только у российских организаций.
  taxRegime?: string;
  // Н6 карты v22: юридическая форма — тоже только у российских.
  legalForm?: string;
}

// Retrieve the setup organization form validation.
export const getSetupOrganizationValidation = () =>
  Yup.object().shape({
    name: Yup.string()
      .required()
      .label(intl.get('organization_name_')),
    location: Yup.string()
      .required()
      .label(intl.get('setup.organization.location')),
    baseCurrency: Yup.string().required().label(intl.get('base_currency_')),
    language: Yup.string().required().label(intl.get('language')),
    fiscalYear: Yup.string().required().label(intl.get('fiscal_year_')),
    timezone: Yup.string().required().label(intl.get('time_zone_')),
    interfaceMode: Yup.string().oneOf(['business', 'accountant']),
    // Налоговый режим спрашиваем только у российских организаций: другим
    // странам он не нужен, и требовать его значило бы не пускать их дальше.
    taxRegime: Yup.string()
      // Пустая строка допустима: у организаций других стран поле не
      // показывается и уходит пустым. Без неё в списке мастер отказывался
      // создавать нероссийскую организацию — поймано тестом Н6.
      .oneOf(['', ...TAX_REGIMES.map((option) => option.value)])
      .when('location', {
        is: 'RU',
        then: (schema: Yup.StringSchema) => schema.required(),
      })
      .label(intl.get('requisites.tax_regime')),
    // Юрформу спрашиваем там же и по тому же правилу, что и режим: она
    // нужна печатным формам, а они есть только у российских организаций.
    legalForm: Yup.string()
      // Та же история, что и с режимом: пустая строка — это «поле не
      // показывалось», а не ошибка.
      .oneOf(['', ...ORGANIZATION_LEGAL_FORMS.map((option) => option.value)])
      .when('location', {
        is: 'RU',
        then: (schema: Yup.StringSchema) => schema.required(),
      })
      .label(intl.get('requisites.legal_form')),
  });
