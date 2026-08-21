import intl from 'react-intl-universal';
import * as Yup from 'yup';

// Схема строится при вызове: словарь к моменту импорта модуля ещё не загружен.
export const getInvoiceCustomizeSchema = () =>
  Yup.object().shape({
    templateName: Yup.string().required(
      intl.get('branding.templates.validation.name_required'),
    ),
  });
