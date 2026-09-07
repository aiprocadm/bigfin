import {connect} from 'react-redux';
import {
  getProfitLossFilterDrawer,
} from '@/store/financial-statement/financial-statements.selectors';

export const withProfitLoss = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      profitLossDrawerFilter: getProfitLossFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
}