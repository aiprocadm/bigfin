import intl from 'react-intl-universal';
import { z } from 'zod';

const required = (label: string) =>
  z.string({ required_error: label }).trim().min(1, label);

export const generalSchema = z.object({
  name: required(intl.get('organization_name_')),
  tax_number: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  location: z.string().optional().default(''),
  base_currency: required(intl.get('base_currency_')),
  fiscal_year: required(intl.get('fiscal_year_')),
  language: required(intl.get('language')),
  timezone: required(intl.get('time_zone_')),
  date_format: required(intl.get('date_format_')),
  address: z
    .object({
      address1: z.string().optional().default(''),
      address2: z.string().optional().default(''),
      city: z.string().optional().default(''),
      postal_code: z.string().optional().default(''),
      state_province: z.string().optional().default(''),
      phone: z.string().optional().default(''),
    })
    .partial()
    .optional()
    .default({}),
});

export type GeneralFormValues = z.infer<typeof generalSchema>;
