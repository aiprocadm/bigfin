import intl from 'react-intl-universal';
import { useFormikContext } from 'formik';
import { omit } from 'lodash';
import { transformToForm, compose } from '@/utils';

// Default initial form values.
export const defaultInitialValues = {
  name: '',
  code: '',
  rate: '',
  description: '',
  is_compound: false,
  is_non_recoverable: false,
  confirm_edit: false,
};

/**
 * Transformers response errors to form errors.
 * @returns {Record<string, string>}
 */
export const transformApiErrors = (errors: any) => {
  // Объявлено ЯВНО: пустой объект `{}` проверка считает «объектом без
  // полей», и любое присваивание в него — ошибка. Слепая зона это прятала,
  // и следующий, кто добавит сюда вторую ошибку, потерял бы день.
  const fields: Record<string, string> = {};

  if (errors.find((e: any) => e.type === 'TAX_CODE_NOT_UNIQUE')) {
    fields.code = intl.get('tax_rates.error.not_unique');
  }
  return fields;
};

/**
 * Tranformes form values to request values.
 */
export const transformFormToReq = (form: any) => {
  return omit({ ...form }, ['confirm_edit']);
};

/**
 * Detarmines whether the tax rate changed.
 * @param initialValues 
 * @param formValues 
 * @returns {boolean}
 */
export const isTaxRateChange = (initialValues: any, formValues: any) => {
  return initialValues.rate !== formValues.rate;
};

/**
 * Detarmines whether the tax rate changed.
 * @returns {boolean}
 */
export const useIsTaxRateChanged = () => {
  const { initialValues, values } = useFormikContext<any>();

  return isTaxRateChange(initialValues, values);
};

const convertFormAttrsToBoolean = (form: any) => {
  return {
    ...form,
    is_compound: !!form.is_compound,
    is_non_recoverable: !!form.is_non_recoverable,
  };
};

export const transformTaxRateToForm = (taxRate: any) => {
  return compose(convertFormAttrsToBoolean)({
    ...defaultInitialValues,
    /**
     * We only care about the fields in the form. Previously unfilled optional
     * values such as `notes` come back from the API as null, so remove those
     * as well.
     */
    ...transformToForm(taxRate, defaultInitialValues),
  });
};

export const transformTaxRateCodeValue = (input: string) => {
  // Remove non-alphanumeric characters and spaces using a regular expression
  const cleanedString = input.replace(/\s+/g, '');

  // Convert the cleaned string to uppercase
  const uppercasedString = cleanedString.toUpperCase();

  return uppercasedString;
};
