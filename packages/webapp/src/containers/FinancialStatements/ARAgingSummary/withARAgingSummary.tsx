import { connect } from 'react-redux';
import {
  getARAgingSummaryFilterDrawer,
} from '@/store/financial-statement/financial-statements.selectors';

export const withARAgingSummary = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      ARAgingSummaryFilterDrawer: getARAgingSummaryFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
