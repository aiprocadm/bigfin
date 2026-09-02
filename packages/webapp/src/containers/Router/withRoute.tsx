import { connect } from "react-redux";
import { withRouter } from "react-router-dom"

export const withRoute = (mapState: any) => {
  return () => withRouter ;
};