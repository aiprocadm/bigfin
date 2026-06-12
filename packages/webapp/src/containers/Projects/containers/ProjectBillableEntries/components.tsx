// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import { FormattedMessage as T, ButtonLink, FormatDate } from '@/components';

function BillableEntry({ label, children }) {
  return (
    <BillableEntryItem>
      <BillableEntryItemLabel>{label}</BillableEntryItemLabel>
      <BillableEntryItemContent>{children}</BillableEntryItemContent>
    </BillableEntryItem>
  );
}

function BillableEntriesList({ billableEntries }) {
  return (
    <BillableEntriesContent>
      <BillableEntry label={intl.get('type')}>
        <ButtonLink>{billableEntries.billable_type} </ButtonLink>
      </BillableEntry>

      <BillableEntry label={intl.get('projects.billable_entries.transaction_no')}>
        {billableEntries.billable_transaction_no}
      </BillableEntry>
      <BillableEntry label={intl.get('date')}>2022-02-02</BillableEntry>
      <BillableEntry label={intl.get('amount')}>
        {billableEntries.billable_amount_formatted}
      </BillableEntry>
    </BillableEntriesContent>
  );
}

export function BillableEntriesItems({ billableEntries }) {
  return billableEntries.map((entries) => (
    <BillableEntriesList billableEntries={entries} />
  ));
}

const BillableEntriesContent = styled.div`
  display: flex;
  padding: 6px 0px;
  &:not(:last-child) {
    border-bottom: 1px solid #d2dce2;
  }
`;

const BillableEntryItem = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  &:last-child {
    text-align: right;
  }
`;

const BillableEntryItemLabel = styled.div`
  color: #727983;
  font-weight: 500;
`;
const BillableEntryItemContent = styled.div`
  text-transform: capitalize;
  margin: 4px 0px;
`;
