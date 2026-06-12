// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import TaxRateDetailsContentActionsBar from './TaxRateDetailsContentActionsBar';
import { TaxRateDetailsContentBoot } from './TaxRateDetailsContentBoot';
import { DrawerBody, DrawerHeaderContent } from '@/components';
import TaxRateDetailsContentDetails from './TaxRateDetailsContentDetails';
import { DRAWERS } from '@/constants/drawers';

interface TaxRateDetailsContentProps {
  taxRateid: number;
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
