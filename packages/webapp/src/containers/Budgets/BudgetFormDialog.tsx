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
import { getBudgetSchema, BudgetFormValues, Budget } from './schemas';
import { useCreateBudget, useEditBudget } from '@/hooks/query/budgets';

interface Props {
  budget?: Budget;
  onDone: () => void;
  onCancel: () => void;
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

export function BudgetFormDialog({ budget, onDone, onCancel }: Props) {
  const isEdit = !!budget?.id;
  const createMutation = useCreateBudget({});
  const editMutation = useEditBudget({});

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(getBudgetSchema()),
    defaultValues: {
      name: budget?.name ?? '',
      type: budget?.type ?? 'bdir',
      fiscalYear: budget?.fiscalYear ?? new Date().getFullYear(),
      activeScenario: (budget?.activeScenario as any) ?? 'realistic',
      branchId: budget?.branchId ?? null,
    },
  });

  const onSubmit = async (values: BudgetFormValues) => {
    const payload = {
      name: values.name,
      type: values.type,
      fiscalYear: values.fiscalYear,
      activeScenario: values.activeScenario,
      branchId: values.branchId ?? undefined,
    };
    try {
      if (isEdit && budget) await editMutation.mutateAsync([budget.id, payload]);
      else await createMutation.mutateAsync(payload);
      toast.success(intl.get('budgets.saved'));
      onDone();
    } catch (e) {
      toast.error(intl.get('budgets.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get(isEdit ? 'budgets.edit' : 'budgets.add')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('budgets.field.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('budgets.field.type')}</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="bdir">
                        {intl.get('budgets.type.bdir')}
                      </option>
                      <option value="bdds">
                        {intl.get('budgets.type.bdds')}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fiscalYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('budgets.field.year')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
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
              name="activeScenario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('budgets.field.scenario')}</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value ?? 'realistic'}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="optimistic">
                        {intl.get('budgets.scenario.optimistic')}
                      </option>
                      <option value="realistic">
                        {intl.get('budgets.scenario.realistic')}
                      </option>
                      <option value="pessimistic">
                        {intl.get('budgets.scenario.pessimistic')}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onCancel}>
                {intl.get('budgets.cancel')}
              </Button>
              <Button type="submit">{intl.get('budgets.save')}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
