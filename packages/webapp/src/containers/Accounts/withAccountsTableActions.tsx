import { connect } from 'react-redux';
import {
  setAccountsTableState,
  resetAccountsTableState,
  setAccountsSelectedRows,
} from '@/store/accounts/accounts.actions';

const mapActionsToProps = (dispatch: any) => ({
  setAccountsTableState: (queries: any) => dispatch(setAccountsTableState(queries)),
  resetAccountsTableState: () => dispatch(resetAccountsTableState()),
  setAccountsSelectedRows: (selectedRows: any) =>
    dispatch(setAccountsSelectedRows(selectedRows)),
});

export const withAccountsTableActions = connect(null, mapActionsToProps);
