// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';

import { useAiInsights, type AiInsight } from '@/hooks/query/ai';
import { cn } from '@/lib/cn';

interface AiInsightsBlockProps {
  /** Для какого экрана выводы: 'dashboard', 'profit_loss' и т. д. */
  scope: string;
  className?: string;
}

/**
 * Блок «Что говорят цифры» (этап 13 ТЗ, остаток И1).
 *
 * Выводы считает фоновая задача, здесь только показ суточного кеша:
 * открытие страницы не ждёт модель и не оплачивает её.
 *
 * ГЛАВНОЕ ПРАВИЛО БЛОКА: когда выводов нет, он объясняет ПОЧЕМУ, а не
 * исчезает. Пустота выглядит так же, как «в делах всё ровно», и человек
 * успокаивается там, где раздел просто не настроен.
 *
 * Когда раздел выключен целиком, блок не показывается вовсе — это не
 * умолчание, а осознанный выбор владельца, и напоминать о нём на каждом
 * экране незачем.
 */
export function AiInsightsBlock({ scope, className }: AiInsightsBlockProps) {
  const { data, isLoading } = useAiInsights(scope);

  if (isLoading) return null;

  // Выключен флагом — раздела нет, и говорить не о чем.
  if (!data?.available && data?.reason === 'feature_disabled') return null;

  const hasInsights = (data?.insights?.length ?? 0) > 0;

  return (
    <section
      className={cn(
        'rounded-default border border-border bg-surface p-4',
        className,
      )}
    >
      <h2 className="text-sm font-medium text-text-secondary">
        {intl.get('ai_insights.title')}
      </h2>

      {hasInsights ? (
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {data?.insights?.map((insight: AiInsight, index: number) => (
            <li key={index} className="flex flex-col gap-1">
              <span>{insight.text}</span>
              {/* Ссылка на отчёт — обязательная часть вывода: без неё
                  число невозможно проверить, и верить ему нельзя. */}
              {insight.link && (
                <Link
                  to={insight.link}
                  className="text-sm text-accent underline-offset-4 hover:underline"
                >
                  {intl.get('ai_insights.check_in_report')}
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          {data?.message || intl.get('ai_insights.nothing_to_say')}
        </p>
      )}

      {data?.generatedFor && (
        <p className="mt-3 text-xs text-text-muted">
          {intl.get('ai_insights.generated_for', {
            date: data.generatedFor,
          })}
        </p>
      )}
    </section>
  );
}
