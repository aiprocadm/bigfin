import { connect } from 'react-redux';
import { toggleCustomersTransactionsFilterDrawer } from '@/store/financial-statement/financial-statements.actions';


const mapActionsToProps = (dispatch: any) => ({
  toggleCustomersTransactionsFilterDrawer: (toggle: any) =>
    dispatch(toggleCustomersTransactionsFilterDrawer(toggle)),
});

export const withCustomersTransactionsActions = connect(null, mapActionsToProps);
