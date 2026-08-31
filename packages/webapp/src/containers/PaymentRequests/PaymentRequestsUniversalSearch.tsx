// © 2026 Bigfin
import intl from 'react-intl-universal';
import { RESOURCES_TYPES } from '@/constants/resourcesTypes';
import { makeSectionSelectAction } from '@/containers/UniversalSearch/sectionSearchBind';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const PaymentRequestUniversalSearchSelect = makeSectionSelectAction(
  RESOURCES_TYPES.PAYMENT_REQUEST,
  '/payment-requests',
);

/**
 * Заявку узнают по назначению платежа; справа — сумма. Назначение
 * необязательно, поэтому пустое подменяется сроком оплаты: строка без
 * текста в списке результатов ничего не говорит.
 */
const paymentRequestsToSearch = (request: any) => ({
  id: request.id,
  text: request.description || request.dueDate,
  label: formatOrganizationMoney(Number(request.amount) || 0),
  reference: request,
});

export const universalSearchPaymentRequestBind = () => ({
  resourceType: RESOURCES_TYPES.PAYMENT_REQUEST,
  optionItemLabel: intl.get('payment_requests.page_title'),
  selectItemAction: PaymentRequestUniversalSearchSelect,
  itemSelect: paymentRequestsToSearch,
});
