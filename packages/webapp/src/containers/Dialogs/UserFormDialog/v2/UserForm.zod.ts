import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема редактирования пользователя. Сообщение required = подпись поля
 * (паттерн General.zod); intl вызывается фабрикой после инициализации локали.
 */
export const getUserFormSchema = () =>
  z.object({
    email: z
      .string({ required_error: intl.get('email') })
      .min(1, intl.get('email'))
      .email(intl.get('validation.email.invalid')),
    first_name: z
      .string({ required_error: intl.get('first_name') })
      .min(1, intl.get('first_name')),
    last_name: z
      .string({ required_error: intl.get('last_name') })
      .min(1, intl.get('last_name')),
    role_id: z
      .string({ required_error: intl.get('roles.label.role_name') })
      .min(1, intl.get('roles.label.role_name')),
  });

export type UserFormValues = z.infer<ReturnType<typeof getUserFormSchema>>;
