// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/query';
import { useCreateFixedAsset } from '@/hooks/query/fixed-assets';
import { getCreateFixedAssetSchema, CreateFixedAssetValues } from './schemas';

// Fixed assets are typically non-current asset account types.
// useAccounts does not expose a type-filter prop on the <select>, so we filter
// client-side. The Credits template uses 'cash'/'bank'; here we use
// 'fixed_asset' and 'non_current_asset' as likely type strings. If those types
// are not present in the data the picker will show all accounts unfiltered
// (we fall back to full list to avoid breaking the form).
const ASSET_ACCOUNT_TYPES = ['fixed_asset', 'non_current_asset'];

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export function FixedAssetCreateDialog({ onDone, onCancel }: Props) {
  const createMutation = useCreateFixedAsset();
  const { data: accounts } = useAccounts({}, {});

  const allAccounts: any[] = accounts ?? [];
  const assetAccounts: any[] = allAccounts.filter((a: any) =>
    ASSET_ACCOUNT_TYPES.includes(a.account_type ?? a.accountType),
  );
  // Fall back to all accounts if filtering produces an empty list
  const accountOptions = assetAccounts.length > 0 ? assetAccounts : allAccounts;

  const form = useForm<CreateFixedAssetValues>({
    resolver: zodResolver(getCreateFixedAssetSchema()),
    defaultValues: {
      name: '',
      category: '',
      cost: undefined as any,
      salvageValue: undefined as any,
      serviceLifeMonths: undefined as any,
      commissionedAt: today(),
      assetAccountId: undefined as any,
      note: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: CreateFixedAssetValues) => {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        category: values.category || undefined,
        cost: values.cost,
        salvageValue: values.salvageValue,
        lifeMonths: values.serviceLifeMonths,
        commissionedAt: values.commissionedAt,
        assetAccountId: values.assetAccountId,
      });
      toast.success(intl.get('credits.toast.created'));
      onDone();
    } catch {
      toast.error(intl.get('credits.toast.error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get('fixed_assets.action.new')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('fixed_assets.form.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('fixed_assets.form.category')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost + Salvage value */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('fixed_assets.form.cost')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salvageValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('fixed_assets.form.salvage')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Service life + In-service date */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="serviceLifeMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {intl.get('fixed_assets.form.life_months')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commissionedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {intl.get('fixed_assets.form.commissioned_at')}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Asset account */}
            <FormField
              control={form.control}
              name="assetAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('fixed_assets.form.asset_account')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value),
                        )
                      }
                      name={field.name}
                      ref={field.ref as React.Ref<HTMLSelectElement>}
                    >
                      <option value="">—</option>
                      {accountOptions.map((a: any) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('note')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {intl.get('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('fixed_assets.form.submit')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
