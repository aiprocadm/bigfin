// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '@/testing/activeCode';

/**
 * Экран операций говорит по-русски и считает деньги по-русски.
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ на самом частом экране продукта. Ответ сервера
 * содержал:
 *
 *   "formatted_withdrawal": "500,000.00"   ← английский формат
 *   "formatted_status": "Manual"           ← английское слово
 *
 * Причина у первого — валюта учёта НЕ ПЕРЕДАВАЛАСЬ в отчёт, и общий помощник
 * формата считал её неизвестной. У второго — подписи состояния были зашиты
 * в коде английскими строками, минуя словари.
 *
 * Тесты этого не видели: поля заполнены, ошибок нет. «Чужой язык» и
 * «неправильные разделители» проверяет только человек — или такой сторож.
 */
const MODULE = path.resolve(__dirname);

const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(MODULE, file), 'utf8'));

describe('операции говорят по-русски', () => {
  it('валюта учёта доезжает до отчёта операций', () => {
    // Без неё общий помощник формата выводит «500,000.00» вместо
    // «500 000,00 ₽» — и человек видит чужие разделители там, где у него
    // рубли.
    const service = read(
      'queries/GetBankAccountTransactions/GetBankAccountTransactions.service.ts',
    );

    expect(service).toContain('baseCurrency');
    expect(service).toContain('tenantMetadata?.baseCurrency');
  });

  it('отчёт принимает валюту и запоминает её', () => {
    const report = read(
      'queries/GetBankAccountTransactions/GetBankAccountTransactions.ts',
    );

    expect(report).toContain('this.baseCurrency = baseCurrency');
  });

  it('состояние операции берётся из словаря, а не зашито', () => {
    const report = read(
      'queries/GetBankAccountTransactions/GetBankAccountTransactions.ts',
    );

    expect(report).toContain('banking.transaction_status');
    // Прежний помощник возвращал английские слова прямо из кода.
    expect(report).not.toContain('formatBankTransactionsStatus(status)');
  });

  it('в словарях есть все три состояния, и по-русски', () => {
    const ru = JSON.parse(
      fs.readFileSync(
        path.resolve(MODULE, '../../i18n/ru/banking.json'),
        'utf8',
      ),
    );

    expect(Object.keys(ru.transaction_status).sort()).toEqual([
      'categorized',
      'manual',
      'matched',
    ]);

    // Кириллица обязательна: английское слово в русском словаре — это
    // перевод, которого нет.
    // Второго довода у `expect` здесь нет — сервер на Jest, а не на
    // vitest. Поэтому имя ключа кладём прямо в проверяемое значение: без
    // него сообщение о поломке не скажет, КАКОЕ состояние не переведено.
    const notRussian = Object.entries(ru.transaction_status)
      .filter(([, value]) => !/[а-яё]/i.test(String(value)))
      .map(([key, value]) => `${key}: ${value}`);

    expect(notRussian).toEqual([]);
  });
});
