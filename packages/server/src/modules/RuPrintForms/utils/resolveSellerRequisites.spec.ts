// © 2026 Bigfin
import { resolveSellerRequisites } from './resolveSellerRequisites';

/**
 * Этап 8 ТЗ, §8.3. Чьи реквизиты идут в печатную форму.
 *
 * Ошибка здесь стоит дороже большинства: контрагент платит по тем
 * реквизитам, что видит в счёте. Неверный расчётный счёт — это деньги,
 * ушедшие не туда, при совершенно нормальном на вид документе.
 */
const organization = {
  name: 'Мой аккаунт',
  inn: '7707083893',
  kpp: '770701001',
  ogrn: '1027700132195',
  bankName: 'Сбербанк',
  bankBik: '044525225',
  bankAccount: '40702810000000000001',
  bankCorrespondentAccount: '30101810400000000225',
  signerDirectorName: 'Петров П. П.',
};

const legalEntity = {
  name: 'ООО Ромашка',
  fullName: 'Общество с ограниченной ответственностью «Ромашка»',
  inn: '7736050003',
  kpp: '773601001',
  ogrn: '1027700070518',
  legalAddress: 'Москва, ул. Ленина, 1',
  directorName: 'Иванов И. И.',
  bankDetails: {
    bankName: 'Альфа-банк',
    bik: '044525593',
    account: '40702810900000000002',
    correspondentAccount: '30101810200000000593',
  },
};

describe('resolveSellerRequisites', () => {
  it('у документа есть юрлицо — берутся ЕГО реквизиты', () => {
    const seller = resolveSellerRequisites(organization, legalEntity);

    expect(seller.inn).toBe('7736050003');
    expect(seller.bankAccount).toBe('40702810900000000002');
    expect(seller.name).toBe('ООО Ромашка');
  });

  it('реквизиты не смешиваются: всё или ничего', () => {
    // ИНН одного юрлица рядом с расчётным счётом другого — это документ,
    // по которому деньги уйдут не туда, а выглядит он нормально.
    const seller = resolveSellerRequisites(organization, legalEntity);

    expect(seller.bankName).not.toBe(organization.bankName);
    expect(seller.kpp).not.toBe(organization.kpp);
    expect(seller.directorName).not.toBe(organization.signerDirectorName);
  });

  it('без юрлица работаем как раньше — по реквизитам организации', () => {
    // Организация с одним юрлицом до заполнения и старые документы.
    const seller = resolveSellerRequisites(organization, null);

    expect(seller.inn).toBe('7707083893');
    expect(seller.bankAccount).toBe('40702810000000000001');
    expect(seller.directorName).toBe('Петров П. П.');
  });

  it('пустое полное наименование заменяется коротким', () => {
    // В шапке документа пустая строка выглядит как потерянные данные.
    const seller = resolveSellerRequisites(organization, {
      ...legalEntity,
      fullName: '',
    });

    expect(seller.fullName).toBe('ООО Ромашка');
  });

  it('незаполненные банковские реквизиты не роняют форму', () => {
    const seller = resolveSellerRequisites(organization, {
      ...legalEntity,
      bankDetails: null,
    });

    expect(seller.bankAccount).toBe('');
    expect(seller.inn).toBe('7736050003');
  });

  it('пустые данные организации дают пустые строки, а не undefined', () => {
    // undefined в шаблоне печатается как «undefined».
    const seller = resolveSellerRequisites(undefined, null);

    expect(seller.inn).toBe('');
    expect(seller.name).toBe('');
  });
});
