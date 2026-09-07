import { connect } from 'react-redux';
import {
  getEstimatesTableStateFactory,
  isEstimatesTableStateChangedFactory,
  getEstimatesSelectedRowsFactory,
} from '@/store/estimate/estimates.selectors';

export const withEstimates = (mapState: any) => {
  const getEstimatesTableState = getEstimatesTableStateFactory();
  const getSelectedRows = getEstimatesSelectedRowsFactory();
  const isEstimatesTableStateChanged = isEstimatesTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      estimatesTableState: getEstimatesTableState(state, props),
      estimatesTableStateChanged: isEstimatesTableStateChanged(state),
      estimatesSelectedRows: getSelectedRows(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
