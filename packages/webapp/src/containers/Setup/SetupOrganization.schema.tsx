import * as Yup from 'yup';
import intl from 'react-intl-universal';
import { TAX_REGIMES } from '@/containers/Preferences/General/requisitesOptions';

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
      .oneOf(TAX_REGIMES.map((option) => option.value))
      .when('location', {
        is: 'RU',
        then: (schema: Yup.StringSchema) => schema.required(),
      })
      .label(intl.get('requisites.tax_regime')),
  });
