import intl from 'react-intl-universal';
import * as Yup from 'yup';

// Схема — функция: сообщения берутся на языке интерфейса в момент показа
// формы (грабля «Yup-схема-константа читает переводы до их загрузки»).
export const getCreditNoteSendMailFormSchema = () =>
  Yup.object().shape({
    subject: Yup.string().required(intl.get('mail.error.subject_required')),
    message: Yup.string().required(intl.get('mail.error.message_required')),
    to: Yup.array()
      .of(Yup.string().email(intl.get('mail.error.invalid_email')))
      .required(intl.get('mail.error.to_required')),
    cc: Yup.array().of(Yup.string().email(intl.get('mail.error.invalid_email'))),
    bcc: Yup.array().of(
      Yup.string().email(intl.get('mail.error.invalid_email')),
    ),
  });
