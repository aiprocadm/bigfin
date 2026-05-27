import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * ОГРН — 13 цифр. Контрольная: первые 12 цифр % 11, mod 10.
 */
export function isValidOgrn(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{13}$/.test(value)) return false;

  const first12 = value.slice(0, 12);
  const checksum = (parseInt(first12, 10) % 11) % 10;
  return checksum === parseInt(value[12], 10);
}

@ValidatorConstraint({ name: 'isValidOgrn', async: false })
export class OgrnConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string' && isValidOgrn(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'validation.ogrn.invalid';
  }
}
