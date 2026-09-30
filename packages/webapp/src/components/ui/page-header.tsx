import * as React from 'react';

import { cn } from '@/lib/cn';
import { PageTitle } from './page-title';
import { ScreenHelp } from './screen-help';

/**
 * Ключ справки, выведенный из адреса экрана (FIN-025 ТЗ-2).
 *
 * ПОЧЕМУ ИЗ АДРЕСА, А НЕ РУКАМИ НА КАЖДОМ ЭКРАНЕ. Экранов больше пятидесяти.
 * Проставить пометку на каждом — значит однажды забыть её на новом, и справка
 * тихо исчезнет там, где она нужнее всего: на только что появившемся экране,
 * про который никто ничего не знает.
 *
 * АДРЕС ЧИТАЕТСЯ ИЗ ОКНА, А НЕ ХУКОМ МАРШРУТИЗАТОРА. Заголовок рисуется и
 * вне маршрутов — в историях компонентов и в тестах, — а хук маршрутизатора
 * там падает. Страница при переходе собирается заново, поэтому адрес всегда
 * свежий.
 */
export function topicFromPath(pathname: string): string {
  const segment = String(pathname ?? '')
    .split('?')[0]
    .split('/')
    .filter(Boolean)[0];

  return segment ? segment.replace(/-/g, '_') : '';
}

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
  /** Одна главная кнопка экрана (правило P7). */
  action?: React.ReactNode;
  /**
   * Второстепенные действия — кнопка «⋯» с меню. Главная кнопка на экране
   * одна; всё остальное уходит сюда, а не выстраивается рядом строем кнопок.
   */
  more?: React.ReactNode;
  className?: string;
  /**
   * Ключ справки, если он не выводится из адреса.
   *
   * Нужен вложенным экранам со своим вопросом: реестру операций и отчёту о
   * движении денег по статьям. Пустая строка выключает кнопку намеренно.
   */
  helpTopic?: string;
}

export function PageHeader({
  title,
  description,
  action,
  more,
  className,
  helpTopic,
}: PageHeaderProps) {
  const topic =
    helpTopic ??
    topicFromPath(
      typeof window === 'undefined' ? '' : window.location.pathname,
    );

  return (
    <div
      className={cn(
        'mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {/* Крупный заголовок с переездом в шапку при прокрутке (R10). */}
          <PageTitle>{title}</PageTitle>
          {/* Кнопка появляется только там, где есть что объяснить: пустая
              подсказка хуже её отсутствия. */}
          {topic && <ScreenHelp topic={topic} />}
        </div>
        {description && (
          // Длина строки ограничена: текст шире 70 знаков читается тяжелее,
          // потому что глазу труднее найти начало следующей строки.
          <p className="mt-1 max-w-[70ch] text-sm text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {(action || more) && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {more}
        </div>
      )}
    </div>
  );
}
