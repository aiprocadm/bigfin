import { connect } from 'react-redux';
import {
  setInvoicesTableState,
  resetInvoicesTableState,
  setInvoicesSelectedRows,
  resetInvoicesSelectedRows,
} from '@/store/invoice/invoices.actions';

const mapDipatchToProps = (dispatch: any) => ({
  setInvoicesTableState: (queries: any) => dispatch(setInvoicesTableState(queries)),
  resetInvoicesTableState: () => dispatch(resetInvoicesTableState()),
  setInvoicesSelectedRows: (selectedRows: any) => dispatch(setInvoicesSelectedRows(selectedRows)),
  resetInvoicesSelectedRows: () => dispatch(resetInvoicesSelectedRows()),
});

export const withInvoiceActions = connect(null, mapDipatchToProps);
