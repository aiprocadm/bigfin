import { connect } from 'react-redux';
import {
  APAgingSummaryFilterDrawerSelector,
} from '@/store/financial-statement/financial-statements.selectors';

export const withAPAgingSummary = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      APAgingSummaryFilterDrawer: APAgingSummaryFilterDrawerSelector(
        state,
      ),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
