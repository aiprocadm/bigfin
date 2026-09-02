import { connect } from 'react-redux';
import { toggleInventoryValuationFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  toggleInventoryValuationFilterDrawer: (toggle: any) =>
    dispatch(toggleInventoryValuationFilterDrawer(toggle)),
});

export const withInventoryValuationActions = connect(null, mapDispatchToProps);
