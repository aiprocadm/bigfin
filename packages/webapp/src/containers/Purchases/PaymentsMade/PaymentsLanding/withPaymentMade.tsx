import { connect } from 'react-redux';
import {
  getPaymentMadesTableStateFactory,
  paymentsTableStateChangedFactory,
} from '@/store/payment-mades/payment-mades.selector';

export const withPaymentMade = (mapState: any) => {
  const getPaymentMadesTableState = getPaymentMadesTableStateFactory();
  const paymentsTableStateChanged = paymentsTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      paymentMadesTableState: getPaymentMadesTableState(state, props),
      paymentsTableStateChanged: paymentsTableStateChanged(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
