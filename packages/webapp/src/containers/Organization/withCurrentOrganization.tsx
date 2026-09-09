import { connect } from 'react-redux';
import { getCurrentOrganizationFactory } from '@/store/authentication/authentication.selectors';

/**
 * Что обёртка кладёт в свойства экрана.
 *
 * Раньше `mapState` был объявлен как `any`, и разбор в вызове —
 * `withCurrentOrganization(({ organization }) => …)` — оставался без типа.
 * Из-за этого каждый такой экран не мог выйти из-под пометки «не проверять
 * типы» (Д3 карты v81). Объявление здесь чинит сразу все места вызова.
 */
export interface CurrentOrganizationMapped {
  organizationTenantId: string;
  organizationId: string;
  organization: any;
}

export const withCurrentOrganization = <TMapped,>(
  mapState?: (
    mapped: CurrentOrganizationMapped,
    state: any,
    props: any,
  ) => TMapped,
) => {
  const getCurrentOrganization = getCurrentOrganizationFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped: CurrentOrganizationMapped = {
      organizationTenantId: state.authentication.organizationId,
      organizationId: state.authentication.organization,
      organization: getCurrentOrganization(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
