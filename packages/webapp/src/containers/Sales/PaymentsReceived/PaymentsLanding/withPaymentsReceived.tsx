import { connect } from 'react-redux';
import {
  getPaymentReceiveTableStateFactory,
  paymentsTableStateChangedFactory,
  getPaymentReceivesSelectedRowsFactory
} from '@/store/payment-receives/payment-receives.selector';

export const withPaymentsReceived = (mapState: any) => {
  const getPaymentReceiveTableState = getPaymentReceiveTableStateFactory();
  const paymentsTableStateChanged = paymentsTableStateChangedFactory();
  const getSelectedRows = getPaymentReceivesSelectedRowsFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      paymentReceivesTableState: getPaymentReceiveTableState(state, props),
      paymentsTableStateChanged: paymentsTableStateChanged(state),
      paymentReceivesSelectedRows: getSelectedRows(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
