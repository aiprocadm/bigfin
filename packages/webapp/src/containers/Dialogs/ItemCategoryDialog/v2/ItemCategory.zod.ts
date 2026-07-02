import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема категории товара. Сообщение required = подпись поля
 * (паттерн General.zod); intl вызывается фабрикой после инициализации локали.
 */
export const getItemCategorySchema = () =>
  z.object({
    name: z
      .string({ required_error: intl.get('category_name') })
      .min(1, intl.get('category_name')),
    description: z.string().optional().default(''),
  });

export type ItemCategoryFormValues = z.infer<
  ReturnType<typeof getItemCategorySchema>
>;
