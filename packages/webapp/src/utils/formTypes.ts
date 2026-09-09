// © 2026 Bigfin
import type React from 'react';
import type { FormikProps } from 'formik';

/**
 * Свойства, по которым `FastField` решает, перерисовываться ли.
 *
 * Формула сравнения одна и та же в **35 местах** витрины, и объявления у неё
 * не было нигде: помощник `defaultFastFieldShouldUpdate` лежит в файле под
 * пометкой «не проверять типы», поэтому его доводы выводятся как `any` и
 * вызывающему ничего не подсказывают (Д4 карты v81).
 *
 * Поле-список в конце нужно: сюда приходят все свойства поля разом, а какие
 * именно — зависит от места.
 */
export interface FastFieldShouldUpdateProps {
  name: string;
  formik: FormikProps<any>;
  /** Значения, при смене которых поле обязано перерисоваться. */
  shouldUpdateDeps?: Record<string, any>;
  [key: string]: any;
}

/**
 * Ошибка из ответа сервера. Приходит списком: `errors.find((e) => e.type === …)`.
 *
 * Такой разбор повторяется в **13 местах**.
 */
export interface ServiceError {
  type: string;
  message?: string;
  [key: string]: any;
}

/**
 * Свойства поставщика данных экрана.
 *
 * Поставщики устроены одинаково: берут своё (номер записи), рисуют содержимое
 * и передают остальное дальше — `({ itemId, ...props })`. Объявить только своё
 * недостаточно: вызывающий передаёт ещё и содержимое, и проверка типов считает
 * это лишним свойством (Д15 карты v82).
 */
export type ProviderProps<TOwn = {}> = TOwn & {
  children?: React.ReactNode;
  [key: string]: any;
};
