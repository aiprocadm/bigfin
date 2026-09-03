import { connect } from 'react-redux';
import {
  setCashflowAccountsTableState,
  resetCashflowAccountsTableState,
} from '@/store/cashflow-accounts/cashflow-accounts.actions';

const mapActionsToProps = (dispatch: any) => ({
  setCashflowAccountsTableState: (queries: any) =>
    dispatch(setCashflowAccountsTableState(queries)),

  resetCashflowAccountsTableState: () =>
    dispatch(resetCashflowAccountsTableState()),
});

export const withCashflowAccountsTableActions = connect(null, mapActionsToProps);
