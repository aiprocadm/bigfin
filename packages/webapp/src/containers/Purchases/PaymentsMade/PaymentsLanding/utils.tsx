import { pick } from 'lodash';

export const transformPaymentViewsToTabs = (paymentMadeViews: any) => {
    return paymentMadeViews.map((view: any) => ({
      ...pick(view, ['name', 'id']),
    }));
  };