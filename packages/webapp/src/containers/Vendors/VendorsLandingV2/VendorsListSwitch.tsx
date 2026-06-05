import React from 'react';
import { useFeatureCan } from '@/hooks/state/feature';
import VendorsList from '../VendorsLanding/VendorsList';
import { VendorsListV2 } from './VendorsListV2';

/**
 * Рендерит новый список «Поставщики» при включённом флаге vendors_list_v2,
 * иначе — текущий (легаси) список. Strangler Fig: старый код не трогаем.
 */
export default function VendorsListSwitch() {
  const { featureCan } = useFeatureCan();
  return featureCan('vendors_list_v2') ? <VendorsListV2 /> : <VendorsList />;
}
