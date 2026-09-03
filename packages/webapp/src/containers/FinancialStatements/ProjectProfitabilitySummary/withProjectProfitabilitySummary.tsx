import { connect } from 'react-redux';
import { getProjectProfitabilitySummaryFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withProjectProfitabilitySummary = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      projectProfitabilitySummaryDrawerFilter:
        getProjectProfitabilitySummaryFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };

  return connect(mapStateToProps);
};
