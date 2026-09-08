import React, { useMemo } from 'react';
import '@/style/components/Skeleton.scss';

import { randomNumber } from '@/utils';

/**
 * Skeleton component.
 */
interface SkeletonProps {
  /** Каким тегом рисовать заглушку. */
  Tag?: React.ElementType;
  /** Границы случайной ширины, в процентах. */
  minWidth?: number;
  maxWidth?: number;
  children?: React.ReactNode;
}

export function Skeleton({
  Tag = 'span',
  minWidth = 40,
  maxWidth = 100,
  children,
}: SkeletonProps) {
  const randomWidth = useMemo(
    () => randomNumber(minWidth, maxWidth),
    [minWidth, maxWidth],
  );
  return (
    <Tag
      className={'skeleton'}
      style={{ width: `${randomWidth}%` }}
      children={children}
    />
  );
}
