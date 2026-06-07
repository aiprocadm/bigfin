// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateStage, useEditStage } from '@/hooks/query/dealStages';
import { getDealStageSchema, DealStageFormValues } from './stageSchemas';

interface Props {
  dealId: number | string;
  stage?: any; // present → edit mode
  defaultStatus?: 'open' | 'closed';
  onDone: () => void;
  onCancel: () => void;
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

export function DealStageDialog({ dealId, stage, defaultStatus, onDone, onCancel }: Props) {
  const isEdit = !!stage?.id;
  const createMutation = useCreateStage(dealId, {});
  const editMutation = useEditStage(dealId, {});

  const form = useForm<DealStageFormValues>({
    resolver: zodResolver(getDealStageSchema()),
    defaultValues: {
      name: stage?.name ?? '',
      plannedRevenue: stage?.plannedRevenue ?? undefined,
      plannedCost: stage?.plannedCost ?? undefined,
      sortOrder: stage?.sortOrder ?? undefined,
      status: defaultStatus ?? stage?.status ?? 'open',
      closedDate: stage?.closedDate ?? '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: DealStageFormValues) => {
    const payload = {
      name: values.name,
      plannedRevenue: values.plannedRevenue ?? undefined,
      plannedCost: values.plannedCost ?? undefined,
      sortOrder: values.sortOrder ?? undefined,
      status: values.status || undefined,
      closedDate: values.closedDate || undefined, // '' → undefined (server @IsDateString)
    };
    try {
      if (isEdit) {
        await editMutation.mutateAsync([stage.id, payload as any]);
      } else {
        await createMutation.mutateAsync(payload as any);
      }
      toast.success(intl.get('deal_stages.saved'));
      onDone();
    } catch {
      toast.error(intl.get('deal_stages.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.get(isEdit ? 'deal_stages.action.edit' : 'deal_stages.action.add')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('deal_stages.field.name')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="plannedRevenue" render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('deal_stages.field.planned_revenue')}</FormLabel>
                <FormControl>
                  <Input type="number" value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    onBlur={field.onBlur} name={field.name} ref={field.ref} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="plannedCost" render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('deal_stages.field.planned_cost')}</FormLabel>
                <FormControl>
                  <Input type="number" value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    onBlur={field.onBlur} name={field.name} ref={field.ref} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('deal_stages.field.status')}</FormLabel>
                <FormControl>
                  <select className={selectClassName} value={field.value ?? 'open'}
                    onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref}>
                    <option value="open">{intl.get('deal_stages.status.open')}</option>
                    <option value="closed">{intl.get('deal_stages.status.closed')}</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="closedDate" render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('deal_stages.field.closed_date')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
                {intl.get('deal_stages.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('deal_stages.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
