// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDrawerActions } from '@/hooks/state/dashboard';
import {
  useDataQualityCrookedJournals,
  useRepostCrookedJournals,
} from '@/hooks/query/dataQuality';
import { resolveReferenceDrawer } from './drawerUtils';
import { fmt, fmtDate } from './utils';

interface Props {
  fromDate: string;
  toDate: string;
}

/**
 * «Валютные проводки без курса» (вопрос 28 карты v16).
 *
 * До починки Р1 среза 3 ручная проводка в валюте уходила в журнал без
 * умножения на курс: 1000 USD при курсе 80 лежат как 1000 ₽, и дебет с
 * кредитом сходятся — беда бесшумна. Вкладка показывает накопленные кривые
 * проводки; перепроведение — по явной кнопке, молча ничего не меняется.
 */
export function CrookedCurrencyTab({ fromDate, toDate }: Props) {
  const { data } = useDataQualityCrookedJournals({ fromDate, toDate }, {});
  const { openDrawer } = useDrawerActions();

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [repostResult, setRepostResult] = React.useState<any>(null);
  const [repostError, setRepostError] = React.useState(false);

  const { mutateAsync: repost, isLoading: isReposting } =
    useRepostCrookedJournals();

  const journals: any[] = data?.journals ?? [];
  const total = data?.totalJournals ?? 0;

  const handleClick = (row: any) => {
    const target = resolveReferenceDrawer('Journal', row.journalId);
    if (target) openDrawer(target.name, target.payload);
  };

  const handleRepost = () => {
    setConfirmOpen(false);
    setRepostError(false);
    setRepostResult(null);

    repost({ fromDate, toDate })
      .then((res: any) => setRepostResult(res?.data?.data ?? res?.data ?? {}))
      .catch(() => setRepostError(true));
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {intl.get('data_quality.crooked.title')}
      </h2>
      <p className="text-muted-foreground text-sm">
        {intl.get('data_quality.crooked.hint')}
      </p>

      <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
        <p className="text-muted-foreground text-sm">
          {intl.get('data_quality.crooked.repost_hint')}
        </p>
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={isReposting || journals.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {isReposting
              ? intl.get('data_quality.repost.running')
              : intl.get('data_quality.crooked.repost_button')}
          </Button>
        </div>
        {repostResult && (
          <div className="text-sm">
            {repostResult.reposted > 0
              ? intl.get('data_quality.crooked.repost_done', {
                  reposted: repostResult.reposted,
                })
              : intl.get('data_quality.repost.nothing')}
            {repostResult.failed > 0 && (
              <span className="ml-1 text-red-600">
                {intl.get('data_quality.repost.failed', {
                  failed: repostResult.failed,
                })}
              </span>
            )}
          </div>
        )}
        {repostError && (
          <div className="text-sm text-red-600">
            {intl.get('data_quality.repost.error')}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={intl.get('data_quality.crooked.confirm_title')}
        description={intl.get('data_quality.crooked.confirm_description')}
        confirmLabel={intl.get('data_quality.repost.confirm_label')}
        loading={isReposting}
        onConfirm={handleRepost}
        onCancel={() => setConfirmOpen(false)}
      />

      {journals.length > 0 && (
        <div className="text-sm">
          {intl.get('data_quality.crooked.total', {
            count: total,
            amount: fmt(data?.totalDifference),
          })}
        </div>
      )}

      <div className="flex flex-col divide-y rounded-md border">
        {journals.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('data_quality.crooked.empty')}
          </div>
        )}
        {journals.map((row) => {
          const clickable = !!resolveReferenceDrawer('Journal', row.journalId);
          return (
            <div
              key={row.journalId}
              className={
                'flex items-center justify-between gap-3 px-4 py-3 text-sm' +
                (clickable ? ' hover:bg-muted/50 cursor-pointer' : '')
              }
              onClick={clickable ? () => handleClick(row) : undefined}
            >
              <span className="flex flex-col">
                <span className="font-medium">
                  {intl.get('data_quality.crooked.journal')}
                  {row.journalNumber ? ` · ${row.journalNumber}` : ''}
                </span>
                <span className="text-muted-foreground text-xs">
                  {fmtDate(row.date)}
                  {' · '}
                  {fmt(row.amount)} {row.currencyCode}
                  {' × '}
                  {row.exchangeRate}
                  {' · '}
                  {intl.get('data_quality.crooked.in_journal')}:{' '}
                  {fmt(row.journalTotal)}
                </span>
              </span>
              <span className="font-medium text-red-600">
                −{fmt(row.difference)}
              </span>
            </div>
          );
        })}
      </div>

      {total > journals.length && (
        <div className="text-muted-foreground text-xs">
          {intl.get('data_quality.unbalanced.truncated', {
            shown: journals.length,
            total,
          })}
        </div>
      )}
    </div>
  );
}
