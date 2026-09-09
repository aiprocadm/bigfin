import React, { forwardRef, Ref } from 'react';
import { HTMLDivProps, Props } from '@blueprintjs/core';
import { SystemProps, x } from '@xstyled/emotion';

export interface BoxProps
  extends SystemProps,
    Props,
    Omit<HTMLDivProps, 'color'> {}

export const Box = forwardRef(
  ({ className, ...rest }: BoxProps, ref: Ref<HTMLDivElement>) => {
    const Element = x.div;

    return <Element className={className} ref={ref} {...rest} />;
  },
);
// Имя для отладчика — обычное слово, без «@» и косых черт: генератор
// описаний Storybook подставляет его прямо в код (`<имя>.__docgenInfo = …`),
// и на «@bigfin/Box» разбор падал — из-за этого **вся сборка витрины историй
// не собиралась вовсе** (Д17 карты v84).
Box.displayName = 'Box';
