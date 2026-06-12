// @ts-nocheck
import { Tab } from "@blueprintjs/core";
import intl from 'react-intl-universal';
import { Card, Group } from "@/components";
import { Tabs } from "@blueprintjs/core";
import { useState } from "react";
import { css } from '@emotion/css';
import { VendorFloatingActions } from "./VendorFloatingActions";
import { VendorFormSections } from "./VendorFormFields";

export function VendorFormContent() {
  const [selectedTabId, setSelectedTabId] = useState('primary');

  const handleTabChange = (tabId: string) => {
    const sectionId = String(tabId);
    setSelectedTabId(sectionId);

    const section = document.querySelector(
      `[data-section-id="${sectionId}"]`,
    );
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Card className={css`padding-bottom: 0 !important;`}>
      <Group verticalAlign={'top'} alignItems={'flex-start'} flexWrap={'nowrap'}>
        <Tabs
          selectedTabId={selectedTabId}
          onChange={handleTabChange}
          className={css`position: sticky; top: 20px;`}
          vertical
        >
          <Tab id={'primary'} title={intl.get('contact.form.tab.basic')} />
          <Tab id={'financial'} title={intl.get('financial')} />
          <Tab id={'billingAddress'} title={intl.get('billing_address')} />
          <Tab id={'shippingAddress'} title={intl.get('shipping_address')} />
          <Tab id={'notes'} title={intl.get('notes')} />
        </Tabs>
        <VendorFormSections />
      </Group>
      <VendorFloatingActions />
    </Card>
  )
}
