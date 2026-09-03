import { connect } from 'react-redux';
import { toggleSalesByItemsFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  toggleSalesByItemsFilterDrawer: (toggle: any) =>
    dispatch(toggleSalesByItemsFilterDrawer(toggle)),
});

export const withSalesByItemsActions = connect(null, mapDispatchToProps);
