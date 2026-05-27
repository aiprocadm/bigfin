import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Банковский расчётный счёт — 20 цифр (полная banking-key checksum в backlog).
 */
export function isValidBankAccount(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{20}$/.test(value);
}

/**
 * Корреспондентский счёт — 20 цифр, начинается с 30101.
 */
export function isValidCorrespondentAccount(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^30101\d{15}$/.test(value);
}

@ValidatorConstraint({ name: 'isValidBankAccount', async: false })
export class BankAccountConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string' && isValidBankAccount(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'validation.bankAccount.invalid';
  }
}

@ValidatorConstraint({ name: 'isValidCorrespondentAccount', async: false })
export class CorrespondentAccountConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    return (
      typeof value === 'string' && isValidCorrespondentAccount(value)
    );
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'validation.correspondentAccount.invalid';
  }
}
