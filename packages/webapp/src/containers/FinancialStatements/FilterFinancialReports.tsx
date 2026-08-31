// @ts-nocheck
import { isEmpty } from 'lodash';
import { useAbilityContext } from '@/hooks';
import { useFeatureCan } from '@/hooks/state/feature';
import { useInterfaceMode } from '@/hooks/state/interfaceMode';
import { Features } from '@/constants/features';
import {
  isAccountantOnlyHidden,
  filterAccountantOnlyReports,
} from '@/constants/interfaceMode';

function useFilterFinancialReports(financialSection) {
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
    .map((section) => {
      const reports = section.reports.filter((report) => {
        return ability.can(report.ability, report.subject);
      });

      return {
        sectionTitle: section.sectionTitle,
        reports,
      };
    })
    .filter(({ reports }) => !isEmpty(reports));

  return filterAccountantOnlyReports(byAbility, accountantOnlyHidden);
}

export default useFilterFinancialReports;
