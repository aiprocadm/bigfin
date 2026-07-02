import * as React from 'react';

import WarehousesEmptyStatus from './WarehousesEmptyStatus';
import { useWarehousesContext } from './WarehousesProvider';
import {
  WarehousesList,
  WarehousesSkeleton,
  type WarehouseRow,
} from './components';
import WarehousesGridItems from './WarehousesGridItems';

interface WarehousesContextValue {
  warehouses?: WarehouseRow[];
  isWarehouesLoading?: boolean;
  isEmptyStatus?: boolean;
}

/**
 * Сетка складов: скелетон / пустое состояние / карточки.
 */
export default function WarehousesGrid() {
  // Легаси-контекст без типов — кастуем локально.
  const { warehouses, isWarehouesLoading, isEmptyStatus } =
    useWarehousesContext() as unknown as WarehousesContextValue;

  return (
    <div className="bigfin-ui p-4">
      {isWarehouesLoading ? (
        <WarehousesList>
          <WarehousesSkeleton />
        </WarehousesList>
      ) : isEmptyStatus ? (
        <WarehousesEmptyStatus />
      ) : (
        <WarehousesList>
          <WarehousesGridItems warehouses={warehouses ?? []} />
        </WarehousesList>
      )}
    </div>
  );
}
