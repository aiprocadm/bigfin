import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * ОГРНИП — 15 цифр. Контрольная: первые 14 цифр % 13, mod 10.
 */
export function isValidOgrnip(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{15}$/.test(value)) return false;

  const first14 = value.slice(0, 14);
  const checksum = (parseInt(first14, 10) % 13) % 10;
  return checksum === parseInt(value[14], 10);
}

@ValidatorConstraint({ name: 'isValidOgrnip', async: false })
export class OgrnipConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string' && isValidOgrnip(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'validation.ogrnip.invalid';
  }
}
