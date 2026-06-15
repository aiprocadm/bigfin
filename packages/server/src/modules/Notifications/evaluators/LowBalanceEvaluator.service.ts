// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CASH_ACCOUNT_TYPES } from '@/modules/PaymentCalendar/constants';
import { Candidate } from '../utils/selectToFire';
import { lowBalanceDecide } from './lowBalanceDecide';

/** Default minimum balance threshold (in base currency) if not configured per tenant. */
const DEFAULT_MIN_AMOUNT = 0;

@Injectable()
export class LowBalanceEvaluatorService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async evaluate(threshold: any): Promise<Candidate[]> {
    const minAmount =
      Number(threshold?.minAmount) >= 0
        ? Number(threshold.minAmount)
        : DEFAULT_MIN_AMOUNT;

    const accounts: any[] = await this.accountModel()
      .query()
      .whereIn('accountType', CASH_ACCOUNT_TYPES as unknown as string[]);

    const mapped = accounts.map((a) => ({
      name: String(a.name ?? ''),
      amount: Number(a.amount) || 0,
    }));

    return lowBalanceDecide(mapped, minAmount);
  }
}
