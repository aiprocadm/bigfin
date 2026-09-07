import { connect } from 'react-redux';
import { getCurrentOrganizationFactory } from '@/store/authentication/authentication.selectors';

export const withCurrentOrganization = (mapState?: any) => {
  const getCurrentOrganization = getCurrentOrganizationFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      organizationTenantId: state.authentication.organizationId,
      organizationId: state.authentication.organization,
      organization: getCurrentOrganization(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
