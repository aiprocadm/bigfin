import { connect } from 'react-redux';
import {
  getOrganizationByIdFactory,
  isOrganizationReadyFactory,
  isOrganizationBuiltFactory,
  isOrganizationSubscribedFactory,
  isOrganizationCongratsFactory,
  isOrganizationBuildRunningFactory
} from '@/store/organizations/organizations.selectors';

/**
 * Что обёртка кладёт в свойства экрана (тот же приём, что у `withDashboard`,
 * Д3 карты v81). Организация — как лежит в хранилище, её форма здесь не
 * пересказывается.
 */
export interface OrganizationMapped {
  organization: any;
  isOrganizationReady: boolean;
  isOrganizationInitialized: boolean;
  isOrganizationSubscribed: boolean;
  isOrganizationSetupCompleted: boolean;
  isOrganizationBuildRunning: boolean;
}

export const withOrganization = (
  mapState?: (mapped: OrganizationMapped, state: any, props: any) => any,
) => {
  const getOrganizationById = getOrganizationByIdFactory();
  const isOrganizationReady = isOrganizationReadyFactory();
  const isOrganizationBuilt = isOrganizationBuiltFactory();

  const isOrganizationSubscribed = isOrganizationSubscribedFactory();
  const isOrganizationCongrats = isOrganizationCongratsFactory();
  const isOrganizationBuildRunning = isOrganizationBuildRunningFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped: OrganizationMapped = {
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