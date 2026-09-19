// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  useCreateLegalEntity,
  useDeleteLegalEntity,
  useEditLegalEntity,
  useLegalEntities,
} from '@/hooks/query/legalEntities';
import {
  ORGANIZATION_LEGAL_FORMS,
  TAX_REGIMES,
} from '@/containers/Preferences/General/requisitesOptions';

import {
  getLegalEntitySchema,
  type LegalEntityFormValues,
} from './legalEntity.zod';
import {
  canDeleteLegalEntity,
  formatOwnershipShare,
  type LegalEntityRow,
} from './legalEntityView';

const selectClassName =
  'border-input bg-background h-9 w-full rounded-control border px-3 text-sm';

const emptyValues = {
  name: '',
  fullName: '',
  form: 'ООО',
  inn: '',
  kpp: '',
  ogrn: '',
  taxSystem: '',
  directorName: '',
  legalAddress: '',
  ownershipShare: '100',
  isPrimary: false,
  active: true,
};

/**
 * Справочник юрлиц (этап 6 ТЗ, §6.4).
 *
 * Списки форм и налоговых режимов берутся оттуда же, откуда реквизиты
 * организации, — иначе в двух местах продукта оказались бы разные наборы
 * одних и тех же понятий.
 */
export default function LegalEntitiesPage() {
  const { data: entities, isLoading, isError, refetch } = useLegalEntities();
  const createMutation = useCreateLegalEntity();
  const editMutation = useEditLegalEntity();
  const deleteMutation = useDeleteLegalEntity();

  const [editing, setEditing] = React.useState<LegalEntityRow | null>(null);
  const [isFormOpen, setFormOpen] = React.useState(false);

  const form = useForm<LegalEntityFormValues>({
    resolver: zodResolver(getLegalEntitySchema()),
    defaultValues: emptyValues as any,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyValues as any);
    setFormOpen(true);
  };

  const openEdit = (entity: LegalEntityRow) => {
    setEditing(entity);
    form.reset({
      ...emptyValues,
      name: entity.name,
      form: entity.form,
      inn: entity.inn ?? '',
      taxSystem: entity.taxSystem ?? '',
      ownershipShare: String(entity.ownershipShare ?? 100),
      isPrimary: entity.isPrimary,
      active: entity.active,
    } as any);
    setFormOpen(true);
  };

  const onSubmit = async (values: LegalEntityFormValues) => {
    // Доля уходит числом: запятую с цифрового блока сервер не поймёт.
    const payload = {
      ...values,
      ownershipShare: Number(String(values.ownershipShare).replace(',', '.')),
    };

    try {
      if (editing) {
        await editMutation.mutateAsync([editing.id, payload]);
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(intl.get('legal_entities.saved'));
      setFormOpen(false);
    } catch {
      toast.error(intl.get('legal_entities.save_error'));
    }
  };

  const onDelete = async (entity: LegalEntityRow) => {
    try {
      await deleteMutation.mutateAsync(entity.id);
      toast.success(intl.get('legal_entities.deleted'));
    } catch {
      // Последнее слово за сервером: операции висят не только на счетах.
      toast.error(intl.get('legal_entities.delete_error'));
    }
  };

  // Четыре состояния экрана (§5.3 ТЗ): загрузка важнее ошибки,
  // ошибка важнее пустоты.
  const screenState = pickScreenState({ isLoading, isError });

  if (screenState === 'loading') {
    return <Skeleton className="m-6 h-96 w-full" />;
  }

  if (screenState === 'error') {
    return (
      <div className="p-6">
        <ScreenError
          message={intl.get('legal_entities.error')}
          onRetry={() => refetch?.()}
        />
      </div>
    );
  }

  const rows: LegalEntityRow[] = entities ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">
          {intl.get('legal_entities.page.title')}
        </h1>
        <Button type="button" onClick={openCreate}>
          {intl.get('legal_entities.add')}
        </Button>
      </div>

      <p className="text-sm text-text-muted">
        {intl.get('legal_entities.page.hint')}
      </p>

      {/* Таблица скроллится по горизонтали на телефоне. */}
      <div className="overflow-x-auto rounded-control border border-border">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              <th className="p-3">{intl.get('legal_entities.col.name')}</th>
              <th className="p-3">{intl.get('legal_entities.col.form')}</th>
              <th className="p-3">{intl.get('legal_entities.col.inn')}</th>
              <th className="p-3">{intl.get('legal_entities.col.tax')}</th>
              <th className="p-3 text-right">
                {intl.get('legal_entities.col.share')}
              </th>
              <th className="p-3 text-right">
                {intl.get('legal_entities.col.accounts')}
              </th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((entity) => (
              <tr
                key={entity.id}
                className={cn(
                  'border-b border-border/60',
                  !entity.active && 'text-text-muted',
                )}
              >
                <td className="p-3">
                  {entity.name}
                  {entity.isPrimary && (
                    <span className="ml-2 text-xs text-text-muted">
                      {intl.get('legal_entities.primary')}
                    </span>
                  )}
                </td>
                <td className="p-3">{entity.form}</td>
                <td className="p-3 tabular-nums">{entity.inn ?? '—'}</td>
                <td className="p-3">{entity.taxSystem ?? '—'}</td>
                <td className="p-3 text-right tabular-nums">
                  {formatOwnershipShare(entity.ownershipShare)}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {entity.accountsCount}
                </td>
                <td className="p-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(entity)}
                  >
                    {intl.get('edit')}
                  </Button>
                  {/*
                    Кнопку удаления прячем там, где сервер всё равно откажет:
                    у юрлица со счетами и у единственного.
                  */}
                  {canDeleteLegalEntity(entity, rows) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onClick={() => onDelete(entity)}
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

      {isFormOpen && (
        <section className="rounded-control border border-border p-4">
          <h2 className="mb-3 text-sm font-medium">
            {intl.get(
              editing ? 'legal_entities.edit_title' : 'legal_entities.add',
            )}
          </h2>

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
                    <FormLabel>
                      {intl.get('legal_entities.col.name')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="form"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {intl.get('legal_entities.col.form')}
                    </FormLabel>
                    <FormControl>
                      <select className={selectClassName} {...field}>
                        {ORGANIZATION_LEGAL_FORMS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {intl.get(option.labelKey)}
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
                name="inn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.col.inn')}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
                    </FormControl>
                    <p className="text-sm text-text-muted">
                      {intl.get('legal_entities.inn.hint')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kpp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.kpp')}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ogrn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.ogrn')}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.col.tax')}</FormLabel>
                    <FormControl>
                      <select className={selectClassName} {...field}>
                        <option value="">—</option>
                        {TAX_REGIMES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {intl.get(option.labelKey)}
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
                name="ownershipShare"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>
                      {intl.get('legal_entities.col.share')}
                    </FormLabel>
                    <FormControl>
                      {/*
                        Текстовое поле, а не числовое: браузер в числовом
                        выбрасывает запятую, а на цифровом блоке русской
                        раскладки набирается именно она.
                      */}
                      <Input {...field} inputMode="decimal" />
                    </FormControl>
                    <p className="text-sm text-text-muted">
                      {intl.get('legal_entities.share.hint')}
                    </p>
                    <FormMessage />
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
