import { connect } from 'react-redux';
import {
  getCustomersTableStateFactory,
  customersTableStateChangedFactory,
} from '@/store/customers/customers.selectors';


export const withCustomers = (mapState: any) => {
  const getCustomersTableState = getCustomersTableStateFactory();
  const customersTableStateChanged = customersTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      customersSelectedRows: state.customers.selectedRows,
      customersTableState: getCustomersTableState(state, props),
      customersTableStateChanged: customersTableStateChanged(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
