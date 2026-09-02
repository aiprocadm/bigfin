import intl from 'react-intl-universal';
import * as Yup from 'yup';

const getSchema = () =>
  Yup.object().shape({
    name: Yup.string().required().label(intl.get('tax_rates.label.name')),
    code: Yup.string().required().label(intl.get('code')),
    active: Yup.boolean().optional().label(intl.get('active')),
    describtion: Yup.string().optional().label(intl.get('description')),
    rate: Yup.number()
      .min(0, intl.get('tax_rates.validation.rate_min'))
      .max(100, intl.get('tax_rates.validation.rate_max'))
      .required()
      .label(intl.get('tax_rates.label.rate')),
    is_compound: Yup.boolean().optional().label(intl.get('tax_rates.label.is_compound')),
    is_non_recoverable: Yup.boolean().optional().label(intl.get('tax_rates.label.is_non_recoverable')),
    confirm_edit: Yup.boolean().optional(),
  });

export const CreateTaxRateFormSchema = getSchema;
export const EditTaxRateFormSchema = getSchema;
