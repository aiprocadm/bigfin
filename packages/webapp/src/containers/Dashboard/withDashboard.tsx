import { connect } from 'react-redux';

/**
 * Что обёртка кладёт в свойства экрана.
 *
 * Объявлено по той же причине, что и у `withCurrentOrganization`: с `mapState:
 * any` разбор в вызове оставался без типа и держал экран под пометкой
 * «не проверять типы» (Д3 карты v81).
 */
export interface DashboardMapped {
  pageTitle: string;
  pageSubtitle: string;
  pageHint: string;
  editViewId: number | null;
  sidebarExpended: boolean;
  preferencesPageTitle: string;
  dashboardBackLink: boolean;
  splashScreenLoading: boolean;
  splashScreenCompleted: boolean;
}

export const withDashboard = <TMapped,>(
  mapState?: (mapped: DashboardMapped, state: any, props: any) => TMapped,
) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped: DashboardMapped = {
      pageTitle: state.dashboard.pageTitle,
      pageSubtitle: state.dashboard.pageSubtitle,
      pageHint: state.dashboard.pageHint,
      editViewId: state.dashboard.topbarEditViewId,
      sidebarExpended: state.dashboard.sidebarExpended,
      preferencesPageTitle: state.dashboard.preferencesPageTitle,
      dashboardBackLink: state.dashboard.backLink,
      splashScreenLoading: state.dashboard.splashScreenLoading > 0,
      splashScreenCompleted: state.dashboard.splashScreenLoading === 0,
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
