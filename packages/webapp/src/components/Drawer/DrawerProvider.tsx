import React, { createContext, useContext } from 'react';

interface DrawerContextValue {
  name: string;
  payload: Record<string, any>;
}

const DrawerContext = createContext<DrawerContextValue>(
  {} as DrawerContextValue,
);

/**
 * Поставщик значений выдвижного ящика.
 *
 * Свойства объявлены: без этого «всё остальное» выходило безымянным набором, а
 * в значение поставщика требуются имя и полезная нагрузка (Д25 карты v75).
 */
function DrawerProvider({
  name,
  payload,
  ...props
}: DrawerContextValue & { children?: React.ReactNode }) {
  const provider = { name, payload };

  return <DrawerContext.Provider value={provider} {...props} />;
}

const useDrawerContext = () => useContext(DrawerContext);

export { DrawerProvider, useDrawerContext };
