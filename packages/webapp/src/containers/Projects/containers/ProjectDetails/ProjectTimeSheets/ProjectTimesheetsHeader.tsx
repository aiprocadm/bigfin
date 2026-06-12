// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import { Intent } from '@blueprintjs/core';
import { FormatDate } from '@/components';
import {
  DetailFinancialCard,
  DetailFinancialSection,
  FinancialProgressBar,
  FinancialCardText,
} from '../components';
import { calculateStatus } from '@/utils';

/**
 * Project Timesheets header
 * @returns
 */
export function ProjectTimesheetsHeader() {
  return (
    <DetailFinancialSection>
      <DetailFinancialCard
        label={intl.get('project_details.label.project_estimate')}
        value={'3.14'}
      />
      <DetailFinancialCard
        label={intl.get('project_details.label.invoiced')}
        value={'0.00'}
      >
        <FinancialCardText>
          {intl.get('project_details.label.of_project_estimate', { value: 0 })}
        </FinancialCardText>
        <FinancialProgressBar intent={Intent.NONE} value={0} />
      </DetailFinancialCard>
      <DetailFinancialCard
        label={intl.get('project_details.label.time_expenses')}
        value={'0.00'}
      >
        <FinancialCardText>
          {intl.get('project_details.label.of_project_estimate', { value: 0 })}
        </FinancialCardText>
        <FinancialProgressBar intent={Intent.NONE} value={0} />
      </DetailFinancialCard>

      <DetailFinancialCard
        label={intl.get('project_details.label.to_be_invoiced')}
        value={'3.14'}
      />
      <DetailFinancialCard
        label={intl.get('projects.dialog.deadline')}
        value={<FormatDate value={'2022-06-08T22:00:00.000Z'} />}
      >
        <FinancialCardText>
          {intl.get('project_details.label.days_to_go', { days: 4 })}
        </FinancialCardText>
      </DetailFinancialCard>
    </DetailFinancialSection>
  );
}
