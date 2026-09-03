import { connect } from 'react-redux';
import { getPlanSelector } from '@/store/plans/plans.selectors';

export const withPlan = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const getPlan = getPlanSelector();

    const mapped = {
      plan: getPlan(state, props),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
