import React from 'react';
import { useFeatureCan } from '@/hooks/state/feature';
import CustomersList from '../CustomersLanding/CustomersList';
import { CustomersListV2 } from './CustomersListV2';

/**
 * Рендерит новый список «Клиенты» при включённом флаге customers_list_v2,
 * иначе — текущий (легаси) список. Strangler Fig: старый код не трогаем.
 */
export default function CustomersListSwitch() {
  const { featureCan } = useFeatureCan();
  return featureCan('customers_list_v2') ? <CustomersListV2 /> : <CustomersList />;
}
