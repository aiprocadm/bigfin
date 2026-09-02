import { connect } from 'react-redux';

import {
  setProjectsTableState,
  resetProjectsTableState,
} from '@/store/project/projects.actions';

const mapDispatchToProps = (dispatch: any) => ({
  setProjectsTableState: (state: any) => dispatch(setProjectsTableState(state)),
  resetProjectsTableState: () => dispatch(resetProjectsTableState()),
});

export const withProjectsActions = connect(null, mapDispatchToProps);
