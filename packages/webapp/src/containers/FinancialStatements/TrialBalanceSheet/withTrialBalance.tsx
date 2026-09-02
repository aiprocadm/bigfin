import { connect } from 'react-redux';
import { getTrialBalanceSheetFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withTrialBalance = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      trialBalanceDrawerFilter: getTrialBalanceSheetFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
