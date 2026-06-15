// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  useFixedAssets,
  useFixedAssetsSummary,
  useAccrueMonth,
} from '@/hooks/query/fixed-assets';
import { FixedAssetCreateDialog } from './FixedAssetCreateDialog';
import { FixedAssetDetailCard } from './FixedAssetDetailCard';

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

const currentMonthValue = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// Small inline accrue dialog schema
const accrueSchema = z.object({
  period: z.string().min(1),
});
type AccrueFormValues = z.infer<typeof accrueSchema>;

function AccrueDialog({ onClose }: { onClose: () => void }) {
  const accrueMutation = useAccrueMonth();

  const form = useForm<AccrueFormValues>({
    resolver: zodResolver(accrueSchema),
    defaultValues: { period: currentMonthValue() },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: AccrueFormValues) => {
    // Convert YYYY-MM to YYYY-MM-01 ISO date for API
    const period = `${values.period}-01`;
    try {
      const result = await accrueMutation.mutateAsync({ period });
      const count: number = result?.data?.posted ?? result?.posted ?? 0;
      toast.success(intl.get('fixed_assets.accrue.done', { count }));
      onClose();
    } catch {
      toast.error(intl.get('credits.toast.error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get('fixed_assets.accrue.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('fixed_assets.accrue.period')}</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {intl.get('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('fixed_assets.accrue.submit')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function FixedAssetsPage() {
  const { featureCan } = useFeatureCan();
  const [showCreate, setShowCreate] = React.useState(false);
  const [showAccrue, setShowAccrue] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const { data: summary } = useFixedAssetsSummary();
  const { data: assets } = useFixedAssets();

  if (!featureCan('fixed_assets')) return null;

  const assetRows: any[] = assets ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('fixed_assets.page.title')}
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowAccrue(true)}>
            {intl.get('fixed_assets.action.accrue')}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            {intl.get('fixed_assets.action.new')}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-md border p-4">
          <span className="text-sm text-muted-foreground">
            {intl.get('fixed_assets.summary.count')}
          </span>
          <span className="text-2xl font-semibold">
            {summary?.count ?? 0}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-4">
          <span className="text-sm text-muted-foreground">
            {intl.get('fixed_assets.summary.gross')}
          </span>
          <span className="text-2xl font-semibold">
            {fmt(summary?.grossValue)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-4">
          <span className="text-sm text-muted-foreground">
            {intl.get('fixed_assets.summary.accumulated')}
          </span>
          <span className="text-2xl font-semibold">
            {fmt(summary?.accumulatedDepreciation)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border p-4">
          <span className="text-sm text-muted-foreground">
            {intl.get('fixed_assets.summary.net')}
          </span>
          <span className="text-2xl font-semibold">
            {fmt(summary?.netBookValue)}
          </span>
        </div>
      </div>

      {/* Accrue dialog */}
      {showAccrue && <AccrueDialog onClose={() => setShowAccrue(false)} />}

      {/* Create dialog */}
      {showCreate && (
        <FixedAssetCreateDialog
          onDone={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Assets table */}
      <div className="overflow-x-auto rounded-md border">
        {assetRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {intl.get('fixed_assets.page.title')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">
                  {intl.get('fixed_assets.col.name')}
                </th>
                <th className="px-4 py-3">
                  {intl.get('fixed_assets.col.category')}
                </th>
                <th className="px-4 py-3 text-right">
                  {intl.get('fixed_assets.col.cost')}
                </th>
                <th className="px-4 py-3 text-right">
                  {intl.get('fixed_assets.col.accumulated')}
                </th>
                <th className="px-4 py-3 text-right">
                  {intl.get('fixed_assets.col.net')}
                </th>
                <th className="px-4 py-3">
                  {intl.get('fixed_assets.col.commissioned_at')}
                </th>
                <th className="px-4 py-3">
                  {intl.get('fixed_assets.col.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assetRows.map((asset: any) => (
                <tr
                  key={asset.id}
                  className="cursor-pointer hover:bg-muted/20"
                  onClick={() =>
                    setSelectedId(selectedId === asset.id ? null : asset.id)
                  }
                >
                  <td className="px-4 py-3 font-medium">{asset.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {asset.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(asset.cost)}</td>
                  <td className="px-4 py-3 text-right">
                    {fmt(asset.accumulatedDepreciation)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fmt(asset.netBookValue)}
                  </td>
                  <td className="px-4 py-3">
                    {fmtDate(asset.commissionedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        asset.status === 'disposed'
                          ? 'text-muted-foreground'
                          : 'text-green-700'
                      }
                    >
                      {intl.get(
                        asset.status === 'disposed'
                          ? 'fixed_assets.status.disposed'
                          : 'fixed_assets.status.active',
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail card */}
      {selectedId !== null && (
        <FixedAssetDetailCard
          assetId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
