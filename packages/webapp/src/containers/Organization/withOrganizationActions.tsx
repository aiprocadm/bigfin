import { connect } from 'react-redux';
import {
  setOrganizationSetupCompleted,
} from '@/store/organizations/organizations.actions';

const mapDispatchToProps = (dispatch: any) => ({
  setOrganizationSetupCompleted: (congrats: any) =>
    dispatch(setOrganizationSetupCompleted(congrats)),
});

export const withOrganizationActions = connect(null, mapDispatchToProps);
