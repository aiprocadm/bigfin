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
import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useCreateRule, useEditRule } from '@/hooks/query/costAllocation';
import {
  getCostAllocationRuleSchema,
  CostAllocationRuleFormValues,
  ALLOCATION_KEYS,
} from './schemas';

interface Props {
  initialValues?: Partial<CostAllocationRuleFormValues> & { id?: number };
  onDone: () => void;
  onCancel: () => void;
}

interface ArticleRow {
  id: number;
  name: string;
  kind: string;
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

export function CostAllocationRuleDialog({ initialValues, onDone, onCancel }: Props) {
  const isEdit = !!initialValues?.id;
  const createMutation = useCreateRule({});
  const editMutation = useEditRule({});
  const { data: articles } = useManagementArticles({}, {});

  const form = useForm<CostAllocationRuleFormValues>({
    resolver: zodResolver(getCostAllocationRuleSchema()),
    defaultValues: {
      name: initialValues?.name ?? '',
      sourceArticleId: initialValues?.sourceArticleId ?? (undefined as any),
      allocationKey: initialValues?.allocationKey ?? 'revenue',
      manualShares: initialValues?.manualShares ?? {},
      targetDealIds: initialValues?.targetDealIds ?? [],
      validFrom: initialValues?.validFrom ?? '',
      validTo: initialValues?.validTo ?? '',
      isActive: initialValues?.isActive ?? true,
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const allocationKey = form.watch('allocationKey');

  // Local raw text for the manual-shares JSON editor, so invalid input is shown
  // and flagged (instead of silently keeping the last valid value).
  const [manualSharesText, setManualSharesText] = React.useState(
    initialValues?.manualShares && Object.keys(initialValues.manualShares).length
      ? JSON.stringify(initialValues.manualShares, null, 2)
      : '',
  );
  const [manualSharesInvalid, setManualSharesInvalid] = React.useState(false);

  const expenseArticles = React.useMemo<ArticleRow[]>(
    () => ((articles ?? []) as ArticleRow[]).filter((a) => a.kind === 'expense'),
    [articles],
  );

  const onSubmit = async (values: CostAllocationRuleFormValues) => {
    try {
      if (isEdit && initialValues?.id != null) {
        await editMutation.mutateAsync([initialValues.id, values]);
      } else {
        await createMutation.mutateAsync(values);
      }
      toast.success(intl.get('cost_allocation.saved'));
      onDone();
    } catch {
      toast.error(intl.get('cost_allocation.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit
            ? intl.get('cost_allocation.action.edit')
            : intl.get('cost_allocation.action.create')}
        </CardTitle>
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
                  <FormLabel>{intl.get('cost_allocation.field.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source article (expense only) */}
            <FormField
              control={form.control}
              name="sourceArticleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('cost_allocation.field.source_article')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value == null ? '' : String(field.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? undefined : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="">—</option>
                      {expenseArticles.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Allocation key */}
            <FormField
              control={form.control}
              name="allocationKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('cost_allocation.field.key')}
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-2">
                      {ALLOCATION_KEYS.map((key) => (
                        <label key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            value={key}
                            checked={field.value === key}
                            onChange={() => field.onChange(key)}
                            name={field.name}
                          />
                          {intl.get(`cost_allocation.key.${key}`)}
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Manual shares editor — shown only when allocationKey === 'manual_share' */}
            {allocationKey === 'manual_share' && (
              <FormField
                control={form.control}
                name="manualShares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {intl.get('cost_allocation.field.manual_shares')}
                    </FormLabel>
                    <FormControl>
                      <textarea
                        className="border-input bg-background min-h-[80px] w-full rounded-md border px-3 py-2 text-sm font-mono"
                        placeholder={intl.get(
                          'cost_allocation.field.manual_shares_placeholder',
                        )}
                        value={manualSharesText}
                        onChange={(e) => {
                          const text = e.target.value;
                          setManualSharesText(text);
                          if (text.trim() === '') {
                            field.onChange({});
                            setManualSharesInvalid(false);
                            return;
                          }
                          try {
                            field.onChange(JSON.parse(text));
                            setManualSharesInvalid(false);
                          } catch {
                            setManualSharesInvalid(true);
                          }
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    {manualSharesInvalid && (
                      <p className="text-destructive text-sm">
                        {intl.get('cost_allocation.error.manual_shares_invalid')}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Valid from */}
            <FormField
              control={form.control}
              name="validFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('cost_allocation.field.valid_from')}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valid to */}
            <FormField
              control={form.control}
              name="validTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('cost_allocation.field.valid_to')}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)}
                      name={field.name}
                      ref={field.ref}
                    />
                    {intl.get('cost_allocation.field.active')}
                  </label>
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
                {intl.get('cost_allocation.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (allocationKey === 'manual_share' && manualSharesInvalid)
                }
              >
                {intl.get('cost_allocation.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
