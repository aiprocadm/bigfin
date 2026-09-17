import '@emotion/react';

/**
 * Что на самом деле лежит в теме оформления.
 *
 * Тему кладёт `DashboardThemeProvider`: это `defaultTheme` из
 * `@xstyled/emotion` плюс одно своё поле — приставка классов Blueprint
 * (`bp4`). Объявление темы в `@emotion/react` пустое, поэтому каждое
 * обращение `theme.bpPrefix` в стилях считалось обращением к
 * несуществующему свойству, и файлы со стилями формы не выходили из слепой
 * зоны (Д15 карты v88).
 */
declare module '@emotion/react' {
  export interface Theme {
    /** Приставка классов Blueprint — `bp4`. */
    bpPrefix: string;
  }
}
