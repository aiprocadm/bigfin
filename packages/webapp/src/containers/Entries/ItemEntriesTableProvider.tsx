import React, { createContext } from 'react';

const ItemEntriesTableContext = createContext<any>(undefined);

function ItemEntriesTableProvider({ children, value }: any) {
  const provider = {
    ...value,
  };
  return (
    <ItemEntriesTableContext.Provider value={provider}>
      {children}
    </ItemEntriesTableContext.Provider>
  );
}

const useItemEntriesTableContext = () =>
  React.useContext(ItemEntriesTableContext);

export { ItemEntriesTableProvider, useItemEntriesTableContext };
