import * as React from 'react';
import intl from 'react-intl-universal';
import { HelpCircle } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/cn';

/**
 * Контекстная справка на экране (FIN-025 ТЗ-2).
 *
 * ЗАЧЕМ. Продукт сделан для предпринимателя без бухгалтерского образования.
 * Он открывает экран «Статьи учёта» или «ДДС» и не знает, что это и зачем.
 * Уводить его в отдельную документацию — значит потерять: человек уходит и
 * не возвращается.
 *
 * ПОЧЕМУ БЕЗ СПИСКОВ И ЖИРНОГО (правило §10.2 ТЗ). Справка — это два-три
 * абзаца обычной речи, а не инструкция. Списки и выделения превращают
 * объяснение в документ, который начинают «изучать», а не читать.
 *
 * ТОН — «вы» СО СТРОЧНОЙ. Так говорит весь продукт; «Вы» с большой уместно
 * в личном письме, а не в подсказке у кнопки.
 */
export interface ScreenHelpProps {
  /** Ключ текста: `screen_help.<экран>`. */
  topic: string;
  className?: string;
}

export function ScreenHelp({ topic, className }: ScreenHelpProps) {
  const title = intl.get(`screen_help.${topic}.title`);
  const body = intl.get(`screen_help.${topic}.body`);

  // Нет текста — нет кнопки. Пустая подсказка хуже её отсутствия: человек
  // нажимает и получает пустоту, то есть обещание без содержания.
  if (!body) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={intl.get('screen_help.aria_label')}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-text-secondary hover:bg-surface-elevated',
            className,
          )}
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] max-w-[92vw]">
        {title && <p className="mb-2 font-medium">{title}</p>}
        {/* Абзацы, а не список: справка объясняет, а не предписывает. */}
        {body.split('\n').map((paragraph, index) => (
          <p
            key={index}
            className="mb-2 text-sm leading-relaxed text-text-primary last:mb-0"
          >
            {paragraph}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  );
}
