// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

import { useTransactionRuleApplications } from '@/hooks/query/bank-rules';
import { formattedAmount } from '@/utils';

/**
 * История автоправил операции (FT-036 ТЗ-3): каждое применение — отдельная
 * запись с тем, что правило поставило. Применений нет — раздела нет.
 */
export function RuleApplicationsPanel({ transactionId }: { transactionId: number }) {
  const { data } = useTransactionRuleApplications(transactionId);
  const items: any[] = Array.isArray(data) ? data : [];
  if (items.length === 0) return null;

  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';
  const when = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  return (
    <section className="rounded-default border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-medium">{intl.get('rule_applications.title')}</h3>
      <ul className="flex flex-col gap-3 text-sm">
        {items.map((item) => {
          const ruleName = item.rule_name ?? item.ruleName;
          const splits: any[] = item.splits ?? [];
          return (
            <li key={item.id}>
              <div className="font-medium">
                {ruleName ?? intl.get('rule_applications.rule_deleted')}
                {(item.rule_exists ?? item.ruleExists) === false && ruleName && (
                  <span className="ml-2 text-xs text-text-muted">
                    {intl.get('rule_applications.rule_deleted_short')}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-secondary">{when(item.applied_at ?? item.appliedAt)}</div>
              <ul className="mt-1 text-xs text-text-secondary">
                {item.account && (
                  <li>{intl.get('rule_applications.account', { value: item.account })}</li>
                )}
                {item.project && (
                  <li>{intl.get('rule_applications.project', { value: item.project })}</li>
                )}
                {item.contact && (
                  <li>{intl.get('rule_applications.contact', { value: item.contact })}</li>
                )}
                {splits.map((split, index) => (
                  <li key={index}>
                    {intl.get('rule_applications.split', {
                      article: split.article ?? '—',
                      amount: formattedAmount(split.amount, ''),
                    })}
                    {split.project ? ` · ${split.project}` : ''}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
