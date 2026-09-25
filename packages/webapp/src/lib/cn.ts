import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Шрифтовая шкала дизайн-системы v2 (`--text-*` в `styles/globals.css`,
 * этап 43 ТЗ-4).
 *
 * ЗАЧЕМ ОНА ЗДЕСЬ. Склейщик классов знает только размеры Tailwind (`text-sm`,
 * `text-xl`). Незнакомое `text-headline` он принимал за ЦВЕТ — и рядом с
 * `text-text-primary` молча выбрасывал его как «перебитый цвет». Заголовок
 * страницы выходил 28 точек вместо 22 на телефоне, подпись в шапке — без
 * своей шкалы (живой проход этапа 45). Сторож `cn.spec` сверяет этот список
 * со стилями: новая ступень шкалы без строки здесь — красный прогон.
 */
export const TYPE_SCALE = [
  'hero',
  'large-title',
  'title-2',
  'title-3',
  'headline',
  'body',
  'callout',
  'subhead',
  'footnote',
  'caption',
] as const;

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: [...TYPE_SCALE] }] } },
});

/**
 * Merge Tailwind classes intelligently. Used by all shadcn components.
 *
 * Example:
 *   cn('px-2 py-1', condition && 'bg-accent', 'px-4')
 *   // → 'py-1 bg-accent px-4' (px-2 overridden by px-4)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
