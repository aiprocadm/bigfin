/**
 * Общий контракт банковских коннекторов ⑨c. Каждый банк реализует
 * `BankConnector`; прикладной слой знает только про реестр, не про банки.
 */

export type BankProviderId = 'tinkoff' | 'alfa';

export const BANK_PROVIDER_IDS: BankProviderId[] = ['tinkoff', 'alfa'];

export const isBankProviderId = (v: unknown): v is BankProviderId =>
  typeof v === 'string' && (BANK_PROVIDER_IDS as string[]).includes(v);

/** Учётные данные банка: у Тинькофф — токен, у Альфы — OAuth-приложение. */
export type BankCredentials =
  | { kind: 'token'; token: string }
  | {
      kind: 'oauth';
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    };

/** Каноническая запись операции — вход для конвейера «Разбор» ⑨. */
export interface BankApiOperation {
  date: string;
  /** Знаковая: приход > 0, расход < 0 (как virtual getters модели). */
  amount: number;
  payee: string | null;
  payeeInn: string | null;
  externalId: string;
  referenceNo: string | null;
  description: string | null;
}

export interface BankConnector {
  readonly id: BankProviderId;

  /** Проверка учётных данных; бросает ServiceError при неверных. */
  ping(credentials: BankCredentials): Promise<void>;

  /** Операции по счёту за период в канонической форме. */
  fetchOperations(
    credentials: BankCredentials,
    accountNumber: string,
    from: string,
    to: string,
  ): Promise<BankApiOperation[]>;
}
