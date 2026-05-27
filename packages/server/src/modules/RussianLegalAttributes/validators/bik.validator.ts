import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * БИК — 9 цифр, всегда начинается с '04' для российских банков.
 */
export function isValidBik(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^04\d{7}$/.test(value);
}

@ValidatorConstraint({ name: 'isValidBik', async: false })
export class BikConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string' && isValidBik(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'validation.bik.invalid';
  }
}
