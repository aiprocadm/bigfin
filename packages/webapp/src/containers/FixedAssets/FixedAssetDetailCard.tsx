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
import {
  useFixedAsset,
  useDeleteFixedAsset,
  useDisposeFixedAsset,
} from '@/hooks/query/fixed-assets';
import { getDisposeSchema, DisposeValues } from './schemas';

const fmt = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('ru-RU').format(new Date(d));
  } catch {
    return d;
  }
};

const today = () => new Date().toISOString().slice(0, 10);

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

const CASH_ACCOUNT_TYPES = ['cash', 'bank'];

interface Props {
  assetId: number;
  onClose: () => void;
}

function DisposeForm({
  assetId,
  onDone,
  onCancel,
}: {
  assetId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const disposeMutation = useDisposeFixedAsset();
  const { data: accounts } = useAccounts({}, {});
  const cashAccounts: any[] = (accounts ?? []).filter((a: any) =>
    CASH_ACCOUNT_TYPES.includes(a.account_type ?? a.accountType),
  );

  const form = useForm<DisposeValues>({
    resolver: zodResolver(getDisposeSchema()),
    defaultValues: {
      disposedAt: today(),
      disposalType: 'liquidation',
      proceeds: undefined as any,
      paymentAccountId: undefined as any,
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const disposalType = form.watch('disposalType');

  const onSubmit = async (values: DisposeValues) => {
    try {
      await disposeMutation.mutateAsync({
        id: assetId,
        values: {
          type: values.disposalType,
          proceeds: values.proceeds,
          accountId: values.paymentAccountId,
          date: values.disposedAt,
        },
      });
      toast.success(intl.get('fixed_assets.action.dispose'));
      onDone();
    } catch {
      toast.error(intl.get('credits.toast.error'));
    }
  };

  return (
    <div className="rounded-md border p-4">
      <p className="mb-3 font-medium text-sm">
        {intl.get('fixed_assets.dispose.title')}
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          {/* Disposal type */}
          <FormField
            control={form.control}
            name="disposalType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('fixed_assets.dispose.type')}</FormLabel>
                <FormControl>
                  <select
                    className={selectClassName}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    name={field.name}
                    ref={field.ref as React.Ref<HTMLSelectElement>}
                  >
                    <option value="liquidation">
                      {intl.get('fixed_assets.dispose.type_liquidation')}
                    </option>
                    <option value="sale">
                      {intl.get('fixed_assets.dispose.type_sale')}
                    </option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Proceeds + payment account — only for sale */}
          {disposalType === 'sale' && (
            <>
              <FormField
                control={form.control}
                name="proceeds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {intl.get('fixed_assets.dispose.proceeds')}
                    </FormLabel>
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
                name="paymentAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {intl.get('fixed_assets.dispose.account')}
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
                        {cashAccounts.map((a: any) => (
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
            </>
          )}

          {/* Disposal date */}
          <FormField
            control={form.control}
            name="disposedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('fixed_assets.dispose.date')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
              {intl.get('fixed_assets.dispose.submit')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export function FixedAssetDetailCard({ assetId, onClose }: Props) {
  const { data: asset, isLoading } = useFixedAsset(assetId);
  const deleteMutation = useDeleteFixedAsset();
  const [showDispose, setShowDispose] = React.useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {intl.get('credits.loading')}
        </CardContent>
      </Card>
    );
  }

  if (!asset) return null;

  const entries: any[] = asset.schedule ?? asset.entries ?? [];

  const handleDelete = async () => {
    if (!window.confirm(intl.get('fixed_assets.action.delete'))) return;
    try {
      await deleteMutation.mutateAsync(assetId);
      toast.success(intl.get('credits.toast.deleted'));
      onClose();
    } catch {
      toast.error(intl.get('credits.toast.error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{asset.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {intl.get('fixed_assets.summary.net')}: {fmt(asset.netBookValue)}
            </p>
          </div>
          <div className="flex gap-2">
            {asset.status !== 'disposed' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowDispose(!showDispose)}
              >
                {intl.get('fixed_assets.action.dispose')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteMutation.isLoading}
            >
              {intl.get('fixed_assets.action.delete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Asset params */}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {asset.category && (
            <div>
              <div className="text-muted-foreground">
                {intl.get('fixed_assets.col.category')}
              </div>
              <div className="font-medium">{asset.category}</div>
            </div>
          )}
          <div>
            <div className="text-muted-foreground">
              {intl.get('fixed_assets.col.cost')}
            </div>
            <div className="font-medium">{fmt(asset.cost)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {intl.get('fixed_assets.col.accumulated')}
            </div>
            <div className="font-medium">
              {fmt(asset.accumulatedDepreciation)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {intl.get('fixed_assets.col.commissioned_at')}
            </div>
            <div className="font-medium">
              {fmtDate(asset.commissionedAt)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {intl.get('fixed_assets.col.status')}
            </div>
            <div className="font-medium">
              {intl.get(
                asset.status === 'disposed'
                  ? 'fixed_assets.status.disposed'
                  : 'fixed_assets.status.active',
              )}
            </div>
          </div>
        </div>

        {/* Dispose form */}
        {showDispose && (
          <DisposeForm
            assetId={assetId}
            onDone={() => {
              setShowDispose(false);
              onClose();
            }}
            onCancel={() => setShowDispose(false)}
          />
        )}

        {/* Depreciation schedule */}
        {entries.length > 0 && (
          <div className="overflow-x-auto">
            <p className="mb-2 text-sm font-medium">
              {intl.get('fixed_assets.schedule.title')}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3">
                    {intl.get('fixed_assets.schedule.period')}
                  </th>
                  <th className="pb-2 pr-3 text-right">
                    {intl.get('fixed_assets.schedule.amount')}
                  </th>
                  <th className="pb-2">
                    {intl.get('fixed_assets.schedule.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry: any, idx: number) => {
                  const isPosted =
                    (entry.status ?? '').toLowerCase() === 'posted';
                  return (
                    <tr key={entry.period ?? idx}>
                      <td className="py-2 pr-3">{entry.period ?? '—'}</td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(entry.amount)}
                      </td>
                      <td className="py-2">
                        <span
                          className={
                            isPosted ? 'text-green-700' : 'text-muted-foreground'
                          }
                        >
                          {intl.get(
                            isPosted
                              ? 'fixed_assets.schedule.posted'
                              : 'fixed_assets.schedule.planned',
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
