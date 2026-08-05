import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidOgrn } from './ogrn.validator';
import { isValidOgrnip } from './ogrnip.validator';

/**
 * ОГРН или ОГРНИП в одном поле.
 *
 * У организации и у контрагента номер лежит в одной колонке: у юрлица это
 * ОГРН (13 цифр), у предпринимателя — ОГРНИП (15). Раньше проверялась только
 * длина, хотя контрольная сумма для обоих уже посчитана и покрыта тестами:
 * опечатка в одной цифре проходила насквозь и попадала в счёт и УПД.
 */
export function isValidOgrnAny(value: string): boolean {
  if (typeof value !== 'string') return false;

  if (value.length === 15) return isValidOgrnip(value);
  return isValidOgrn(value);
}

@ValidatorConstraint({ name: 'isValidOgrnAny', async: false })
export class OgrnAnyConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return isValidOgrnAny(value);
  }

  defaultMessage(): string {
    return 'ОГРН должен состоять из 13 цифр, ОГРНИП — из 15, с верной контрольной цифрой';
  }
}
