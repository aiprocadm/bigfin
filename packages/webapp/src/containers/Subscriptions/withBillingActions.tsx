import { connect } from 'react-redux';
import { submitBilling } from '@/store/billing/billing.action';

export const mapDispatchToProps = (dispatch: any) => ({
  requestSubmitBilling: (form: any) => dispatch(submitBilling({ form })),
});

export const withBillingActions = connect(null, mapDispatchToProps);
