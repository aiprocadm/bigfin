import { connect } from 'react-redux';
import {
  setBillsTableState,
  resetBillsTableState,
  setBillsSelectedRows,
} from '@/store/bills/bills.actions';

const mapDispatchToProps = (dispatch: any) => ({
  setBillsTableState: (queries: any) => dispatch(setBillsTableState(queries)),
  resetBillsTableState: () => dispatch(resetBillsTableState()),
  setBillsSelectedRows: (selectedRows: any) =>
    dispatch(setBillsSelectedRows(selectedRows)),
});

export const withBillsActions = connect(null, mapDispatchToProps);
