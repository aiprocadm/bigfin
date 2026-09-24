// © 2026 Bigfin
import { TaxRegime } from '@/modules/RussianLegalAttributes/constants';
import {
  estimateSimplifiedTax,
  SimplifiedTaxEstimate,
} from '@/modules/Dashboard/queries/estimateSimplifiedTax';
import { AccountTaxRegime } from '@/modules/Accounts/utils/accountTaxRegime';

/**
 * Оценка налога по счетам с разными режимами (FT-070 ТЗ-3).
 *
 * ЗАЧЕМ. Одна организация Bigfin бывает несколькими налогоплательщиками
 * сразу: ИП на упрощёнке плюс самозанятость на личной карте, или счёт, по
 * которому с 2025 года платится НДС 5 %. Одна ставка на всё врёт — и врёт
 * в сумме, которую человек откладывает на налог.
 *
 * КАК. База (доход и расход кассовым методом) считается по каждому счёту
 * отдельно, налог — по режиму этого счёта, итог — сумма. Счета без своего
 * режима складываются в одну корзину и считаются по режиму и ставке
 * организации — РОВНО той же функцией `estimateSimplifiedTax`, что и раньше.
 * Поэтому, пока ни у одного счёта режим не выбран, результат совпадает с
 * прежним до копейки.
 *
 * ЭТО ОЦЕНКА, а не расчёт: как и `estimateSimplifiedTax`, не учитываются
 * страховые взносы, убытки прошлых лет и минимальный налог 1 % на «Доходах
 * минус расходах» (он сравнивается с налогом за ГОД, а здесь квартальный
 * аванс — применить его к кварталу значило бы завысить аванс).
 */

/** База одного счёта за период. */
export interface AccountTaxBase {
  accountId: number;
  /** Режим счёта; `null` — как у организации. */
  regime: AccountTaxRegime | string | null;
  income: number;
  expenses: number;
}

/** Часть оценки: один счёт со своим режимом или корзина «как у организации». */
export interface AccountTaxPart {
  /** `null` — счета без своего режима, посчитанные по режиму организации. */
  accountId: number | null;
  regime: string;
  /** Налог части вместе с НДС. */
  amount: number;
  /** Ставка налога на доход (упрощёнка, АУСН, НПД), в процентах. */
  ratePercent: number;
  /** База налога на доход. */
  base: number;
  /** НДС к уплате (только режимы «упрощёнка с НДС»). */
  vatAmount: number;
  vatPercent: number;
}

export interface TaxByAccountsEstimate extends SimplifiedTaxEstimate {
  parts: AccountTaxPart[];
}

/** Как считать режим счёта: какой вариант упрощёнки, какая ставка, какой НДС. */
interface RegimeRule {
  /** Режим, по которому `estimateSimplifiedTax` считает налог на доход. */
  incomeRegime: TaxRegime;
  /** Своя ставка; `null` — ставка режима. */
  ratePercent: number | null;
  /** Ставка НДС, 0 — без НДС. */
  vatPercent: 0 | 5 | 7 | 20;
}

/**
 * Налог на профессиональный доход: 4 % с физлиц и 6 % с компаний и ИП. Кто
 * заплатил, по деньгам на счёте не видно, поэтому берём БОЛЬШУЮ ставку:
 * отложить лишнее безопаснее, чем недоложить к сроку.
 */
const NPD_RATE_PERCENT = 6;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Правило режима счёта. `null` — оценки для этого счёта нет.
 *
 * Своя ставка организации (региональная льгота из реквизитов) относится к
 * РЕЖИМУ организации, поэтому переносится на счёт, только если режим счёта
 * тот же. Иначе льгота «Доходов» 1 % молча легла бы на счёт «Доходы минус
 * расходы».
 *
 * ОСНО и патент — оценки нет, как и в `estimateSimplifiedTax`: на патенте
 * налог не зависит от выручки, а общая система — отдельная большая тема.
 */
function regimeRule(
  regime: string,
  orgRegime: string | null | undefined,
  orgCustomRatePercent: number | null | undefined,
): RegimeRule | null {
  const customIfSame = (incomeRegime: TaxRegime) =>
    orgRegime === incomeRegime ? orgCustomRatePercent ?? null : null;

  // Упрощёнка с НДС: налог на доход — по варианту упрощёнки организации.
  // Отдельного выбора «Доходы» / «Доходы минус расходы» у такого счёта нет,
  // и самое честное — взять вариант из реквизитов; не указан — «Доходы».
  const usnOfOrg =
    orgRegime === TaxRegime.USN_INCOME_EXPENSE
      ? TaxRegime.USN_INCOME_EXPENSE
      : TaxRegime.USN_INCOME;

  switch (regime) {
    case 'USN_INCOME':
      return {
        incomeRegime: TaxRegime.USN_INCOME,
        ratePercent: customIfSame(TaxRegime.USN_INCOME),
        vatPercent: 0,
      };
    case 'USN_INCOME_EXPENSE':
      return {
        incomeRegime: TaxRegime.USN_INCOME_EXPENSE,
        ratePercent: customIfSame(TaxRegime.USN_INCOME_EXPENSE),
        vatPercent: 0,
      };
    case 'AUSN':
      return {
        incomeRegime: TaxRegime.AUSN,
        ratePercent: customIfSame(TaxRegime.AUSN),
        vatPercent: 0,
      };
    case 'NPD':
      // База — доход, как у «Доходов»; ставка своя, льгот у неё нет.
      return {
        incomeRegime: TaxRegime.USN_INCOME,
        ratePercent: NPD_RATE_PERCENT,
        vatPercent: 0,
      };
    case 'USN_VAT_5':
      return { incomeRegime: usnOfOrg, ratePercent: customIfSame(usnOfOrg), vatPercent: 5 };
    case 'USN_VAT_7':
      return { incomeRegime: usnOfOrg, ratePercent: customIfSame(usnOfOrg), vatPercent: 7 };
    case 'USN_VAT_20':
      return { incomeRegime: usnOfOrg, ratePercent: customIfSame(usnOfOrg), vatPercent: 20 };
    default:
      return null;
  }
}

/**
 * НДС счёта «упрощёнка с НДС».
 *
 * Деньги на счёте пришли вместе с НДС, поэтому налог выделяется из суммы:
 * доход × ставка / (100 + ставка). По ставкам 5 и 7 % вычетов входного НДС
 * нет по закону — налог с выручки весь. По 20 % вычеты есть; сколько НДС в
 * расходах, по деньгам не видно, и оценка считает, что поставщики с НДС —
 * иначе она завысила бы налог у тех, кто покупает у плательщиков НДС.
 *
 * Выделенный НДС — не доход упрощёнки, а вычтенный входной — не её расход,
 * поэтому база налога на доход считается уже без них.
 */
function splitVat(
  income: number,
  expenses: number,
  vatPercent: number,
): { vat: number; incomeNet: number; expensesNet: number } {
  if (!vatPercent) return { vat: 0, incomeNet: income, expensesNet: expenses };

  const vatOut = income > 0 ? (income * vatPercent) / (100 + vatPercent) : 0;
  const vatIn =
    vatPercent === 20 && expenses > 0
      ? (expenses * vatPercent) / (100 + vatPercent)
      : 0;

  return {
    vat: Math.max(0, vatOut - vatIn),
    incomeNet: income - vatOut,
    expensesNet: expenses - vatIn,
  };
}

/**
 * Оценка налога за квартал по счетам.
 *
 * @returns `null`, если ни одна часть оценки не дала — все счета на ОСНО или
 *   патенте, или организация без режима и у счетов режима нет. Тогда плитка
 *   не показывается, как и раньше.
 */
export function estimateTaxByAccounts(params: {
  orgRegime: string | null | undefined;
  orgCustomRatePercent?: number | null;
  accounts: AccountTaxBase[];
  today: string;
}): TaxByAccountsEstimate | null {
  const { orgRegime, orgCustomRatePercent, accounts, today } = params;

  const parts: Array<AccountTaxPart & { estimate: SimplifiedTaxEstimate }> = [];

  // Корзина «как у организации»: счета без своего режима считаются ВМЕСТЕ,
  // одной базой, — ровно так, как считалась вся организация до FT-070.
  // Считается и пустой: прежний путь показывал «0 ₽ к уплате», когда денег
  // за квартал не было, и молча прятать плитку из-за режима одного счёта
  // было бы переменой поведения, о которой никто не просил.
  const inherited = accounts.filter((account) => !account.regime);
  {
    const income = inherited.reduce((sum, a) => sum + (Number(a.income) || 0), 0);
    const expenses = inherited.reduce((sum, a) => sum + (Number(a.expenses) || 0), 0);
    const estimate = estimateSimplifiedTax({
      regime: orgRegime,
      income,
      expenses,
      today,
      customRatePercent: orgCustomRatePercent,
    });
    if (estimate) {
      parts.push({
        accountId: null,
        regime: String(orgRegime),
        amount: estimate.amount,
        ratePercent: estimate.ratePercent,
        base: estimate.base,
        vatAmount: 0,
        vatPercent: 0,
        estimate,
      });
    }
  }

  accounts
    .filter((account) => !!account.regime)
    .forEach((account) => {
      const rule = regimeRule(
        String(account.regime),
        orgRegime,
        orgCustomRatePercent,
      );
      if (!rule) return;

      const { vat, incomeNet, expensesNet } = splitVat(
        Number(account.income) || 0,
        Number(account.expenses) || 0,
        rule.vatPercent,
      );
      const estimate = estimateSimplifiedTax({
        regime: rule.incomeRegime,
        income: incomeNet,
        expenses: expensesNet,
        today,
        customRatePercent: rule.ratePercent,
      });
      if (!estimate) return;

      const vatAmount = round2(vat);
      parts.push({
        accountId: account.accountId,
        regime: String(account.regime),
        amount: round2(estimate.amount + vatAmount),
        ratePercent: estimate.ratePercent,
        base: estimate.base,
        vatAmount,
        vatPercent: rule.vatPercent,
        estimate,
      });
    });

  if (parts.length === 0) return null;

  const amount = round2(parts.reduce((sum, part) => sum + part.amount, 0));
  const base = round2(parts.reduce((sum, part) => sum + part.base, 0));

  // Ставка в ответе одна, а частей несколько. Совпадает у всех и НДС нет —
  // показываем её; иначе честнее средняя: сколько налога приходится на
  // рубль базы. Показать ставку одного из счетов значило бы соврать про
  // остальные.
  const rates = new Set(parts.map((part) => part.ratePercent));
  const hasVat = parts.some((part) => part.vatAmount > 0);
  const ratePercent =
    rates.size === 1 && !hasVat
      ? parts[0].ratePercent
      : base > 0
        ? Math.round((amount / base) * 1000) / 10
        : parts[0].ratePercent;

  // Все части — один и тот же квартал: даты берём у любой.
  const { fromDate, toDate, dueDate } = parts[0].estimate;

  return {
    amount,
    ratePercent,
    base,
    fromDate,
    toDate,
    dueDate,
    parts: parts.map(({ estimate: _estimate, ...part }) => part),
  };
}
