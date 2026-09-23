// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyField } from '@/components/ui/money-field';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { cn } from '@/lib/cn';
import {
  amountFromPercent,
  equalSplit,
  evaluateSplit,
  percentOf,
  suggestedAmount,
  type SplitLine,
} from '@/containers/Drawers/CashflowTransactionDetailDrawer/v2/splitPanelView';

interface SplitLinesEditorProps {
  /** Сумма операции целиком — с ней обязаны сойтись части. */
  parentAmount: number;
  lines: SplitLine[];
  onChange: (lines: SplitLine[]) => void;
  /** Статьи для выбора: у каждой части — своя. */
  articles: Array<{ id: number; name: string }>;
}

const money = (value: number) => formatOrganizationMoney(value ?? 0);
const percentText = (value: number) => String(value).replace('.', ',');

/**
 * Редактор частей суммы (FT-023 ТЗ-3) — один на форму операции и на
 * карточку. «Поровну», счётчик «Осталось распределить» и связка ₽ ↔ %:
 * меняешь сумму — пересчитывается процент, и наоборот.
 *
 * Остаток виден всё время, пока человек печатает: узнать «не сходится»
 * только после «Сохранить» — значит заставить искать, где именно.
 */
export function SplitLinesEditor({ parentAmount, lines, onChange, articles }: SplitLinesEditorProps) {
  const state = evaluateSplit(Math.abs(parentAmount), lines);

  const update = (index: number, patch: Partial<SplitLine>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const addLine = () => onChange([...lines, { amount: suggestedAmount(state.remaining), articleId: null }]);

  const equalize = () => {
    const count = Math.max(lines.length, 2);
    const parts = equalSplit(parentAmount, count);
    const base = lines.length >= count ? lines : [...lines, ...Array(count - lines.length).fill({ articleId: null })];
    onChange(base.map((line, index) => ({ ...line, amount: parts[index] })));
  };

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">{intl.get('transaction_split.amount')}</label>
            <MoneyField
              className="w-36"
              value={line.amount ?? ''}
              onChange={(value) => update(index, { amount: value ?? 0 })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">{intl.get('transaction_split.percent')}</label>
            <Input
              inputMode="decimal"
              className="w-24"
              value={percentText(percentOf(line.amount ?? 0, parentAmount))}
              onChange={(event) => {
                const percent = Number(event.target.value.replace(',', '.'));
                if (Number.isFinite(percent)) {
                  update(index, { amount: amountFromPercent(percent, parentAmount) });
                }
              }}
            />
          </div>
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <label className="text-xs text-text-muted">{intl.get('transaction_split.article')}</label>
            <select
              className="min-h-[36px] rounded-control border border-border bg-surface px-2 py-1 text-sm"
              value={line.articleId == null ? '' : String(line.articleId)}
              onChange={(event) =>
                update(index, { articleId: event.target.value ? Number(event.target.value) : null })
              }
            >
              <option value="">{intl.get('transaction_split.article_placeholder')}</option>
              {articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
          >
            {intl.get('transaction_split.remove_line')}
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={addLine}>
            {intl.get('transaction_split.add_line')}
          </Button>
          <Button type="button" variant="secondary" onClick={equalize}>
            {intl.get('transaction_split.equal')}
          </Button>
        </div>
        <span className={cn('money', state.remaining !== 0 && 'text-danger')}>
          {intl.get('transaction_split.remaining', { amount: money(state.remaining) })}
        </span>
      </div>

      {state.problem && lines.length > 0 && (
        <p className="text-sm text-text-muted">{intl.get(`transaction_split.problem.${state.problem}`)}</p>
      )}
    </div>
  );
}

/** Можно ли сохранять: либо частей нет вовсе, либо они сошлись. */
export function splitsReady(parentAmount: number, lines: SplitLine[]): boolean {
  return lines.length === 0 || evaluateSplit(Math.abs(parentAmount), lines).isValid;
}
