import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Валидация КПП. 9 символов.
 * Позиции 1-4 — код налогового органа (цифры).
 * Позиции 5-6 — либо обе цифры (для российских), либо обе латинские
 *               буквы A-Z (для иностранных); смесь не допускается.
 * Позиции 7-9 — порядковый номер (цифры).
 */
export function isValidKpp(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9]{4}([0-9]{2}|[A-Z]{2})[0-9]{3}$/.test(value);
}

@ValidatorConstraint({ name: 'isValidKpp', async: false })
export class KppConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string' && isValidKpp(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'validation.kpp.invalid';
  }
}
