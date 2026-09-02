import { connect } from 'react-redux';

const mapStateToProps = (state: any, props: any) => ({
  currentViewId: props.match.params.custom_view_id,
});

export const withCurrentView = connect(mapStateToProps);
