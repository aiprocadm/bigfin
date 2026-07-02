import { useCallback } from 'react';

import { DataTable } from '@/components/ui/data-table';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { compose } from '@/utils';

import { useCurrenciesContext } from './CurrenciesProvider';
import { useCurrenciesTableColumns, type CurrencyRow } from './components';

const getCurrencyRowId = (row: CurrencyRow) => row.currency_code;

/**
 * Таблица валют (новый DataTable).
 */
function CurrenciesDataTable({
  // #withDialogActions
  openDialog,
  // #withAlertActions
  openAlert,
}: any) {
  const { currencies, isCurrenciesLoading } = useCurrenciesContext() as any;

  const handleEditCurrency = useCallback(
    (currency: CurrencyRow) => {
      openDialog('currency-form', { action: 'edit', currency });
    },
    [openDialog],
  );

  const handleDeleteCurrency = useCallback(
    ({ currency_code }: CurrencyRow) => {
      openAlert('currency-delete', { currency_code });
    },
    [openAlert],
  );

  const columns = useCurrenciesTableColumns({
    onEditCurrency: handleEditCurrency,
    onDeleteCurrency: handleDeleteCurrency,
  });

  return (
    <div className="bigfin-ui p-4">
      <DataTable
        columns={columns}
        data={currencies ?? []}
        getRowId={getCurrencyRowId}
        loading={isCurrenciesLoading}
      />
    </div>
  );
}

export default compose(
  withDialogActions,
  withAlertActions,
)(CurrenciesDataTable);
