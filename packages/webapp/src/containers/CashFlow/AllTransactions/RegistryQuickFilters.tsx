// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSaveRegistryFilters, useSavedRegistryFilters } from '@/hooks/query/registryFilters';
import type { ScreenFilters } from './allTransactionsFilters';
import {
  applySavedFilter,
  removeSavedFilter,
  upsertSavedFilter,
  type SavedRegistryFilter,
} from './savedRegistryFilters';

type TypeChip = 'all' | 'in' | 'out' | 'uncategorized';

/** Какая кнопка ряда типов нажата сейчас. */
export const activeTypeChip = (filters: ScreenFilters): TypeChip =>
  filters.status === 'uncategorized' ? 'uncategorized' : filters.flow ?? 'all';

/**
 * Ряд типов операций (FT-020 ТЗ-3): «Все · Поступления · Выплаты · Без
 * статьи (N)». Число в последней кнопке — то же, что в списке «ждут
 * разноски»: оно из того же запроса, и разойтись им не с чего.
 */
export function RegistryTypeChips({
  filters,
  patch,
  uncategorizedCount,
}: {
  filters: ScreenFilters;
  patch: (part: Partial<ScreenFilters>) => void;
  uncategorizedCount: number;
}) {
  const active = activeTypeChip(filters);
  const chips: Array<{ id: TypeChip; label: string }> = [
    { id: 'all', label: intl.get('all_transactions.flow.all') },
    { id: 'in', label: intl.get('all_transactions.flow.in') },
    { id: 'out', label: intl.get('all_transactions.flow.out') },
    {
      id: 'uncategorized',
      label: intl.get('all_transactions.chip.uncategorized', { count: uncategorizedCount }),
    },
  ];
  const select = (id: TypeChip) =>
    patch(
      id === 'uncategorized'
        ? { status: 'uncategorized', flow: undefined }
        : { status: undefined, flow: id === 'all' ? undefined : id },
    );
  // Тип — сегменты (UI-044-1 ТЗ-4, пилот): выбирается ровно один, а ряд
  // кнопок с чернильной заливкой спорил с главной кнопкой экрана.
  return (
    <SegmentedControl
      aria-label={intl.get('all_transactions.chip.label')}
      value={active}
      onChange={select}
      options={chips.map((chip) => ({
        value: chip.id,
        label:
          chip.id === 'uncategorized' && uncategorizedCount > 0 && active !== chip.id ? (
            <span className="text-warning">{chip.label}</span>
          ) : (
            chip.label
          ),
      }))}
    />
  );
}

/**
 * «Быстрые фильтры» (FT-021 ТЗ-3): личные и общие для организации.
 * «Сохранить фильтр» запоминает все отборы экрана под именем.
 */
export function SavedFiltersMenu({
  filters,
  onApply,
}: {
  filters: ScreenFilters;
  onApply: (filters: ScreenFilters) => void;
}) {
  const { personal, shared } = useSavedRegistryFilters();
  const [saving, setSaving] = React.useState(false);

  const item = (saved: SavedRegistryFilter) => (
    <DropdownMenuItem key={`${saved.shared}-${saved.id}`} onSelect={() => onApply(applySavedFilter(saved))}>
      {saved.name}
    </DropdownMenuItem>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary">
            {intl.get('all_transactions.saved_filters.title')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {personal.length > 0 && (
            <>
              <DropdownMenuLabel>{intl.get('all_transactions.saved_filters.personal')}</DropdownMenuLabel>
              {personal.map(item)}
            </>
          )}
          {shared.length > 0 && (
            <>
              <DropdownMenuLabel>{intl.get('all_transactions.saved_filters.shared')}</DropdownMenuLabel>
              {shared.map(item)}
            </>
          )}
          {personal.length + shared.length === 0 && (
            <DropdownMenuLabel className="font-normal text-text-muted">
              {intl.get('all_transactions.saved_filters.empty')}
            </DropdownMenuLabel>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSaving(true)}>
            {intl.get('all_transactions.saved_filters.save')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {saving && (
        <SaveFilterDialog filters={filters} personal={personal} shared={shared} onClose={() => setSaving(false)} />
      )}
    </>
  );
}

function SaveFilterDialog({
  filters,
  personal,
  shared,
  onClose,
}: {
  filters: ScreenFilters;
  personal: SavedRegistryFilter[];
  shared: SavedRegistryFilter[];
  onClose: () => void;
}) {
  const [name, setName] = React.useState('');
  const [isShared, setIsShared] = React.useState(false);
  const { mutateAsync, isLoading } = useSaveRegistryFilters();

  const persist = async (sharedScope: boolean, list: SavedRegistryFilter[], doneKey: string) => {
    try {
      await mutateAsync({ shared: sharedScope, list });
      AppToaster.show({ message: intl.get(doneKey), intent: Intent.SUCCESS });
      return true;
    } catch {
      // Общие фильтры меняет тот, у кого есть право на настройки организации.
      AppToaster.show({
        message: intl.get(sharedScope ? 'all_transactions.saved_filters.shared_denied' : 'all_transactions.saved_filters.failed'),
        intent: Intent.DANGER,
      });
      return false;
    }
  };

  const save = async () => {
    const list = upsertSavedFilter(isShared ? shared : personal, name, filters, isShared);
    if (await persist(isShared, list, 'all_transactions.saved_filters.saved')) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{intl.get('all_transactions.saved_filters.save')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            maxLength={60}
            value={name}
            placeholder={intl.get('all_transactions.saved_filters.name')}
            onChange={(event) => setName(event.target.value)}
          />
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" checked={isShared} onChange={(event) => setIsShared(event.target.checked)} />
            {intl.get('all_transactions.saved_filters.shared_toggle')}
          </label>
          {[...personal, ...shared].length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">{intl.get('all_transactions.saved_filters.existing')}</span>
              {[...personal, ...shared].map((saved) => (
                <div key={`${saved.shared}-${saved.id}`} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {saved.name}
                    {saved.shared && (
                      <span className="text-text-muted"> · {intl.get('all_transactions.saved_filters.shared_mark')}</span>
                    )}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() =>
                      persist(
                        saved.shared,
                        removeSavedFilter(saved.shared ? shared : personal, saved.id),
                        'all_transactions.saved_filters.removed',
                      )
                    }
                  >
                    {intl.get('delete')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {intl.get('cancel')}
          </Button>
          <Button type="button" disabled={isLoading || !name.trim()} onClick={save}>
            {intl.get('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
