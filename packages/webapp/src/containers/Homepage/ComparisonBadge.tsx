import React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';

import { formatChangePercent, hasComparisonBase } from './dashboardCompare';
import { isGoodChange } from './overviewChangeTone';

export interface ComparisonBadgeProps {
  /** Изменение к базе, %. `null` — базы нет; `undefined` — сравнение не нужно. */
  changePercent?: number | null;
  tone?: 'income' | 'expense';
}

/**
 * Изменение показателя к базе сравнения (FT-061 ТЗ-3).
 *
 * ПРИ НУЛЕВОЙ БАЗЕ — СЛОВА, А НЕ ПРОЦЕНТ. Раньше при пустом прошлом
 * периоде подпись просто пропадала, и человек не понимал: сравнения нет
 * или оно сломалось. Процент к нулю («+100 %», «∞») был бы хуже — это
 * выдумка. Теперь честно: «нет базы для сравнения».
 *
 * Все плитки главной печатают изменение только через этот значок: так
 * правило «нет базы — нет процента» живёт в одном месте, а не в каждой
 * плитке по-своему.
 */
export function ComparisonBadge({ changePercent, tone }: ComparisonBadgeProps) {
  if (changePercent === undefined) return null;

  const text = formatChangePercent(changePercent);

  if (text === null || !hasComparisonBase(changePercent)) {
    return (
      <div className="mt-1 text-sm text-text-muted">
        {intl.get('dashboard.compare.no_base')}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mt-1 text-sm tabular-nums',
        // ХОРОШО ЛИ ЭТО — ЗАВИСИТ ОТ ПОКАЗАТЕЛЯ, А НЕ ОТ ЗНАКА.
        // Рост РАСХОДОВ зелёным выглядел бы хорошей новостью.
        isGoodChange(tone, changePercent) ? 'text-success' : 'text-text-primary',
      )}
    >
      {text}
    </div>
  );
}

export default ComparisonBadge;
