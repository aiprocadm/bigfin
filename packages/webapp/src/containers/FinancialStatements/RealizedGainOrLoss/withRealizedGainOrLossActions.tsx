import { connect } from 'react-redux';
import { toggleRealizedGainOrLossFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapDispatchToProps = (dispatch: any) => ({
  toggleRealizedGainOrLossFilterDrawer: (toggle: any) =>
    dispatch(toggleRealizedGainOrLossFilterDrawer(toggle)),
});

export const withRealizedGainOrLossActions = connect(null, mapDispatchToProps);
