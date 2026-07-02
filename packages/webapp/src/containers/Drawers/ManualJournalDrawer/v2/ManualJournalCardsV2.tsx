import { ReactNode, useMemo } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Features } from '@/constants';
import { useFeatureCan } from '@/hooks/state';
import { formattedAmount } from '@/utils';

import type { ManualJournalDetail, ManualJournalEntry } from './types';

const EMPTY_VALUE = '—';

/** Строка «подпись — значение» с волосяным разделителем. */
function DetailRow({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-text-muted">{label}</dt>
      <dd className="m-0 text-right text-sm text-text-primary">
        {children ?? EMPTY_VALUE}
      </dd>
    </div>
  );
}

// useFeatureCan — легаси-хук без типов, кастуем результат локально.
interface UseFeatureCanResult {
  featureCan: (feature: string) => boolean;
}

/**
 * Формат сумм дебета/кредита: без символа валюты, нули — пустая ячейка
 * (как легаси FormatNumber с noZero). formattedAmount — легаси, 3 аргумента.
 */
const formatEntryAmount = (value?: number): string =>
  formattedAmount(value ?? 0, '', { noZero: true });

const getEntryRowId = (row: ManualJournalEntry) =>
  String(row.id ?? row.index ?? '');

/** Колонки строк проводки для нового DataTable (react-table v7 формат). */
function useManualJournalEntriesColumnsV2(showBranch: boolean) {
  return useMemo(
    () => [
      {
        id: 'account',
        Header: intl.get('account_name'),
        accessor: 'account.name',
        width: 130,
        disableSortBy: true,
      },
      {
        id: 'contact',
        Header: intl.get('contact'),
        accessor: 'contact.display_name',
        width: 100,
        disableSortBy: true,
        Cell: ({ value }: { value?: string }) => (
          <span className="text-text-secondary">{value || EMPTY_VALUE}</span>
        ),
      },
      {
        id: 'note',
        Header: intl.get('note'),
        accessor: 'note',
        width: 100,
        disableSortBy: true,
        Cell: ({ value }: { value?: string }) => (
          <span className="text-text-secondary">{value || EMPTY_VALUE}</span>
        ),
      },
      ...(showBranch
        ? [
            {
              id: 'branch',
              Header: intl.get('branch'),
              accessor: 'branch.name',
              width: 100,
              disableSortBy: true,
            },
          ]
        : []),
      {
        id: 'debit',
        Header: intl.get('debit'),
        accessor: 'debit',
        align: 'right',
        width: 90,
        disableSortBy: true,
        Cell: ({ value }: { value?: number }) => (
          <span className="font-medium">{formatEntryAmount(value)}</span>
        ),
      },
      {
        id: 'credit',
        Header: intl.get('credit'),
        accessor: 'credit',
        align: 'right',
        width: 90,
        disableSortBy: true,
        Cell: ({ value }: { value?: number }) => (
          <span className="font-medium">{formatEntryAmount(value)}</span>
        ),
      },
    ],
    [showBranch],
  );
}

/**
 * Карточки деталей проводки: сумма и реквизиты (деньги — tabular-nums),
 * затем таблица дебет/кредит с итогами. Пустые значения — спокойное «—».
 */
export function ManualJournalCardsV2({
  manualJournal,
}: {
  manualJournal: ManualJournalDetail;
}) {
  const { featureCan } = useFeatureCan() as UseFeatureCanResult;
  const showBranch = featureCan(Features.Branches);

  const columns = useManualJournalEntriesColumnsV2(showBranch);
  const entries = manualJournal.entries ?? [];

  // Подытог — как в легаси-футере (FormatNumber от amount, без валюты).
  const subtotal = formattedAmount(manualJournal.amount ?? 0, '', undefined);

  return (
    <>
      {/* Сумма: главное число крупно, реквизиты — волосяными строками. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">{intl.get('total')}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {manualJournal.formatted_amount || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('journal_type')}>
            {manualJournal.journal_type || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('journal_no')}>
            {manualJournal.journal_number || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('reference_no')}>
            {manualJournal.reference || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('currency')}>
            {manualJournal.currency_code || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('description')}>
            {manualJournal.description || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Таблица дебет/кредит + итоги. */}
      <Card className="p-4 sm:p-5">
        <h3 className="text-sm font-medium text-text-secondary">
          {intl.get('journal_entries')}
        </h3>

        <div className="mt-3">
          <DataTable
            columns={columns}
            data={entries}
            getRowId={getEntryRowId}
          />
        </div>

        {/* Итоги: в сбалансированной проводке дебет = кредит, поэтому
            значение одно (легаси печатал одно и то же число дважды). */}
        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('manual_journal.details.subtotal')}>
            <span className="tabular-nums">{subtotal}</span>
          </DetailRow>
          <DetailRow label={intl.get('manual_journal.details.total')}>
            <span className="font-semibold tabular-nums">
              {manualJournal.formatted_amount || EMPTY_VALUE}
            </span>
          </DetailRow>
        </dl>
      </Card>
    </>
  );
}
