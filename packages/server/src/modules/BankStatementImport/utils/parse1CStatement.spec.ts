import { decodeStatementBuffer } from './decodeStatement';
import { parse1CStatement } from './parse1CStatement';
import { resolveDirection, buildExternalId } from './statementHelpers';

describe('decodeStatementBuffer', () => {
  it('декодирует windows-1251 в кириллицу', () => {
    // 0xCE 0xCE 0xCE = "ООО" в cp1251
    const buf = Buffer.from([0xce, 0xce, 0xce]);
    expect(decodeStatementBuffer(buf)).toBe('ООО');
  });

  it('декодирует UTF-8 с BOM', () => {
    const buf = Buffer.from('﻿Привет', 'utf8');
    expect(decodeStatementBuffer(buf)).toBe('Привет');
  });
});

const FIXTURE = [
  '1CClientBankExchange',
  'ВерсияФормата=1.03',
  'Кодировка=Windows',
  'РасчСчет=40702810400000012345',
  'СекцияДокумент=Платежное поручение',
  'Номер=101',
  'Дата=15.06.2026',
  'Сумма=15000.50',
  'ПлательщикСчет=40702810400000099999',
  'Плательщик=ООО "Клиент"',
  'ПлательщикИНН=7701234567',
  'ПлательщикРасчСчет=40702810400000099999',
  'ПолучательСчет=40702810400000012345',
  'Получатель=ООО "Наша Компания"',
  'ПолучательИНН=7707654321',
  'ПолучательРасчСчет=40702810400000012345',
  'НазначениеПлатежа=Оплата по счету 5 от 01.06.2026',
  'КонецДокумента',
  'СекцияДокумент=Платежное поручение',
  'Номер=102',
  'Дата=16.06.2026',
  'Сумма=3000.00',
  'ПлательщикРасчСчет=40702810400000012345',
  'Плательщик=ООО "Наша Компания"',
  'ПлательщикИНН=7707654321',
  'ПолучательРасчСчет=40817810400000055555',
  'Получатель=ООО "Поставщик"',
  'ПолучательИНН=7709999999',
  'НазначениеПлатежа=Оплата за материалы',
  'КонецДокумента',
  'КонецФайла',
].join('\r\n');

describe('parse1CStatement', () => {
  it('читает счёт из заголовка и оба документа', () => {
    const res = parse1CStatement(FIXTURE);
    expect(res.headerAccount).toBe('40702810400000012345');
    expect(res.documents).toHaveLength(2);
  });

  it('разбирает поля документа', () => {
    const [doc] = parse1CStatement(FIXTURE).documents;
    expect(doc.docNumber).toBe('101');
    expect(doc.date).toBe('2026-06-15');
    expect(doc.amount).toBe(15000.5);
    expect(doc.payerInn).toBe('7701234567');
    expect(doc.payeeInn).toBe('7707654321');
    expect(doc.payerAccountNumber).toBe('40702810400000099999');
    expect(doc.payeeAccountNumber).toBe('40702810400000012345');
    expect(doc.purpose).toBe('Оплата по счету 5 от 01.06.2026');
  });

  it('не падает на файле без документов', () => {
    expect(parse1CStatement('1CClientBankExchange\r\nКонецФайла').documents).toEqual([]);
  });
});

describe('resolveDirection', () => {
  const docIn = parse1CStatement(FIXTURE).documents[0]; // получатель = наш счёт
  const docOut = parse1CStatement(FIXTURE).documents[1]; // плательщик = наш счёт
  const acc = '40702810400000012345';

  it('приход, если наш счёт — получатель', () => {
    const r = resolveDirection(docIn, acc);
    expect(r.direction).toBe('in');
    expect(r.counterpartyInn).toBe('7701234567'); // плательщик
    expect(r.counterpartyName).toBe('ООО "Клиент"');
  });

  it('расход, если наш счёт — плательщик', () => {
    const r = resolveDirection(docOut, acc);
    expect(r.direction).toBe('out');
    expect(r.counterpartyInn).toBe('7709999999'); // получатель
  });

  it('unknown, если счёт не совпал', () => {
    expect(resolveDirection(docIn, '00000000000000000000').direction).toBe('unknown');
  });
});

describe('buildExternalId', () => {
  it('устойчив к повторному вызову', () => {
    const doc = parse1CStatement(FIXTURE).documents[0];
    expect(buildExternalId(doc)).toBe(buildExternalId(doc));
  });
  it('различает разные документы', () => {
    const [a, b] = parse1CStatement(FIXTURE).documents;
    expect(buildExternalId(a)).not.toBe(buildExternalId(b));
  });
});
