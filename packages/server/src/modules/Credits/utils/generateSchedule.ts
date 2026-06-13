// © 2026 Bigfin
import * as moment from 'moment';

export type ScheduleType = 'annuity' | 'differentiated';

export interface GenerateScheduleInput {
  principal: number;
  annualRate: number; // годовая ставка в процентах, напр. 18.5
  termMonths: number;
  startDate: string; // YYYY-MM-DD (дата выдачи; первый платёж через месяц)
  scheduleType: ScheduleType;
}

export interface ScheduleRow {
  seqNo: number;
  dueDate: string;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
}

const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Строит график платежей по кредиту. Округление до 2 знаков; накопленная
 * ошибка округления добивается в последний платёж, поэтому сумма всех тел
 * точно равна телу кредита, а остаток последней строки = 0.
 */
export function generateSchedule(input: GenerateScheduleInput): ScheduleRow[] {
  const { principal, annualRate, termMonths, startDate, scheduleType } = input;
  const r = annualRate / 100 / 12; // месячная ставка
  const rows: ScheduleRow[] = [];
  let remaining = principal;

  const annuityPayment =
    r === 0
      ? round2(principal / termMonths)
      : round2((principal * r) / (1 - Math.pow(1 + r, -termMonths)));
  const diffPrincipal = round2(principal / termMonths);

  for (let seq = 1; seq <= termMonths; seq += 1) {
    const dueDate = moment(startDate).add(seq, 'months').format('YYYY-MM-DD');
    const isLast = seq === termMonths;
    const interest = round2(remaining * r);

    let principalPart: number;
    if (isLast) {
      principalPart = round2(remaining);
    } else if (scheduleType === 'annuity') {
      principalPart = round2(annuityPayment - interest);
    } else {
      principalPart = diffPrincipal;
    }

    const paymentAmount = round2(principalPart + interest);
    remaining = round2(remaining - principalPart);

    rows.push({
      seqNo: seq,
      dueDate,
      paymentAmount,
      principalAmount: principalPart,
      interestAmount: interest,
      remainingBalance: remaining < 0 ? 0 : remaining,
    });
  }

  return rows;
}
