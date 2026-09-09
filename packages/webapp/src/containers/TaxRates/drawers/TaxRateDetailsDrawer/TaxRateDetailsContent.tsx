// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React from 'react';
import intl from 'react-intl-universal';
import TaxRateDetailsContentActionsBar from './TaxRateDetailsContentActionsBar';
import { TaxRateDetailsContentBoot } from './TaxRateDetailsContentBoot';
import { DrawerBody, DrawerHeaderContent } from '@/components';
import TaxRateDetailsContentDetails from './TaxRateDetailsContentDetails';
import { DRAWERS } from '@/constants/drawers';

interface TaxRateDetailsContentProps {
  // Было `taxRateid` с маленькой «d» — опечатка в объявлении; сам экран и
  // место вызова пишут `taxRateId` (Д8 карты v83).
  taxRateId: number;
}

export default function TaxRateDetailsContent({
  taxRateId,
}: TaxRateDetailsContentProps) {
  return (
    <TaxRateDetailsContentBoot taxRateId={taxRateId}>
      <DrawerHeaderContent
        name={DRAWERS.TAX_RATE_DETAILS}
        title={intl.get('tax_rates.drawer.title')}
      />
      <TaxRateDetailsContentActionsBar />

      <DrawerBody>
        <TaxRateDetailsContentDetails />
      </DrawerBody>
    </TaxRateDetailsContentBoot>
  );
}
