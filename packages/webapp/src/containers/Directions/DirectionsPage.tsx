// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenError } from '@/components/ui/screen-error';
import { pickScreenState } from '@/components/ui/screen-state';
import { cn } from '@/lib/cn';
import {
  useCreateDirection,
  useDeleteDirection,
  useDirections,
  useEditDirection,
} from '@/hooks/query/projects';
import {
  canDeleteDirection,
  DIRECTION_STATUS,
  isDirectionActive,
  type ProjectRow,
} from './directionView';
import { PageTitle } from '@/components/ui/page-title';

interface DirectionFormValues {
  name: string;
  status: string;
}

const emptyValues: DirectionFormValues = {
  name: '',
  status: DIRECTION_STATUS.ACTIVE,
};

/**
 * Справочник направлений.
 *
 * ЧТО ЭТО. Ярлык, по которому предприниматель раскладывает деньги: «розница»,
 * «опт», «объект на Ленина». Его вешают на операцию и по нему смотрят отчёты.
 *
 * ЧЕМ НЕ ЯВЛЯЕТСЯ. Не управлением проектами с задачами, сроками и часами —
 * этим в Bigfin заняты «Сделки». Поэтому и полей здесь всего два: название и
 * состояние. Лишние поля в форме — это вопросы, на которые предприниматель не
 * знает ответа и которые всё равно останутся пустыми.
 *
 * ПОЧЕМУ ЭКРАН ПОЯВИЛСЯ ТОЛЬКО СЕЙЧАС. Поля «Проект» стояли в формах операций
 * с самого начала, но заводить направления было НЕГДЕ: серверных ручек не
 * существовало ни одной, и поля всегда оставались пустыми.
 */
export default function DirectionsPage() {
  const { data: directions, isLoading, isError, refetch } = useDirections();
  const createMutation = useCreateDirection();
  const editMutation = useEditDirection();
  const deleteMutation = useDeleteDirection();

  const [editing, setEditing] = React.useState<ProjectRow | null>(null);
  const [isFormOpen, setFormOpen] = React.useState(false);

  const form = useForm<DirectionFormValues>({ defaultValues: emptyValues });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyValues);
    setFormOpen(true);
  };

  const openEdit = (direction: ProjectRow) => {
    setEditing(direction);
    form.reset({
      name: direction.name,
      status: direction.status || DIRECTION_STATUS.ACTIVE,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: DirectionFormValues) => {
    if (!values.name.trim()) {
      form.setError('name', {
        message: intl.get('directions.error.name_required'),
      });
      return;
    }
    try {
      if (editing) {
        await editMutation.mutateAsync([editing.id, values]);
      } else {
        await createMutation.mutateAsync(values);
      }
      toast.success(intl.get('directions.saved'));
      setFormOpen(false);
    } catch {
      toast.error(intl.get('directions.save_error'));
    }
  };

  const onDelete = async (direction: ProjectRow) => {
    try {
      await deleteMutation.mutateAsync(direction.id);
      toast.success(intl.get('directions.deleted'));
    } catch {
      // Последнее слово за сервером: операции могли появиться только что.
      toast.error(intl.get('directions.delete_error'));
    }
  };

  const state = pickScreenState({ isLoading, isError });

  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="p-6">
        <ScreenError
          message={intl.get('directions.error.title')}
          onRetry={() => refetch?.()}
        />
      </div>
    );
  }

  const rows: ProjectRow[] = directions ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <PageTitle>
          {intl.get('directions.page.title')}
        </PageTitle>
        <Button type="button" onClick={openCreate}>
          {intl.get('directions.add')}
        </Button>
      </div>

      <p className="text-sm text-text-muted">
        {intl.get('directions.page.hint')}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-control border border-border p-6 text-sm text-text-secondary">
          {intl.get('directions.empty')}
        </p>
      ) : (
        /* Таблица скроллится по горизонтали на телефоне. */
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="p-3">{intl.get('directions.col.name')}</th>
                <th className="p-3">{intl.get('directions.col.state')}</th>
                <th className="p-3 text-right">
                  {intl.get('directions.col.operations')}
                </th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((direction) => (
                <tr
                  key={direction.id}
                  className={cn(
                    'border-b border-border/60',
                    !isDirectionActive(direction) && 'text-text-muted',
                  )}
                >
                  <td className="p-3">{direction.name}</td>
                  <td className="p-3">
                    {intl.get(
                      isDirectionActive(direction)
                        ? 'directions.state.active'
                        : 'directions.state.archived',
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {direction.transactionsCount}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(direction)}
                    >
                      {intl.get('edit')}
                    </Button>
                    {/*
                      Кнопку удаления прячем там, где сервер всё равно
                      откажет: у направления с операциями.
                    */}
                    {canDeleteDirection(direction) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={() => onDelete(direction)}
                      >
                        {intl.get('delete')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <section className="rounded-control border border-border p-4">
          <h2 className="mb-3 text-base font-medium">
            {intl.get(
              editing ? 'directions.form.edit' : 'directions.form.create',
            )}
          </h2>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex max-w-md flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('directions.col.name')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={intl.get('directions.name.placeholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={field.value !== DIRECTION_STATUS.ARCHIVED}
                        onChange={(event) =>
                          field.onChange(
                            event.target.checked
                              ? DIRECTION_STATUS.ACTIVE
                              : DIRECTION_STATUS.ARCHIVED,
                          )
                        }
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">
                      {intl.get('directions.state.active')}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit">{intl.get('save')}</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setFormOpen(false)}
                >
                  {intl.get('cancel')}
                </Button>
              </div>
            </form>
          </Form>
        </section>
      )}
    </div>
  );
}
