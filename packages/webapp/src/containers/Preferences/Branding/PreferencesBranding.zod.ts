import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Схема настроек оформления (Branding). `_logoFile` — приватное поле
 * с выбранным файлом логотипа; на сервер не отправляется (excludePrivateProps).
 */
export const brandingSchema = z.object({
  logoKey: z.string().optional().default(''),
  logoUri: z.string().optional().default(''),
  primaryColor: z
    .string({
      required_error: intl.get('preferences.branding.primary_color.required'),
    })
    .min(1, intl.get('preferences.branding.primary_color.required')),
  _logoFile: z.any().optional(),
});

export type BrandingFormValues = z.infer<typeof brandingSchema>;
