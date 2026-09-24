// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ReportDrillDownPanel, {
  type DrillDownTarget,
} from '@/containers/FinancialStatements/ReportDrillDownPanel';
import type { AiCfoReply } from '@/hooks/query/aiCfo';
import { EvidenceList } from './EvidenceList';
import { ActionButton } from './ActionButton';
import {
  drillTargetFromFigure,
  figureByKey,
  hasRejectedNumbers,
  isSubstantiveReply,
  tableCellText,
} from './aiCfoHelpers';
import { aiCfoFormatters, formatAiCfoDateTime } from './aiCfoFormat';

export interface AnswerCardProps {
  reply: AiCfoReply;
  /** Примеры вопросов — показываются, когда вопрос не понят. */
  examples?: string[];
  onPickExample?: (example: string) => void;
}

/**
 * Карточка ответа AI CFO (FT-102 ТЗ-3): вывод → цифры → причины → операции →
 * действия.
 *
 * Порядок выбран под недоверчивого читателя: сначала ответ одной строкой,
 * потом числа, на которых он стоит, и у каждого — «Показать операции». Текст
 * модели идёт с пометкой, откуда он: пересказ модели и текст по расчёту —
 * разные вещи, и человек вправе знать, что читает.
 *
 * Пустой период — только заголовок: «за этот период операций нет» без
 * таблиц из нулей и без догадок (правило 5).
 */
export function AnswerCard({ reply, examples = [], onPickExample }: AnswerCardProps) {
  const [drill, setDrill] = React.useState<DrillDownTarget | null>(null);

  // Раздел ИИ выключен или вопрос не понят — сервер сам говорит, что делать.
  if (!reply.available || !reply.understood) {
    return (
      <article className="flex flex-col gap-3 rounded-default border border-border bg-surface p-4 text-sm text-text-secondary">
        <p className="whitespace-pre-line">{reply.message}</p>
        {/* Не понял — сразу показать, что понимает: иначе человек гадает
            формулировку и решает, что продукт бесполезен. */}
        {reply.available && examples.length > 0 && (
          <ExampleChips examples={examples} onPick={onPickExample} />
        )}
      </article>
    );
  }

  const substantive = isSubstantiveReply(reply);
  const figures = substantive ? reply.figures ?? [] : [];
  const reasons = substantive ? reply.reasons ?? [] : [];
  const actions = substantive ? reply.actions ?? [] : [];
  const links = substantive ? reply.links ?? [] : [];
  const table = substantive ? reply.table : undefined;
  const explanation = substantive ? reply.explanation : undefined;
  const fmt = aiCfoFormatters();

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-default border border-border bg-surface p-4 text-sm">
      <h3 className="text-base font-medium text-text-primary">{reply.headline}</h3>

      {explanation?.text && (
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className="self-start">
            {intl.get(
              explanation.source === 'model'
                ? 'ai_cfo.explanation.model'
                : 'ai_cfo.explanation.template',
            )}
          </Badge>
          <p className="whitespace-pre-line text-text-primary">{explanation.text}</p>
          {hasRejectedNumbers(reply) && (
            <p className="text-xs text-text-muted">
              {intl.get('ai_cfo.explanation.rejected')}
            </p>
          )}
          {explanation.note && (
            <p className="text-xs text-text-muted">{explanation.note}</p>
          )}
        </div>
      )}

      <EvidenceList figures={figures} onDrill={setDrill} />

      {reasons.length > 0 && (
        <section className="flex flex-col gap-1">
          <h4 className="text-xs font-medium text-text-muted">
            {intl.get('ai_cfo.answer.reasons')}
          </h4>
          <ul className="flex flex-col gap-1">
            {reasons.map((reason, index) => {
              // Причина со ссылкой на число ведёт туда же, куда и само число:
              // утверждение без пути к операциям проверить нельзя (правило 3).
              const target = drillTargetFromFigure(figureByKey(reply, reason.figureKey));

              return (
                <li key={index} className="flex flex-wrap items-center gap-x-2">
                  <span>{reason.text}</span>
                  {target && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="px-0"
                      onClick={() => setDrill(target)}
                    >
                      {intl.get('ai_cfo.answer.show_operations')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {table && table.columns.length > 0 && (
        // Таблица прокручивается в своей рамке: на телефоне столбцы «было /
        // стало / Δ / Δ%» не помещаются, а страница вбок ехать не должна.
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="bg-surface-elevated text-left text-xs text-text-muted">
                {table.columns.map((column) => (
                  <th key={column} className="px-3 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-border">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={
                        typeof cell === 'number'
                          ? 'money px-3 py-2 text-right tabular-nums'
                          : 'px-3 py-2'
                      }
                    >
                      {tableCellText(table.columns[cellIndex], cell, fmt)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-medium text-text-muted">
            {intl.get('ai_cfo.answer.actions')}
          </h4>
          {actions.map((action) => (
            <ActionButton key={action.plannedOperationId} action={action} />
          ))}
        </section>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="py-1 text-sm text-action underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {reply.meta && (
        <p className="text-xs text-text-muted">
          {intl.get('ai_cfo.answer.meta', {
            basis: reply.meta.basis,
            currency: reply.meta.currency,
            entities: reply.meta.legalEntities,
            at: formatAiCfoDateTime(reply.meta.calculatedAt),
          })}
        </p>
      )}

      <ReportDrillDownPanel target={drill} onClose={() => setDrill(null)} />
    </article>
  );
}

export interface ExampleChipsProps {
  examples: string[];
  onPick?: (example: string) => void;
}

/** Примеры вопросов кнопками — список приходит с сервера, а не выдумывается. */
export function ExampleChips({ examples, onPick }: ExampleChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {examples.map((example) => (
        <button
          key={example}
          type="button"
          className="min-h-11 rounded-control border border-border bg-surface px-3 py-1 text-left text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action sm:min-h-8"
          onClick={() => onPick?.(example)}
        >
          {example}
        </button>
      ))}
    </div>
  );
}

export default AnswerCard;
