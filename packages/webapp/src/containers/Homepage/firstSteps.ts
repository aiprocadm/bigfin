/**
 * Чек-лист «первые шаги» (Р4 карты v16, вопрос 23).
 *
 * Главная новой организации выглядела так же, как у организации с годовым
 * оборотом, — человек не понимал, с чего начать. Отметки считаются по
 * НАСТОЯЩИМ данным, а не по «прошёл ли ты обучение».
 */
export interface FirstStepsCounts {
  customers: number;
  items: number;
  invoices: number;
  paymentsReceived: number;
  /** Банковские счета, созданные пользователем (не из сидов). */
  userBankAccounts: number;
}

export interface FirstStep {
  key: 'customer' | 'item' | 'invoice' | 'payment' | 'bank';
  done: boolean;
  /** Куда идти делать этот шаг. */
  href: string;
  labelKey: string;
}

/** Порядок — путь первой сделки: контрагент → товар → счёт → оплата → банк. */
export const buildFirstSteps = (counts: FirstStepsCounts): FirstStep[] => [
  {
    key: 'customer',
    done: counts.customers > 0,
    href: '/customers/new',
    labelKey: 'homepage.first_steps.customer',
  },
  {
    key: 'item',
    done: counts.items > 0,
    href: '/items/new',
    labelKey: 'homepage.first_steps.item',
  },
  {
    key: 'invoice',
    done: counts.invoices > 0,
    href: '/invoices/new',
    labelKey: 'homepage.first_steps.invoice',
  },
  {
    key: 'payment',
    done: counts.paymentsReceived > 0,
    href: '/payment-received/new',
    labelKey: 'homepage.first_steps.payment',
  },
  {
    key: 'bank',
    done: counts.userBankAccounts > 0,
    href: '/cashflow-accounts',
    labelKey: 'homepage.first_steps.bank',
  },
];
