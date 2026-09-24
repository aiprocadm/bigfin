import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Группа полей формы «вставкой» (UI-044-8 ТЗ-4, шаблон формы §8) — как
 * «Настройки» iOS: приглушённый заголовок группы, белая карточка, поля
 * разделены волосяными линиями, пояснение под группой.
 */
export interface InsetGroupProps {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function InsetGroup({ title, footer, children, className }: InsetGroupProps) {
  const titleId = React.useId();
  return (
    <section aria-labelledby={title ? titleId : undefined} className={cn('flex flex-col gap-1.5', className)}>
      {title && (
        <h3 id={titleId} className="px-4 text-subhead font-normal text-text-secondary">
          {title}
        </h3>
      )}
      <div className="divide-y divide-border overflow-hidden rounded-default border border-border bg-surface">
        {children}
      </div>
      {footer && <p className="px-4 text-footnote text-text-muted">{footer}</p>}
    </section>
  );
}

export interface InsetRowProps {
  /** Подпись поля — связывается с полем через `htmlFor`. */
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Строка группы: подпись слева (на телефоне — сверху), поле справа. */
export function InsetRow({ label, htmlFor, hint, children, className }: InsetRowProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4', className)}>
      <label htmlFor={htmlFor} className="shrink-0 text-body text-text-primary sm:w-48">
        {label}
        {hint && <span className="block text-footnote text-text-muted">{hint}</span>}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
