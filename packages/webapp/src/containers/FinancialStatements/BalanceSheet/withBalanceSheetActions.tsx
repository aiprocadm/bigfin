import { connect } from 'react-redux';
import {
  toggleBalanceSheetFilterDrawer,
} from '@/store/financial-statement/financial-statements.actions';

const mapDispatchToProps = (dispatch: any) => ({
  toggleBalanceSheetFilterDrawer: (toggle: any) =>
    dispatch(toggleBalanceSheetFilterDrawer(toggle)),
});

export const withBalanceSheetActions = connect(null, mapDispatchToProps);
