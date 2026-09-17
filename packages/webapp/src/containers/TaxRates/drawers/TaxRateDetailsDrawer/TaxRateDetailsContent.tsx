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
  /** Имя ящика приходит от обёртки и дальше не читается. */
  name?: string;
  taxRateId?: number;
}

export default function TaxRateDetailsContent({
  taxRateId,
}: TaxRateDetailsContentProps) {
  return (
    <TaxRateDetailsContentBoot taxRateId={taxRateId}>
      <DrawerHeaderContent
        title={intl.get('tax_rates.drawer.title')}
      />
      <TaxRateDetailsContentActionsBar />

      <DrawerBody>
        <TaxRateDetailsContentDetails />
      </DrawerBody>
    </TaxRateDetailsContentBoot>
  );
}
