import { connect } from 'react-redux';
import {
  setCustomersTableState,
  resetCustomersTableState,
  setCustomersSelectedRows,
  resetCustomersSelectedRows,
} from '@/store/customers/customers.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  setCustomersTableState: (state: any) => dispatch(setCustomersTableState(state)),
  resetCustomersTableState: () => dispatch(resetCustomersTableState()),
  setCustomersSelectedRows: (selectedRows: any) =>
    dispatch(setCustomersSelectedRows(selectedRows)),
  resetCustomersSelectedRows: () => dispatch(resetCustomersSelectedRows()),
});

export const withCustomersActions = connect(null, mapDispatchToProps);
