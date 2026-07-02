import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема формы дублирования контакта: обязателен только тип контакта.
 * Фабрика (а не константа), чтобы intl.get вызывался после инициализации локали.
 */
export const getContactDuplicateSchema = () =>
  z.object({
    contactType: z
      .string()
      .min(1, intl.get('contact_duplicate.validation.contact_type_required')),
  });

export type ContactDuplicateFormValues = z.infer<
  ReturnType<typeof getContactDuplicateSchema>
>;
