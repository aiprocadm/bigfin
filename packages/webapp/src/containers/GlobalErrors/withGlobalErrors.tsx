import { connect } from 'react-redux';


const mapStateToProps = (state: any) => {
  return {
    globalErrors: state.globalErrors.data,
  };
};

export const withGlobalErrors = connect(mapStateToProps);