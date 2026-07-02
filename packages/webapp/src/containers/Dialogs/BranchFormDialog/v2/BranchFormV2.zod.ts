import { z } from 'zod';
import intl from 'react-intl-universal';
import { DATATYPES_LENGTH } from '@/constants/dataTypes';

/**
 * Схема формы филиала (Zod, замена Yup).
 * Собирается фабрикой, чтобы intl-словарь был уже загружен к моменту вызова.
 */
export const getBranchFormSchema = () =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, intl.get('branch.dialog.validation.name_required')),
    code: z
      .string()
      .trim()
      .max(
        DATATYPES_LENGTH.STRING,
        intl.get('validation.max_length', { max: DATATYPES_LENGTH.STRING }),
      ),
    address: z.string().trim(),
    city: z.string().trim(),
    country: z.string().trim(),
    phone_number: z.string().trim(),
    // Пустая строка допустима; непустая должна быть корректным email/URL.
    // refine + safeParse вместо z.union — union даёт нелокализуемое
    // сообщение «Invalid input».
    email: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || z.string().email().safeParse(value).success,
        intl.get('validation.email.invalid'),
      ),
    website: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || z.string().url().safeParse(value).success,
        intl.get('validation.url.invalid'),
      ),
  });

export type BranchFormValues = z.infer<ReturnType<typeof getBranchFormSchema>>;
