/**
 * Денежное поле продукта.
 *
 * Наружу продукт берёт `MoneyInputGroup` — поле, говорящее на языке
 * организации (З1 карты v37). `CurrencyInput` — его начинка без знания о
 * валюте: она умеет печатать разряды и разбирать набранное, но какими
 * знаками — ей говорят снаружи.
 */
export { CurrencyInput } from './CurrencyInput';
export {
  OrganizationMoneyInput as MoneyInputGroup,
  toCanonicalAmount,
} from './OrganizationMoneyInput';
