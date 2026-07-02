import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема приглашения пользователя. Сообщение required = подпись поля
 * (паттерн General.zod); intl вызывается фабрикой после инициализации локали.
 */
export const getInviteUserSchema = () =>
  z.object({
    email: z
      .string({ required_error: intl.get('invite_user.label.email') })
      .min(1, intl.get('invite_user.label.email'))
      .email(intl.get('validation.email.invalid')),
    role_id: z
      .string({ required_error: intl.get('invite_user.label.role_name') })
      .min(1, intl.get('invite_user.label.role_name')),
  });

export type InviteUserFormValues = z.infer<
  ReturnType<typeof getInviteUserSchema>
>;
