import { connect } from 'react-redux';
import { toggleTrialBalanceSheetFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  toggleTrialBalanceFilterDrawer: (toggle: any) =>
    dispatch(toggleTrialBalanceSheetFilterDrawer(toggle)),
});

export const withTrialBalanceActions = connect(null, mapDispatchToProps);
