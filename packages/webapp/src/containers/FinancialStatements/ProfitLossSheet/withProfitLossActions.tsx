import { connect } from 'react-redux';
import { toggleProfitLossFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  toggleProfitLossFilterDrawer: (toggle: any) =>
    dispatch(toggleProfitLossFilterDrawer(toggle)),
});

export const withProfitLossActions = connect(null, mapDispatchToProps);
