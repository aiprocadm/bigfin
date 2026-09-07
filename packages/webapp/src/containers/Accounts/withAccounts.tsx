import { connect } from 'react-redux';
import {
  getAccountsTableStateFactory,
  accountsTableStateChangedFactory,
} from '@/store/accounts/accounts.selectors';

export const withAccounts = (mapState: any) => {
  const getAccountsTableState = getAccountsTableStateFactory();
  const accountsTableStateChanged = accountsTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      accountsTableState: getAccountsTableState(state, props),
      accountsTableStateChanged: accountsTableStateChanged(state),
      accountsSelectedRows: state.accounts?.selectedRows || [],
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };

  return connect(mapStateToProps);
};
