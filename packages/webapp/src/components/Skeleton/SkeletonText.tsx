import React, { useMemo } from 'react';
import '@/style/components/Skeleton.scss';

import { randomNumber } from '@/utils';

interface SkeletonTextProps {
  Tag?: React.ElementType;
  /** Сколько знаков занять. Если не задано — случайно между границами. */
  charsLength?: number;
  minChars?: number;
  maxChars?: number;
}

export function SkeletonText({
  Tag = 'span',
  charsLength,
  minChars = 40,
  maxChars = 100,
}: SkeletonTextProps) {
  const computedCharLength = useMemo(
    () => (charsLength ? charsLength : randomNumber(minChars, maxChars)),
    [charsLength, minChars, maxChars],
  );
  const randamText = 'X'.repeat(computedCharLength);

  return <Tag className={'skeleton'}>{randamText}</Tag>;
}
