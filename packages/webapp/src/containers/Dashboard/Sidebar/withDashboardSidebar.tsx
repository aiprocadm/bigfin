
import { connect } from 'react-redux';

export const withDashboardSidebar = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      sidebarSubmenuOpen: state.dashboard.sidebarSubmenu.isOpen,
      sidebarSubmenuId: state.dashboard.sidebarSubmenu.submenuId,
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
}
