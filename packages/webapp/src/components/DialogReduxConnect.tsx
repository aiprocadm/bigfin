import { connect } from 'react-redux';
import {
  isDialogOpenFactory,
  getDialogPayloadFactory,
} from '@/store/dashboard/dashboard.selectors';

export default (mapState?: any) => {
  const isDialogOpen = isDialogOpenFactory();
  const getDialogPayload = getDialogPayloadFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      isOpen: isDialogOpen(state, props),
      payload: getDialogPayload(state, props),
    };
    return mapState ? mapState(mapped) : mapped;
  };
  return connect(mapStateToProps);
};
