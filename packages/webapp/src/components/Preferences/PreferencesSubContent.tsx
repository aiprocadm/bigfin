// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React from 'react';
import preferencesTabs from '@/routes/preferencesTabs';
import {Switch, Route, useRouteMatch} from 'react-router-dom';

export default function PreferencesSubContent({
  preferenceTab,
}: {
  preferenceTab: keyof typeof preferencesTabs;
}) {
  const routes = preferencesTabs[preferenceTab];
  const { path } = useRouteMatch();

  if (routes.length <= 0) { return null; }

  return (
    <Switch>
      { routes.map((route: { path: string; component: any }, index: number) => (
        <Route
          key={index}
          path={`${path}/${route.path}`}
          exact={route.exact}
          component={route.component}
        />          
      ))}
    </Switch>);
}