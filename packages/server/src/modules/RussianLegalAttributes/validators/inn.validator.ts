import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const COEFF_10 = [2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
const COEFF_12_FIRST = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];
const COEFF_12_SECOND = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8, 0];

function checksumDigit(digits: number[], coefficients: number[]): number {
  const sum = digits.reduce((acc, d, i) => acc + d * coefficients[i], 0);
  return (sum % 11) % 10;
}

export function isValidInn(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d+$/.test(value)) return false;
  if (value.length !== 10 && value.length !== 12) return false;

  const digits = value.split('').map(Number);

  if (value.length === 10) {
    return checksumDigit(digits.slice(0, 10), COEFF_10) === digits[9];
  }
  const expected11 = checksumDigit(digits.slice(0, 11), COEFF_12_FIRST);
  const expected12 = checksumDigit(digits.slice(0, 12), COEFF_12_SECOND);
  return expected11 === digits[10] && expected12 === digits[11];
}

@ValidatorConstraint({ name: 'isValidInn', async: false })
export class InnConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true; // nullable
    return typeof value === 'string' && isValidInn(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    // Локализованное сообщение через nestjs-i18n — см. Task 5.
    return 'validation.inn.invalid';
  }
}
