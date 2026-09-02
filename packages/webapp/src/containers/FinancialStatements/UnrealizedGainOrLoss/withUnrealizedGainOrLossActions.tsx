import { connect } from 'react-redux';
import { toggleUnrealizedGainOrLossFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapDispatchToProps = (dispatch: any) => ({
  toggleUnrealizedGainOrLossFilterDrawer: (toggle: any) =>
    dispatch(toggleUnrealizedGainOrLossFilterDrawer(toggle)),
});

export const withUnrealizedGainOrLossActions = connect(null, mapDispatchToProps);
