import { useState, type ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  Download,
  Filter as FilterIcon,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';

import { Can } from '@/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { AbilitySubject, ManualJournalAction } from '@/constants/abilityOption';
import { DialogsName } from '@/constants/dialogs';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { useDownloadExportPdf } from '@/hooks/query/FinancialReports/use-export-pdf';
import { useRefreshJournals } from '@/hooks/query/manualJournals';
import { compose } from '@/utils';
import { useCanExport } from '@/hooks/utils/useAbilityContext';

import { useBulkDeleteManualJournalsDialog } from '../hooks/use-bulk-delete-manual-journals-dialog';
import { useManualJournalsContext } from '../ManualJournalsListProvider';
import { withManualJournals } from '../withManualJournals';
import { withManualJournalsActions } from '../withManualJournalsActions';

/** Условие расширенного фильтра — формат легаси (все четыре поля обязательны). */
export interface FilterRole {
  fieldKey: string;
  /** Логическая связка условий: 'and' | 'or' (легаси-дефолт — 'or'). */
  condition: string;
  /** Оператор сравнения: 'contain' | 'equal' | 'not_equal' | … */
  comparator: string;
  value: string;
}

interface ResourceView {
  id?: number | string;
  name: string;
  slug: string;
}

interface ResourceField {
  name: string;
  key: string;
  fieldType?: string;
}

const ALL_VIEWS_VALUE = '__all__';
const DEFAULT_FIELD_KEY = 'journal_number';
const DEFAULT_COMPARATOR = 'contain';
const DEFAULT_CONDITION = 'or';

const COMPARATOR_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: 'contain', labelKey: 'contain' },
  { value: 'equal', labelKey: 'equals' },
  { value: 'not_equal', labelKey: 'not_equal' },
];

/**
 * Расширенный фильтр (замена AdvancedFilterPopover): поле + условие + значение.
 * Применение отдаёт условия в том же формате, что и легаси ({fieldKey,
 * condition, comparator, value}) — серверный запрос не меняется.
 */
function ManualJournalsFilterPopover({
  fields,
  conditions,
  onFilterChange,
}: {
  fields: ResourceField[];
  conditions: FilterRole[];
  onFilterChange: (conditions: FilterRole[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fieldKey, setFieldKey] = useState(DEFAULT_FIELD_KEY);
  const [comparator, setComparator] = useState(DEFAULT_COMPARATOR);
  const [value, setValue] = useState('');

  // При открытии подхватываем первое активное условие из состояния таблицы.
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const first = conditions[0];
      setFieldKey(first?.fieldKey ?? DEFAULT_FIELD_KEY);
      setComparator(first?.comparator ?? DEFAULT_COMPARATOR);
      setValue(first?.value ?? '');
    }
    setOpen(nextOpen);
  };

  const handleApply = () => {
    const trimmed = value.trim();

    // Пустое значение равнозначно сбросу — легаси отбрасывал такие условия.
    onFilterChange(
      trimmed
        ? [{ fieldKey, comparator, condition: DEFAULT_CONDITION, value: trimmed }]
        : [],
    );
    setOpen(false);
  };

  const handleReset = () => {
    onFilterChange([]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <FilterIcon className="h-4 w-4" aria-hidden />
          {intl.get('filter')}
          {conditions.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {conditions.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleApply();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="journals-filter-field">
              {intl.get('toolbar.filter.field')}
            </Label>
            <Select value={fieldKey} onValueChange={setFieldKey}>
              <SelectTrigger id="journals-filter-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="journals-filter-comparator">
              {intl.get('toolbar.filter.condition')}
            </Label>
            <Select value={comparator} onValueChange={setComparator}>
              <SelectTrigger id="journals-filter-comparator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPARATOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {intl.get(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="journals-filter-value">
              {intl.get('filter.value')}
            </Label>
            <Input
              id="journals-filter-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              {intl.get('reset').trim()}
            </Button>
            <Button type="submit" variant="secondary" size="sm">
              {intl.get('apply')}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

interface ManualJournalsToolbarV2RootProps {
  // #withManualJournals
  manualJournalsSelectedRows?: number[];
  manualJournalsFilterConditions?: FilterRole[];
  manualJournalsViewSlug?: string | null;

  // #withManualJournalsActions
  setManualJournalsTableState: (state: Record<string, unknown>) => void;

  // #withDialogActions
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Панель действий журнала проводок (shadcn, замена ManualJournalActionsBar).
 */
function ManualJournalsToolbarV2Root({
  manualJournalsSelectedRows = [],
  manualJournalsFilterConditions = [],
  manualJournalsViewSlug,
  setManualJournalsTableState,
  openDialog,
}: ManualJournalsToolbarV2RootProps) {
  const history = useHistory();

  // Контекст списка (легаси-провайдер без типов) — кастуем локально.
  const { journalsViews = [], fields = [] } = (useManualJournalsContext() ??
    {}) as {
    journalsViews?: ResourceView[];
    fields?: ResourceField[];
  };

  const { refresh } = useRefreshJournals() as { refresh: () => void };

  const { downloadAsync: downloadExportPdf } = useDownloadExportPdf() as {
    downloadAsync: (values: { resource: string }) => Promise<unknown>;
  };

  const { openBulkDeleteDialog, isValidatingBulkDeleteManualJournals } =
    useBulkDeleteManualJournalsDialog() as {
      openBulkDeleteDialog: (ids: number[]) => Promise<void>;
      isValidatingBulkDeleteManualJournals: boolean;
    };

  // Смена вьюхи (кастомной вкладки) списка.
  const handleViewChange = (viewValue: string) => {
    setManualJournalsTableState({
      viewSlug: viewValue === ALL_VIEWS_VALUE ? null : viewValue,
    });
  };

  const handleFilterChange = (filterConditions: FilterRole[]) => {
    setManualJournalsTableState({ filterRoles: filterConditions });
  };

  const handleNewJournalBtnClick = () => {
    history.push('/make-journal-entry');
  };

  const handlePrintBtnClick = () => {
    downloadExportPdf({ resource: 'ManualJournal' });
  };

  const handleImportBtnClick = () => {
    history.push('/manual-journals/import');
  };

  // Выгрузка таблицей — отдельное право (FT-082 ТЗ-3): без него сервер
  // ответит 403, поэтому кнопку не показываем.
  const canExport = useCanExport();

  const handleExportBtnClick = () => {
    openDialog(DialogsName.Export, { resource: 'manual_journal' });
  };

  const handleBulkDelete = () => {
    openBulkDeleteDialog(manualJournalsSelectedRows);
  };

  // Режим массового выбора: панель с числом выбранных и удалением.
  if (manualJournalsSelectedRows.length > 0) {
    return (
      <div className="bigfin-ui">
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
          <span className="text-sm font-medium text-text-secondary tabular-nums">
            {manualJournalsSelectedRows.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-danger hover:text-danger"
            onClick={handleBulkDelete}
            disabled={isValidatingBulkDeleteManualJournals}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {intl.get('delete')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bigfin-ui">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2">
        <Select
          value={manualJournalsViewSlug ?? ALL_VIEWS_VALUE}
          onValueChange={handleViewChange}
        >
          <SelectTrigger
            className="h-9 w-auto min-w-[9rem] sm:h-9"
            aria-label={intl.get('table_views')}
          >
            <SelectValue placeholder={intl.get('table_views')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VIEWS_VALUE}>{intl.get('all')}</SelectItem>
            {journalsViews.map((view) => (
              <SelectItem key={view.slug} value={view.slug}>
                {view.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Can I={ManualJournalAction.Create} a={AbilitySubject.ManualJournal}>
          <Button size="sm" className="gap-1.5" onClick={handleNewJournalBtnClick}>
            <Plus className="h-4 w-4" aria-hidden />
            {intl.get('new_journal')}
          </Button>
        </Can>

        <ManualJournalsFilterPopover
          fields={fields}
          conditions={manualJournalsFilterConditions}
          onFilterChange={handleFilterChange}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-9 sm:w-9"
              aria-label={intl.get('more_actions')}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handlePrintBtnClick}>
              <Printer className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('print')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportBtnClick}>
              <Upload className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('import')}
            </DropdownMenuItem>
            {canExport && (
              <DropdownMenuItem onClick={handleExportBtnClick}>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('export')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-9 sm:w-9"
            aria-label={intl.get('refresh')}
            onClick={() => refresh()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const ManualJournalsToolbarV2 = compose(
  withManualJournalsActions,
  withManualJournals(
    ({
      manualJournalsSelectedRows,
      manualJournalsTableState,
    }: {
      manualJournalsSelectedRows: number[];
      manualJournalsTableState: {
        filterRoles?: FilterRole[];
        viewSlug?: string | null;
      };
    }) => ({
      manualJournalsSelectedRows,
      manualJournalsFilterConditions:
        manualJournalsTableState.filterRoles ?? [],
      manualJournalsViewSlug: manualJournalsTableState.viewSlug ?? null,
    }),
  ),
  withDialogActions,
)(ManualJournalsToolbarV2Root) as ComponentType<Record<string, never>>;
