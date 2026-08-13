// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useDrawerActions } from '@/hooks/state/dashboard';
import { useDataQualityFailedMails } from '@/hooks/query/dataQuality';
import { resolveReferenceDrawer } from './drawerUtils';
import { fmtDate, refTypeLabel } from './utils';

/**
 * «Письма не отправлены»: сводка окончательных падений почты за неделю.
 *
 * Каждое падение уже приходит в ленту уведомлений по одному, а здесь — общая
 * картина для владельца: если почта сломалась, счётчик покажет масштаб, а не
 * одну строчку в колокольчике.
 */
export function FailedMailsTab() {
  const { data } = useDataQualityFailedMails({});
  const { openDrawer } = useDrawerActions();

  const items: any[] = data?.items ?? [];
  const count = data?.count ?? 0;

  const handleClick = (row: any) => {
    const target = resolveReferenceDrawer(row.documentType, row.documentId);
    if (target) openDrawer(target.name, target.payload);
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {intl.get('data_quality.failed_mails.title')}
      </h2>
      <p className="text-muted-foreground text-sm">
        {intl.get('data_quality.failed_mails.description')}
      </p>

      {count === 0 ? (
        <p className="text-sm">{intl.get('data_quality.failed_mails.empty')}</p>
      ) : (
        <>
          <p className="text-sm font-medium">
            {intl.get('data_quality.failed_mails.count', { count })}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-2 pr-4">
                    {intl.get('data_quality.failed_mails.when')}
                  </th>
                  <th className="py-2 pr-4">
                    {intl.get('data_quality.failed_mails.document')}
                  </th>
                  <th className="py-2">
                    {intl.get('data_quality.failed_mails.reason')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => {
                  const clickable = Boolean(
                    resolveReferenceDrawer(row.documentType, row.documentId),
                  );
                  return (
                    <tr
                      key={index}
                      className={
                        'border-b ' +
                        (clickable ? 'hover:bg-muted/50 cursor-pointer' : '')
                      }
                      onClick={() => clickable && handleClick(row)}
                    >
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {fmtDate(row.firedAt)}
                      </td>
                      <td className="py-2 pr-4">
                        {refTypeLabel(row.documentType)}
                        {row.documentId ? ` №${row.documentId}` : ''}
                      </td>
                      <td className="text-muted-foreground py-2">
                        {row.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data?.truncated && (
            <p className="text-muted-foreground text-xs">
              {intl.get('data_quality.failed_mails.truncated')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
