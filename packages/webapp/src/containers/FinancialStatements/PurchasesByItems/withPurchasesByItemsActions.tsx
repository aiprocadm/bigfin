import { connect } from 'react-redux';
import { togglePurchasesByItemsFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  togglePurchasesByItemsFilterDrawer: (toggle: any) =>
    dispatch(togglePurchasesByItemsFilterDrawer(toggle)),
});

export const withPurchasesByItemsActions = connect(null, mapDispatchToProps);
