import { connect } from 'react-redux';
import {
  getWarehouseTransfersTableStateFactory,
  isWarehouseTransferTableStateChangedFactory,
} from '@/store/warehouse-transfer/warehouse-transfer.selector';

export const withWarehouseTransfers = (mapState: any) => {
  const getWarehouseTransferTableState = getWarehouseTransfersTableStateFactory();
  const isWarehouseTransferTableChanged = isWarehouseTransferTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      warehouseTransferTableState: getWarehouseTransferTableState(state, props),
      warehouseTransferTableStateChanged: isWarehouseTransferTableChanged(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
