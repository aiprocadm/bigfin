import { HTMLAttributes, Component, CSSProperties } from 'react';

// `style` раньше был описан как `StyleHTMLAttributes` — а это свойства **тега
// `<style>`**, а не набор свойств оформления. Из-за подмены сетка не принимала
// ни одного обычного `style={{ … }}` (Д15 карты v75).

export type Range = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface ItemProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number;
  col: Range;
  marginBottom?: number;
  stretch?: boolean;
  as?: string | Component;
  className?: string;
  style?: CSSProperties;
}

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number;
  align?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  col?: Range;
  className?: string;
  style?: CSSProperties;
  as?: string | Component;
}