import intl from 'react-intl-universal';
import * as Yup from 'yup';

// Схема строится при вызове: словарь к моменту импорта модуля ещё не загружен.
// Лейблы — те же ключи, которыми подписаны поля формы.
export const getExportDialogFormSchema = () =>
  Yup.object().shape({
    resource: Yup.string()
      .required()
      .label(intl.get('export.dialog.label.select_resource')),
    format: Yup.string()
      .required()
      .label(intl.get('export.dialog.label.export_as')),
  });
