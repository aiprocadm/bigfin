import { connect } from 'react-redux';
import {
  setEstimatesTableState,
  resetEstimatesTableState,
  setEstimatesSelectedRows,
} from '@/store/estimate/estimates.actions';

const mapDispatchToProps = (dispatch: any) => ({
  setEstimatesTableState: (state: any) => dispatch(setEstimatesTableState(state)),
  resetEstimatesTableState: () => dispatch(resetEstimatesTableState()),
  setEstimatesSelectedRows: (selectedRows: any) => dispatch(setEstimatesSelectedRows(selectedRows)),
});

export const withEstimatesActions = connect(null, mapDispatchToProps);
