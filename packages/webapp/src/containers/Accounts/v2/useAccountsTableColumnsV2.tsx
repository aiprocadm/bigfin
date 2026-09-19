import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { accountTypeLabel } from '@/utils/accountTypeLabel';
import {
  AccountsActionsMenuV2,
  type AccountRow,
  type AccountRowActions,
} from './AccountsActionsMenuV2';
import { accountBalanceText } from '@/utils/accountBalance';
import { useLegalEntities } from '@/hooks/query/legalEntities';
import {
  shouldShowLegalEntityBreakdown,
  type LegalEntityRow,
} from '@/containers/LegalEntities/legalEntityView';

/** Id колонки «Имя»: в ней DataTable рисует шеврон/отступ дерева. */
export const ACCOUNTS_TREE_COLUMN_ID = 'name';

/**
 * Колонки плана счетов для нового DataTable (react-table v7 формат):
 * код, имя (с деревом), тип, валюта, баланс (вправо, tabular-nums).
 */
export function useAccountsTableColumnsV2(actions: AccountRowActions) {
  const { data: entities } = useLegalEntities() as {
    data?: LegalEntityRow[];
  };

  /**
   * Колонка «Юрлицо» — правило «не навязывать» (§6.4 ТЗ, остаток Ю5).
   *
   * Пока юрлицо одно, колонка не появляется ВОВСЕ: она была бы столбцом с
   * одним и тем же словом в каждой строке. Именно юрлицо счёта решает, чьей
   * считается операция, поэтому как только юрлиц становится больше одного —
   * видеть это надо сразу, а не открывая каждый счёт.
   */
  const showLegalEntity = shouldShowLegalEntityBreakdown(entities);
  const entityNameById = new Map(
    (entities ?? []).map((entity) => [Number(entity.id), entity.name]),
  );

  return useMemo(
    () => [
      {
        id: 'code',
        Header: intl.get('code'),
        accessor: 'code',
        width: 90,
        Cell: ({ row }: { row: { original: AccountRow } }) =>
          row.original.code ? (
            <Badge variant="secondary" className="tabular-nums">
              {row.original.code}
            </Badge>
          ) : null,
      },
      {
        id: ACCOUNTS_TREE_COLUMN_ID,
        Header: intl.get('account_name'),
        accessor: 'name',
        width: 260,
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{row.original.name}</span>
              {!row.original.active && (
                <Badge variant="outline" className="shrink-0 font-normal text-text-muted">
                  {intl.get('inactive')}
                </Badge>
              )}
            </span>
            {row.original.description && (
              <span className="truncate text-xs text-text-muted">
                {row.original.description}
              </span>
            )}
          </span>
        ),
      },
      {
        id: 'type',
        Header: intl.get('type'),
        // Подпись типа — из словаря по ключу: сервер отдаёт её
        // по-английски (С1 карты v29).
        accessor: (row: AccountRow) =>
          accountTypeLabel(row.account_type, row.account_type_label),
        width: 150,
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <span className="text-text-secondary">
            {accountTypeLabel(
              row.original.account_type,
              row.original.account_type_label,
            )}
          </span>
        ),
      },
      {
        id: 'currency',
        Header: intl.get('currency'),
        accessor: 'currency_code',
        width: 90,
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <span className="text-text-secondary">
            {row.original.currency_code}
          </span>
        ),
      },
      ...(showLegalEntity
        ? [
            {
              id: 'legal_entity',
              Header: intl.get('legal_entities.col.entity'),
              accessor: 'legal_entity_id',
              width: 160,
              Cell: ({ row }: { row: { original: AccountRow } }) => (
                <span className="text-text-secondary">
                  {entityNameById.get(
                    Number((row.original as any).legal_entity_id),
                  ) ?? '—'}
                </span>
              ),
            },
          ]
        : []),
      {
        id: 'balance',
        Header: intl.get('balance'),
        accessor: 'amount',
        align: 'right',
        width: 140,
        // Счёт без движений — это ноль, а не «неизвестно» (С2 карты v29).
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <span>
            {accountBalanceText(
              row.original.amount,
              row.original.formatted_amount,
              row.original.currency_code,
            )}
          </span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: AccountRow } }) => (
          <AccountsActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions, showLegalEntity, entities],
  );
}
