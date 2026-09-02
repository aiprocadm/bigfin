import { Divider } from '@blueprintjs/core';
import { css } from '@emotion/css';
import { Box } from '@/components';

import { VendorFormBasicSection } from './VendorFormBasicSection';
import { VendorFormFinancialSection } from './VendorFormFinancialSection';
import { ContactRequisitesSection } from '@/containers/Contacts/ContactRequisitesSection';
import { VendorBillingAddress } from './VendorBillingAddress';
import { VendorShippingAddress } from './VendorShippingAddress';
import { VendorFormNotesSection } from './VendorFormNotesSection';

const vendorFormSectionDividerClass = css`
  margin: 20px 0;
`;

export function VendorFormSections() {
  return (
    <Box>
      <VendorFormBasicSection />
      <Divider className={vendorFormSectionDividerClass} />

      <VendorFormFinancialSection />
      <Divider className={vendorFormSectionDividerClass} />

      <ContactRequisitesSection />
      <Divider className={vendorFormSectionDividerClass} />

      <VendorBillingAddress />
      <Divider className={vendorFormSectionDividerClass} />

      <VendorShippingAddress />
      <Divider className={vendorFormSectionDividerClass} />

      <VendorFormNotesSection />
    </Box>
  );
}
