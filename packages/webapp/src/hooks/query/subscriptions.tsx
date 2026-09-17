import { useMutation } from 'react-query';
import useApiRequest from '../useRequest';

// Двух мёртвых хуков здесь больше нет (Р3 карты v16): usePaymentByVoucher
// бил в `subscription/license/payment`, а useOrganizationSubscriptions — в
// `subscriptions` (сервер отвечает на `subscription`, без «s»). Оба адреса
// не существовали, оба хука никто не импортировал.

/**
 * Fetches the checkout url of the Lemon Squeezy.
 */
export const useGetLemonSqueezyCheckout = (props = {}) => {
  const apiRequest = useApiRequest();

  return useMutation(
    (values: { variantId: number }) =>
      apiRequest
        .post('subscription/lemon/checkout_url', values)
        .then((res) => res.data),
    {
      ...props,
    },
  );
};
