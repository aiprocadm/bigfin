import { connect } from 'react-redux';
import { toggleCustomersBalanceSummaryFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapActionsToProps = (dispatch: any) => ({
  toggleCustomerBalanceFilterDrawer: (toggle: any) =>
    dispatch(toggleCustomersBalanceSummaryFilterDrawer(toggle)),
});

export const withCustomersBalanceSummaryActions = connect(null, mapActionsToProps);
