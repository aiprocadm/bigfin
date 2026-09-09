import React, { useMemo, useCallback } from 'react';
import moment from 'moment';
import intl from 'react-intl-universal';

import { FormattedMessage as T } from '@/components';
import {
  FinancialSheetRoot,
  FinancialSheetFooterCurrentTime,
  FinancialSheetFooterBasis,
  FinancialSheetFooter,
  FinancialSheetAccountingBasis,
  FinancialSheetTable,
  FinancialSheetDate,
  FinancialSheetType,
  FinancialSheetTitle,
} from './StyledFinancialSheet';

/**
 * Financial sheet.
 * @returns {React.JSX}
 */
/**
 * Свойства бланка отчёта. Все необязательные — сам компонент так и написан:
 * шапку он рисует, только если что-то из трёх её частей передали
 * (`companyName || sheetType || dateText`).
 *
 * Типа не было вовсе, проверка вывела все десять как обязательные, и восемь
 * отчётов считались ошибкой (Д7 карты v76).
 */
export interface FinancialSheetProps {
  /** Название организации в шапке. */
  companyName?: React.ReactNode;
  /** Название отчёта. */
  sheetType?: React.ReactNode;
  /** Период отчёта строкой. */
  dateText?: React.ReactNode;
  children?: React.ReactNode;
  /** Подпись про способ учёта в подвале. */
  accountingBasis?: React.ReactNode;
  /** Способ учёта: `cash` или `accrual`. */
  basis?: string;
  minimal?: boolean;
  fullWidth?: boolean;
  /** Печатать ли время составления в подвале. */
  currentDate?: boolean;
  className?: string;
}

/**
 * Название организации, которое обёртка подставляет каждой таблице отчёта.
 * Отдельный тип потому, что таких таблиц шесть и все объявляли его заново —
 * или, чаще, не объявляли вовсе (Д15 карты v76).
 */
export interface WithCompanyNameProps {
  companyName?: string;
}

export function FinancialSheet({
  companyName,
  sheetType,
  dateText,
  children,
  accountingBasis,
  basis,
  minimal = false,
  fullWidth = false,
  currentDate = true,
  className,
}: FinancialSheetProps) {
  const methodsLabels = useMemo(
    () => ({
      cash: intl.get('cash'),
      accrual: intl.get('accrual'),
    }),
    [],
  );
  const getBasisLabel = useCallback(
    // Способов учёта ровно два; всё прочее подписи не имеет.
    (b?: string) =>
      b && b in methodsLabels
        ? methodsLabels[b as keyof typeof methodsLabels]
        : undefined,
    [methodsLabels],
  );
  const basisLabel = useMemo(
    () => getBasisLabel(basis),
    [getBasisLabel, basis],
  );
  const hasHead = companyName || sheetType || dateText;

  return (
    <FinancialSheetRoot
      minimal={minimal}
      fullWidth={fullWidth}
      className={className}
    >
      {hasHead && (
        <div>
          {companyName && <FinancialSheetTitle>{companyName}</FinancialSheetTitle>}
          {sheetType && <FinancialSheetType>{sheetType}</FinancialSheetType>}
          {dateText && <FinancialSheetDate>{dateText}</FinancialSheetDate>}
        </div>
      )}

      <FinancialSheetTable>{children}</FinancialSheetTable>
      <FinancialSheetAccountingBasis>
        {accountingBasis}
      </FinancialSheetAccountingBasis>

      <FinancialSheetFooter>
        {basisLabel && (
          <FinancialSheetFooterBasis>
            <T id={'accounting_basis'} /> {basisLabel}
          </FinancialSheetFooterBasis>
        )}
        {currentDate && (
          <FinancialSheetFooterCurrentTime>
            {moment().format('YYYY MMM DD  HH:MM')}
          </FinancialSheetFooterCurrentTime>
        )}
      </FinancialSheetFooter>
    </FinancialSheetRoot>
  );
}
