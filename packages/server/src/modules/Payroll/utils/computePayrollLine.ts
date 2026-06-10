// © 2026 Bigfin
import { PayrollSettingsValues } from '../constants';
import { toNumber, round2 } from './payrollMath';

export interface PayrollLineInput {
  employmentType: string;
  baseAmount: number;
  bonusAmount: number;
  deductionAmount: number;
}

export interface PayrollLineComputed {
  grossAmount: number;
  ndflAmount: number;
  contributionsAmount: number;
  netAmount: number;
  totalCost: number;
}

const TAXABLE_TYPES = ['staff', 'gph'];

/**
 * Расчёт строки начисления. Налоги — упрощённо по ставкам из настроек
 * (без годовых накопленных баз, см. спеку §5). Удержание — после налогов.
 */
export function computePayrollLine(
  input: PayrollLineInput,
  settings: PayrollSettingsValues,
): PayrollLineComputed {
  const base = toNumber(input.baseAmount);
  const bonus = toNumber(input.bonusAmount);
  const deduction = toNumber(input.deductionAmount);
  const gross = round2(base + bonus);

  let ndfl = 0;
  let contributions = 0;

  if (TAXABLE_TYPES.includes(input.employmentType)) {
    ndfl = round2((gross * toNumber(settings.ndflRate)) / 100);

    if (settings.contribMode === 'msp') {
      const threshold = toNumber(settings.mspThreshold);
      const below = Math.min(gross, threshold);
      const above = Math.max(0, gross - threshold);
      contributions = round2(
        (below * toNumber(settings.contribRate)) / 100 +
          (above * toNumber(settings.mspRate)) / 100,
      );
    } else {
      contributions = round2((gross * toNumber(settings.contribRate)) / 100);
    }
  }
  return {
    grossAmount: gross,
    ndflAmount: ndfl,
    contributionsAmount: contributions,
    netAmount: round2(gross - ndfl - deduction),
    totalCost: round2(gross + contributions),
  };
}
