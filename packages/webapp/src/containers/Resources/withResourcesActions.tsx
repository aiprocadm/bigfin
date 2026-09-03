import {connect} from 'react-redux';
import {
  fetchResourceColumns,
  fetchResourceFields,
  fetchResourceData,
} from '@/store/resources/resources.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  requestFetchResourceFields: (resourceSlug: any) => dispatch(fetchResourceFields({ resourceSlug })),
  requestFetchResourceColumns: (resourceSlug: any) => dispatch(fetchResourceColumns({ resourceSlug })),
  requestResourceData: (resourceSlug: any) => dispatch(fetchResourceData({ resourceSlug })),
});

export const withResourcesActions = connect(null, mapDispatchToProps);