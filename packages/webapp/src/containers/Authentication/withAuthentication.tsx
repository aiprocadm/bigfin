import { isAuthenticated } from '@/store/authentication/authentication.reducer';
import { connect } from 'react-redux';

/**
 * Что обёртка кладёт в свойства экрана. Объявлено по той же причине, что у
 * `withDashboard` (Д3 карты v81): с `mapState: any` разбор в вызове оставался
 * без типа.
 */
export interface AuthenticationMapped {
  isAuthorized: boolean;
  authenticatedUserId: string | number | null;
  currentOrganizationId: string | null | undefined;
}

/**
 * Довод `mapState` необязателен — обёртка и так отдаёт всё целиком, когда его
 * нет; объявление говорило обратное, и `withAuthentication()` считалось
 * ошибкой (Д2 карты v85).
 */
export const withAuthentication = (
  mapState?: (mapped: AuthenticationMapped, state: any, props: any) => any,
) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped: AuthenticationMapped = {
      isAuthorized: isAuthenticated(state),
      authenticatedUserId: state.authentication.userId,
      currentOrganizationId: state.authentication?.organizationId,
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
