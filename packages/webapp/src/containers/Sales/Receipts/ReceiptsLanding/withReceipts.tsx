import { connect } from 'react-redux';
import {
  getReceiptsSelectedRowsFactory,
  getReceiptsTableStateFactory,
  receiptsTableStateChangedFactory,
} from '@/store/receipts/receipts.selector';

export const withReceipts = (mapState: any) => {
  const getReceiptsTableState = getReceiptsTableStateFactory();
  const receiptsTableStateChanged = receiptsTableStateChangedFactory();
  const getSelectedRows = getReceiptsSelectedRowsFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      receiptTableState: getReceiptsTableState(state, props),
      receiptsTableStateChanged: receiptsTableStateChanged(state),
      receiptSelectedRows: getSelectedRows(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
