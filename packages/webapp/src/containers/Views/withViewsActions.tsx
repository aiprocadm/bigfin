import {connect} from 'react-redux';
import {
  fetchView,
  submitView,
  deleteView,
  editView,
  fetchViewResource,
  fetchResourceViews,
} from '@/store/custom-views/custom-views.actions';


export const mapDispatchToProps = (dispatch: any) => ({
  requestFetchView: (id: any) => dispatch(fetchView({ id })),
  requestSubmitView: (form: any) => dispatch(submitView({ form })),
  requestEditView: (id: any, form: any) => dispatch(editView({ id, form })),
  requestDeleteView: (id: any) => dispatch(deleteView({ id })),

  requestFetchResourceViews: (resourceSlug: any) => dispatch(fetchResourceViews({ resourceSlug })),
  requestFetchViewResource: (id: any) => dispatch(fetchViewResource({ id })),
});

export const withViewsActions = connect(null, mapDispatchToProps);