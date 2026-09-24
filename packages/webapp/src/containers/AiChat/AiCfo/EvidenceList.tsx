// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { DrillDownTarget } from '@/containers/FinancialStatements/ReportDrillDownPanel';
import type { AiCfoFigure } from '@/hooks/query/aiCfo';
import { drillTargetFromFigure, formatFigureValue } from './aiCfoHelpers';
import { aiCfoFormatters } from './aiCfoFormat';

export interface EvidenceListProps {
  figures: AiCfoFigure[];
  onDrill: (target: DrillDownTarget) => void;
}

/**
 * Числа ответа — доказательная база (FT-102, правило 3).
 *
 * У каждого числа — путь к источнику: «Показать операции» открывает ту же
 * панель, что клик по ячейке отчёта, а ссылка ведёт на экран, где число
 * разложено построчно. Число без пути к источнику проверить нельзя, а
 * непроверяемому числу владелец не доверяет — и уходит обратно в Excel.
 */
export function EvidenceList({ figures, onDrill }: EvidenceListProps) {
  const fmt = aiCfoFormatters();

  if (figures.length === 0) return null;

  return (
    <ul
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
      aria-label={intl.get('ai_cfo.answer.figures')}
    >
      {figures.map((figure) => {
        const target = drillTargetFromFigure(figure);

        return (
          <li
            key={figure.key}
            className="flex min-w-0 flex-col gap-1 rounded-control border border-border bg-surface-elevated p-3"
          >
            <span className="text-xs text-text-muted">{figure.label}</span>
            <span className="money break-words text-base font-medium text-text-primary">
              {formatFigureValue(figure, fmt)}
            </span>
            {(target || figure.link) && (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {target && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => onDrill(target)}
                  >
                    {intl.get('ai_cfo.answer.show_operations')}
                  </Button>
                )}
                {figure.link && (
                  <Link
                    to={figure.link}
                    className="py-1 text-xs text-action underline-offset-4 hover:underline"
                  >
                    {intl.get('ai_cfo.answer.open_report')}
                  </Link>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default EvidenceList;
