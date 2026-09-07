import { connect } from 'react-redux';
import {
  getVendorsTableStateFactory,
  vendorsTableStateChangedFactory,
} from '@/store/vendors/vendors.selectors';

export const withVendors = (mapState: any) => {
  const getVendorsTableState = getVendorsTableStateFactory();
  const vendorsTableStateChanged = vendorsTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      vendorsSelectedRows: state.vendors.selectedRows,
      vendorsTableState: getVendorsTableState(state, props),
      vendorsTableStateChanged: vendorsTableStateChanged(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
