import { connect } from 'react-redux';
import { getRealizedGainOrLossFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withRealizedGainOrLoss = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      realizedGainOrLossDrawerFilter: getRealizedGainOrLossFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
