import { connect } from 'react-redux';
import {
  getBillsTableStateFactory,
  billsTableStateChangedFactory,
  getBillsSelectedRowsFactory,
} from '@/store/bills/bills.selectors';

export const withBills = (mapState: any) => {
  const getBillsTableState = getBillsTableStateFactory();
  const billsTableStateChanged = billsTableStateChangedFactory();
  const getBillsSelectedRows = getBillsSelectedRowsFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      billsTableState: getBillsTableState(state, props),
      billsTableStateChanged: billsTableStateChanged(state),
      billsSelectedRows: getBillsSelectedRows(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
