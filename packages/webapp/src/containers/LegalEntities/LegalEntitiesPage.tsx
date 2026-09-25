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
import { legalEntityFromForm, legalEntityToForm } from './legalEntityView';
import {
  canDeleteLegalEntity,
  formatOwnershipShare,
  type LegalEntityRow,
} from './legalEntityView';
import { PageTitle } from '@/components/ui/page-title';

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
  vatPayer: false,
  baseCurrency: '',
  directorName: '',
  legalAddress: '',
  actualAddress: '',
  bankName: '',
  bik: '',
  account: '',
  correspondentAccount: '',
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
    // ВАЖНО: подставляем ВСЕ поля, а не только видимые в таблице. Форма
    // отправляет на сервер всё разом, и поле, которое нечем заполнить,
    // уходит пустым — сервер честно затирает настоящее значение. Так
    // терялись КПП, ОГРН, директор и адрес: человек правил название, а
    // пропадали реквизиты.
    form.reset({ ...emptyValues, ...legalEntityToForm(entity) } as any);
    setFormOpen(true);
  };

  const onSubmit = async (values: LegalEntityFormValues) => {
    // Доля уходит числом: запятую с цифрового блока сервер не поймёт.
    // Банковские поля собираются в один объект — сервер хранит их вместе,
    // и печатные формы читают оттуда же.
    const payload = legalEntityFromForm(values);

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
        <PageTitle>
          {intl.get('legal_entities.page.title')}
        </PageTitle>
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
              <th className="p-3">{intl.get('legal_entities.col.state')}</th>
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
                {/*
                  Состояние — отдельной колонкой, а не только приглушённой
                  строкой (остаток Ю4). Приглушение легко не заметить, и
                  человек ищет, почему юрлица нет в отборах отчёта.
                */}
                <td className="p-3">
                  {intl.get(
                    entity.active
                      ? 'legal_entities.state.active'
                      : 'legal_entities.state.inactive',
                  )}
                </td>
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

              <h3 className="mt-2 border-t border-border pt-4 text-sm font-medium text-text-secondary">
                {intl.get('legal_entities.section.requisites')}
              </h3>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.full_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vatPayer"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={Boolean(field.value)}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">
                      {intl.get('legal_entities.vat_payer')}
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.base_currency')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="directorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.director_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <h3 className="mt-2 border-t border-border pt-4 text-sm font-medium text-text-secondary">
                {intl.get('legal_entities.section.addresses')}
              </h3>
              <FormField
                control={form.control}
                name="legalAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.legal_address')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actualAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.actual_address')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <h3 className="mt-2 border-t border-border pt-4 text-sm font-medium text-text-secondary">
                {intl.get('legal_entities.section.bank')}
              </h3>
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.bank_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bik"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.bik')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.account')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="correspondentAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('legal_entities.correspondent_account')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <h3 className="mt-2 border-t border-border pt-4 text-sm font-medium text-text-secondary">
                {intl.get('legal_entities.section.group')}
              </h3>
              <FormField
                control={form.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={Boolean(field.value)}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">
                      {intl.get('legal_entities.is_primary')}
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={Boolean(field.value)}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">
                      {intl.get('legal_entities.active')}
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
