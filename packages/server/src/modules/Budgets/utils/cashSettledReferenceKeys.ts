import { TRANSFER_TYPES } from '../constants';

interface MinimalLeg {
  referenceType: string;
  referenceId: number;
  accountId: number;
  transactionType?: string | null;
}

/**
 * Returns the set of reference keys ("type:id") that represent a real cash
 * settlement: at least one leg on a cash account, and not an internal transfer.
 * @param {MinimalLeg[]} legs all transaction legs in the period
 * @param {(accountId: number) => boolean} isCashAccount
 * @returns {Set<string>}
 */
export function cashSettledReferenceKeys(
  legs: MinimalLeg[],
  isCashAccount: (accountId: number) => boolean,
): Set<string> {
  const transferTypes = new Set<string>(TRANSFER_TYPES as unknown as string[]);
  const touchedCash = new Set<string>();
  const isTransfer = new Set<string>();

  for (const leg of legs) {
    const key = `${leg.referenceType}:${leg.referenceId}`;
    if (isCashAccount(leg.accountId)) {
      touchedCash.add(key);
    }
    if (leg.transactionType && transferTypes.has(leg.transactionType)) {
      isTransfer.add(key);
    }
  }

  const result = new Set<string>();
  touchedCash.forEach((key) => {
    if (!isTransfer.has(key)) result.add(key);
  });
  return result;
}
