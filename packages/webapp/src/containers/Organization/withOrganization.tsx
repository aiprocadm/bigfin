import { connect } from 'react-redux';
import {
  getOrganizationByIdFactory,
  isOrganizationReadyFactory,
  isOrganizationBuiltFactory,
  isOrganizationSubscribedFactory,
  isOrganizationCongratsFactory,
  isOrganizationBuildRunningFactory
} from '@/store/organizations/organizations.selectors';

export const withOrganization = (mapState: any) => {
  const getOrganizationById = getOrganizationByIdFactory();
  const isOrganizationReady = isOrganizationReadyFactory();
  const isOrganizationBuilt = isOrganizationBuiltFactory();

  const isOrganizationSubscribed = isOrganizationSubscribedFactory();
  const isOrganizationCongrats = isOrganizationCongratsFactory();
  const isOrganizationBuildRunning = isOrganizationBuildRunningFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      organization: getOrganizationById(state, props),
      isOrganizationReady: isOrganizationReady(state, props),
      isOrganizationInitialized: isOrganizationBuilt(state, props),

      isOrganizationSubscribed: isOrganizationSubscribed(state, props),
      isOrganizationSetupCompleted: isOrganizationCongrats(state, props),
      isOrganizationBuildRunning: isOrganizationBuildRunning(state, props)
    };
    return (mapState) ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};