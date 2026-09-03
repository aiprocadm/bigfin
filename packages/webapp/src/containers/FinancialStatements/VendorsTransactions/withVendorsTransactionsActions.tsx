import { connect } from 'react-redux';
import { toggleVendorsTransactionsFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapActionsToProps = (dispatch: any) => ({
  toggleVendorsTransactionsFilterDrawer: (toggle: any) =>
    dispatch(toggleVendorsTransactionsFilterDrawer(toggle)),
});

export const withVendorsTransactionsActions = connect(null, mapActionsToProps);
