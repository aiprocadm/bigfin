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
import { Checkbox } from '@/components/ui/checkbox';
import { getKpiTargetSchema, KpiTargetFormValues } from './schemas';
import {
  useEmployees,
  useCreateKpiTarget,
  useEditKpiTarget,
} from '@/hooks/query/payroll';

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

const safeNum = (raw: string) => {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

interface Props {
  target?: any; // when present → edit mode
  onDone: () => void;
  onCancel: () => void;
}

export function KpiTargetDialog({ target, onDone, onCancel }: Props) {
  const isEdit = !!target?.id;
  const createMutation = useCreateKpiTarget({});
  const editMutation = useEditKpiTarget({});
  const { data: employeesData } = useEmployees({ activeOnly: true }, {});
  const employees: any[] = employeesData ?? [];

  const form = useForm<KpiTargetFormValues>({
    resolver: zodResolver(getKpiTargetSchema()),
    defaultValues: {
      employeeId: target?.employeeId ?? 0,
      periodMonth: target?.periodMonth
        ? String(target.periodMonth).slice(0, 7)
        : '',
      metric: target?.metric ?? 'revenue',
      targetAmount: target?.targetAmount ?? 0,
      bonusRate: target?.bonusRate ?? 0,
      onlyIfAchieved: target?.onlyIfAchieved ?? false,
      note: target?.note ?? '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: KpiTargetFormValues) => {
    const payload = {
      employeeId: values.employeeId,
      periodMonth: values.periodMonth + '-01',
      metric: values.metric,
      targetAmount: values.targetAmount,
      bonusRate: values.bonusRate,
      onlyIfAchieved: values.onlyIfAchieved,
      note: values.note || undefined,
    };
    try {
      if (isEdit) {
        await editMutation.mutateAsync({ id: target.id, values: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(intl.get('payroll.kpi.target.saved'));
      onDone();
    } catch (err: any) {
      const hasType = (e: any, type: string) =>
        Boolean(e?.response?.data?.errors?.some((x: any) => x?.type === type));
      if (hasType(err, 'KPI_TARGET_MONTH_EXISTS')) {
        toast.error(intl.get('payroll.kpi.target.month_exists'));
      } else {
        toast.error(intl.get('payroll.kpi.target.save_error'));
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit
            ? intl.get('payroll.kpi.target.edit')
            : intl.get('payroll.kpi.target.add')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payroll.kpi.target.manager')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value ? String(field.value) : ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? 0 : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="">—</option>
                      {target?.employeeId != null &&
                        !employees.some((e) => e.id === target.employeeId) && (
                          <option value={target.employeeId}>
                            {target.employee?.fullName ??
                              `#${target.employeeId}`}
                          </option>
                        )}
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="periodMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.kpi.target.month')}</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metric"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.kpi.target.metric')}</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="revenue">
                        {intl.get('payroll.kpi.metric.revenue')}
                      </option>
                      <option value="profit">
                        {intl.get('payroll.kpi.metric.profit')}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.kpi.target.amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(safeNum(e.target.value))}
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
              name="bonusRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payroll.kpi.target.bonus_rate')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(safeNum(e.target.value))}
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
              name="onlyIfAchieved"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormLabel className="mb-0">
                      {intl.get('payroll.kpi.target.only_if_achieved')}
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.kpi.target.note')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
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
                {intl.get('payroll.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('payroll.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
