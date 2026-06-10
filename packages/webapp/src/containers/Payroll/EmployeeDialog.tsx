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
import { employeeSchema, EmployeeFormValues } from './schemas';
import {
  useCreateEmployee,
  useEditEmployee,
} from '@/hooks/query/payroll';

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

interface Props {
  employee?: any;
  onDone: () => void;
  onCancel: () => void;
}

export function EmployeeDialog({ employee, onDone, onCancel }: Props) {
  const createMutation = useCreateEmployee({});
  const editMutation = useEditEmployee({});

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: employee?.fullName ?? '',
      position: employee?.position ?? '',
      employmentType: employee?.employmentType ?? 'staff',
      defaultSalary: employee?.defaultSalary ?? 0,
      active: employee?.active ?? true,
      note: employee?.note ?? '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      if (employee?.id) {
        await editMutation.mutateAsync({ id: employee.id, values });
      } else {
        await createMutation.mutateAsync(values);
      }
      toast.success(intl.get('payroll.employee.saved'));
      onDone();
    } catch {
      toast.error(intl.get('payroll.employee.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {employee?.id
            ? intl.get('payroll.employee.edit')
            : intl.get('payroll.employee.add')}
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
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.employee.full_name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.employee.position')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payroll.employee.employment_type')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="staff">
                        {intl.get('payroll.employment_type.staff')}
                      </option>
                      <option value="gph">
                        {intl.get('payroll.employment_type.gph')}
                      </option>
                      <option value="npd">
                        {intl.get('payroll.employment_type.npd')}
                      </option>
                      <option value="ip">
                        {intl.get('payroll.employment_type.ip')}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payroll.employee.default_salary')}
                  </FormLabel>
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
              name="active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="mb-0">
                      {intl.get('payroll.employee.active')}
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
                  <FormLabel>{intl.get('payroll.employee.note')}</FormLabel>
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
