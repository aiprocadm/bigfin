// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getCreateFixedAssetSchema = () =>
  z.object({
    name: z.string().trim().min(1, intl.get('fixed_assets.form.name')),
    category: z.string().trim().optional(),
    cost: z
      .number({ invalid_type_error: intl.get('fixed_assets.form.cost') })
      .positive(),
    salvageValue: z
      .number({ invalid_type_error: intl.get('fixed_assets.form.salvage') })
      .min(0)
      .optional(),
    serviceLifeMonths: z
      .number({ invalid_type_error: intl.get('fixed_assets.form.life_months') })
      .int()
      .positive(),
    commissionedAt: z.string().min(1),
    assetAccountId: z
      .number({
        invalid_type_error: intl.get('fixed_assets.form.asset_account'),
      })
      .int()
      .positive(),
    note: z.string().trim().optional(),
  });

export type CreateFixedAssetValues = z.infer<
  ReturnType<typeof getCreateFixedAssetSchema>
>;

export const getDisposeSchema = () =>
  z.object({
    disposedAt: z.string().min(1),
    disposalType: z.enum(['sale', 'liquidation']),
    proceeds: z
      .number({ invalid_type_error: intl.get('fixed_assets.dispose.proceeds') })
      .min(0)
      .optional(),
    paymentAccountId: z
      .number({
        invalid_type_error: intl.get('fixed_assets.dispose.account'),
      })
      .int()
      .optional(),
  });

export type DisposeValues = z.infer<ReturnType<typeof getDisposeSchema>>;
