import { connect } from 'react-redux';
import {
  getProjectsTableStateFactory,
  isProjectsTableStateChangedFactory,
} from '@/store/project/projects.selectors';

export const withProjects = (mapState: any) => {
  const getProjectsTableState = getProjectsTableStateFactory();
  const isProjectsTableStateChanged = isProjectsTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      projectsTableState: getProjectsTableState(state, props),
      projectsTableStateChanged: isProjectsTableStateChanged(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
