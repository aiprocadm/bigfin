import { connect } from 'react-redux';
import {
  getGeneralLedgerFilterDrawer
} from '@/store/financial-statement/financial-statements.selectors';

export const withGeneralLedger = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      generalLedgerFilterDrawer: getGeneralLedgerFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
