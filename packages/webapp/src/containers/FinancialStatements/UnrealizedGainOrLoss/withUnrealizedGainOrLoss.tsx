import { connect } from 'react-redux';
import { getUnrealizedGainOrLossFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withUnrealizedGainOrLoss = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      unrealizedGainOrLossDrawerFilter:
        getUnrealizedGainOrLossFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
