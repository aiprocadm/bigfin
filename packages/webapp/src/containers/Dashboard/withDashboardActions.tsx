import { connect } from 'react-redux';
import { ALTER_DASHBOARD_PAGE_SUBTITLE, CHANGE_DASHBOARD_PAGE_HINT, CHANGE_DASHBOARD_PAGE_TITLE, CHANGE_PREFERENCES_PAGE_TITLE, SET_DASHBOARD_BACK_LINK, SET_DASHBOARD_REQUEST_COMPLETED, SET_DASHBOARD_REQUEST_LOADING, SET_TOPBAR_EDIT_VIEW } from '@/store/types';;
import {
  toggleExpendSidebar,
} from '@/store/dashboard/dashboard.actions';
import { splashStartLoading, splashStopLoading } from '@/store/dashboard/dashboard.actions';

const mapActionsToProps = (dispatch: any) => ({
  changePageTitle: (pageTitle: any) =>
    dispatch({
      type: CHANGE_DASHBOARD_PAGE_TITLE,
      pageTitle,
    }),

  changePageSubtitle: (pageSubtitle: any) =>
    dispatch({
      type: ALTER_DASHBOARD_PAGE_SUBTITLE,
      pageSubtitle,
    }),

  changePageHint: (pageHint: any) =>
    dispatch({
      type: CHANGE_DASHBOARD_PAGE_HINT,
      payload: { pageHint },
    }),

  setTopbarEditView: (id: any) =>
    dispatch({
      type: SET_TOPBAR_EDIT_VIEW,
      id,
    }),

  setDashboardRequestLoading: () =>
    dispatch({
      type: SET_DASHBOARD_REQUEST_LOADING,
    }),

  setDashboardRequestCompleted: () =>
    dispatch({
      type: SET_DASHBOARD_REQUEST_COMPLETED,
    }),

  /**
   * Toggles the sidebar expend.
   */
  toggleSidebarExpand: (toggle: any) => dispatch(toggleExpendSidebar(toggle)),

  changePreferencesPageTitle: (pageTitle: any) =>
    dispatch({
      type: CHANGE_PREFERENCES_PAGE_TITLE,
      pageTitle,
    }),

  setDashboardBackLink: (backLink: any) =>
    dispatch({
      type: SET_DASHBOARD_BACK_LINK,
      payload: { backLink },
    }),

  // Splash screen start/stop loading.
  splashStartLoading: () => splashStartLoading(),
  splashStopLoading: () => splashStopLoading(),
});

export const withDashboardActions = connect(null, mapActionsToProps);
