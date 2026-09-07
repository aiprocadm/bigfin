import { connect } from 'react-redux';
import { getExpensesCurrentPageFactory } from '@/store/users/users.selectors';

export const withUsers = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      usersList: getExpensesCurrentPageFactory(state),
      usersLoading: state.users.loading,
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };

  return connect(mapStateToProps);
};
