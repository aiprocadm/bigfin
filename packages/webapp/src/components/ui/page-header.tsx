import * as React from 'react';

import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  title: React.ReactNode;
  /**
   * Одна строка о том, что это за экран и на какой вопрос он отвечает.
   *
   * Продукт сделан для людей БЕЗ бухгалтерского образования, а половина
   * названий в учёте — термины: «ОПиУ», «сальдо», «оборотно-сальдовая».
   * Человек, который видит такое название впервые, не знает, стоит ли ему
   * сюда заходить. Строка отвечает на это раньше, чем он потратит время.
   *
   * Не «продающее» описание и не инструкция: одно предложение о сути.
   */
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
          {title}
        </h1>
        {description && (
          // Длина строки ограничена: текст шире 70 знаков читается тяжелее,
          // потому что глазу труднее найти начало следующей строки.
          <p className="mt-1 max-w-[70ch] text-sm text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
