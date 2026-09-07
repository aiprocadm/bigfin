import { connect } from 'react-redux';
import {
  getVendorCreditTableStateFactory,
  isVendorCreditTableStateChangedFactory,
  getVendorsCreditNoteSelectedRowsFactory,
} from '@/store/vendor-credit/vendor-credit.selector';

export const withVendorsCreditNotes = (mapState: any) => {
  const getVendorsCreditNoteTableState = getVendorCreditTableStateFactory();
  const isVendorsCreditNoteTableChanged =
    isVendorCreditTableStateChangedFactory();
  const getVendorsCreditNoteSelectedRows =
    getVendorsCreditNoteSelectedRowsFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      vendorsCreditNoteTableState: getVendorsCreditNoteTableState(state, props),
      vendorsCreditNoteTableStateChanged: isVendorsCreditNoteTableChanged(
        state,
      ),
      vendorsCreditNoteSelectedRows: getVendorsCreditNoteSelectedRows(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
