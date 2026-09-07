import { connect } from 'react-redux';
import {
  isAlertOpenFactory,
  getAlertPayloadFactory,
} from '@/store/dashboard/dashboard.selectors';

export const withAlertStoreConnect = (mapState?: any) => {
  const isAlertOpen = isAlertOpenFactory();
  const getAlertPayload = getAlertPayloadFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      isOpen: isAlertOpen(state, props),
      payload: getAlertPayload(state, props),
    };
    return mapState ? mapState(mapped) : mapped;
  };
  return connect(mapStateToProps);
}