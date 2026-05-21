// @ts-nocheck
import accounting from 'accounting';

/**
 * Configures accounting.js global settings based on current locale.
 * Call once after intl.init() completes.
 *
 * For 'ru': thousand separator = non-breaking space, decimal = comma,
 *           currency format "1 234,56 ₽".
 * For others: keeps accounting.js defaults (1,234.56 / $1,234.56).
 */
export function configureAccountingForLocale(currentLocale: string): void {
  if (currentLocale === 'ru') {
    accounting.settings.number = {
      precision: 2,
      thousand: ' ', // non-breaking space yields "1 234,56" without wrap
      decimal: ',',
    };
    accounting.settings.currency = {
      symbol: '₽',
      format: '%v %s', // 1 234,56 ₽
      decimal: ',',
      thousand: ' ',
      precision: 2,
    };
  }
  // Для en и других локалей не трогаем — используются дефолты accounting.js.
}
