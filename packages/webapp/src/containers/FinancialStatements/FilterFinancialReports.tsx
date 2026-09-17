import React from 'react';
import { isEmpty } from 'lodash';
import { useAbilityContext } from '@/hooks';
import { useFeatureCan } from '@/hooks/state/feature';
import { useInterfaceMode } from '@/hooks/state/interfaceMode';
import { Features } from '@/constants/features';
import {
  isAccountantOnlyHidden,
  filterAccountantOnlyReports,
} from '@/constants/interfaceMode';

/** Одна карточка отчёта в меню «Все отчёты». */
export interface FinancialReportItem {
  title: React.ReactNode;
  desc: React.ReactNode;
  link: string;
  subject?: any;
  ability?: any;
}

/** Секция меню отчётов — заголовок и карточки под ним. */
export interface FinancialReportSection {
  sectionTitle: React.ReactNode;
  reports: FinancialReportItem[];
}

function useFilterFinancialReports(
  financialSection: any,
): FinancialReportSection[] {
  const ability = useAbilityContext();
  const mode = useInterfaceMode();
  const { featureCan } = useFeatureCan();

  // Р1 карты v40. В режиме «Бизнес» три бухгалтерских отчёта скрыты —
  // маршрут их не откроет. Меню не предлагает того, чего продукт не покажет.
  const accountantOnlyHidden = isAccountantOnlyHidden(
    mode,
    featureCan(Features.InterfaceModes),
  );

  const byAbility = financialSection
    .map((section: any) => {
      const reports = section.reports.filter((report: any) => {
        return ability.can(report.ability, report.subject);
      });

      return {
        sectionTitle: section.sectionTitle,
        reports,
      };
    })
    .filter(({ reports }: any) => !isEmpty(reports));

  return filterAccountantOnlyReports(byAbility, accountantOnlyHidden);
}

export default useFilterFinancialReports;
