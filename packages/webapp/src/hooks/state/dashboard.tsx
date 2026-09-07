import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import {
  splashStopLoading,
  splashStartLoading,
  dashboardPageTitle,
  openSidebarSubmenu,
  closeSidebarSubmenu,
  openDialog,
  closeDialog,
  openDrawer,
  closeDrawer,
  openAlert,
  closeAlert,
  changePreferencesPageTitle,
} from '@/store/dashboard/dashboard.actions';

export const useDispatchAction = (action: any) => {
  const dispatch = useDispatch();

  return useCallback(
    (payload: any) => {
      dispatch(action(payload));
    },
    [dispatch, action],
  );
};

export const useDashboardPageTitle = () => {
  return useDispatchAction(dashboardPageTitle);
};

/**
 * Splash loading screen actions.
 */
// Возвращает пару «начать» и «закончить»; тип объявлен явно, иначе проверка
// выводит массив из объединения и обе части перестают быть вызываемыми.
export const useSplashLoading = (): [
  (payload?: any) => void,
  (payload?: any) => void,
] => {
  return [
    useDispatchAction(splashStartLoading),
    useDispatchAction(splashStopLoading),
  ];
};

/**
 * Sidebar submenu actions.
 */
export const useSidebarSubmnuActions = () => {
  return {
    openSidebarSubmenu: useDispatchAction(openSidebarSubmenu),
    closeSidebarSubmenu: useDispatchAction(closeSidebarSubmenu),
    toggleSidebarSubmenu: useDispatchAction(openSidebarSubmenu),
  };
};

/**
 * Retrieves the sidebar submenu selector.
 */
const sidebarSubmenuSelector = createSelector(
  (state: any) => state.dashboard.sidebarSubmenu,
  (sidebarSubmenu: any) => sidebarSubmenu,
);

/**
 * Retrieves the sidebar submenu selector.
 */
export const useSidebarSubmenu = () => {
  const sidebarSubmenu = useSelector(sidebarSubmenuSelector);

  return {
    isOpen: sidebarSubmenu?.isOpen || false,
    submenuId: sidebarSubmenu?.submenuId || null,
  };
};

/**
 * Dialogs actions.
 */
export const useDialogActions = () => {
  const dispatch = useDispatch();

  return {
    openDialog: (name: string, payload?: {}) =>
      dispatch(openDialog(name, payload)),
    closeDialog: (name: string, payload?: {}) =>
      dispatch(closeDialog(name, payload)),
  };
};

/**
 * Drawer actions.
 * @returns
 */
export const useDrawerActions = () => {
  const dispatch = useDispatch();

  return {
    openDrawer: (name: any, payload?: {}) => dispatch(openDrawer(name, payload)),
    closeDrawer: (name: any, payload?: {}) => dispatch(closeDrawer(name, payload)),
  };
};

/**
 * Alert actions.
 * @returns
 */
export const useAlertActions = () => {
  const dispatch = useDispatch();

  return {
    openAlert: (name: any, payload?: {}) => dispatch(openAlert(name, payload)),
    closeAlert: (name: any, payload?: {}) => dispatch(closeAlert(name, payload)),
  };
};

export const useChangePreferencesPageTitle = () => {
  return useDispatchAction(changePreferencesPageTitle);
};
