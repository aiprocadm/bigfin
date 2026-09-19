// © 2026 Bigfin
/**
 * Чьи реквизиты идут в печатную форму (этап 8 ТЗ, §8.3).
 *
 * До этого этапа формы брали реквизиты организации — общие настройки
 * аккаунта. С несколькими юрлицами это прямая ошибка: счёт на оплату от ООО
 * должен содержать реквизиты ООО, а не «настройки аккаунта». Контрагент
 * платит по тем реквизитам, что видит.
 */

/** Реквизиты, которые печатная форма ждёт от продавца. */
export interface SellerRequisites {
  name: string;
  fullName: string;
  inn: string;
  kpp: string;
  ogrn: string;
  legalAddress: string;
  directorName: string;
  bankName: string;
  bankBik: string;
  bankAccount: string;
  bankCorrespondentAccount: string;
}

const text = (value: unknown): string => {
  const trimmed = String(value ?? '').trim();
  return trimmed;
};

/**
 * Реквизиты продавца для документа.
 *
 * **Правило «всё или ничего».** Если у документа есть юрлицо, берутся ЕГО
 * реквизиты целиком. Смешивать нельзя: ИНН одного юрлица рядом с расчётным
 * счётом другого — это документ, по которому деньги уйдут не туда, а выглядит
 * он совершенно нормально.
 *
 * Когда юрлица у документа нет (organizация с одним юрлицом до заполнения,
 * старые документы) — работаем как раньше, по реквизитам организации.
 */
export function resolveSellerRequisites(
  organizationMetadata: any,
  legalEntity?: any | null,
): SellerRequisites {
  if (legalEntity) {
    const bank = legalEntity.bankDetails ?? {};

    return {
      name: text(legalEntity.name),
      fullName: text(legalEntity.fullName) || text(legalEntity.name),
      inn: text(legalEntity.inn),
      kpp: text(legalEntity.kpp),
      ogrn: text(legalEntity.ogrn),
      legalAddress: text(legalEntity.legalAddress),
      directorName: text(legalEntity.directorName),
      bankName: text(bank.bankName),
      bankBik: text(bank.bik),
      bankAccount: text(bank.account),
      bankCorrespondentAccount: text(bank.correspondentAccount),
    };
  }

  return {
    name: text(organizationMetadata?.name),
    fullName: text(organizationMetadata?.name),
    inn: text(organizationMetadata?.inn),
    kpp: text(organizationMetadata?.kpp),
    ogrn: text(organizationMetadata?.ogrn),
    legalAddress: text(organizationMetadata?.address?.address1),
    directorName: text(organizationMetadata?.signerDirectorName),
    bankName: text(organizationMetadata?.bankName),
    bankBik: text(organizationMetadata?.bankBik),
    bankAccount: text(organizationMetadata?.bankAccount),
    bankCorrespondentAccount: text(
      organizationMetadata?.bankCorrespondentAccount,
    ),
  };
}

/**
 * Настройки организации, в которых реквизиты продавца заменены на реквизиты
 * ЮРЛИЦА документа.
 *
 * ЗАЧЕМ ИМЕННО ТАК. Печатные формы читают настройки организации напрямую и в
 * десятке мест (`metadata?.name`, `metadata?.inn`, адрес, банк, юр. форма).
 * Переписывать каждое место — значит десять раз повторить одно правило и
 * однажды забыть его в одиннадцатом. Здесь правило применяется ОДИН раз, а
 * формы продолжают читать то же, что читали.
 *
 * ПРАВИЛО «ВСЁ ИЛИ НИЧЕГО» СОХРАНЯЕТСЯ. Есть юрлицо — берутся ЕГО реквизиты
 * целиком, включая пустые. ИНН одного юрлица рядом с расчётным счётом
 * другого — это документ, по которому деньги уйдут не туда.
 *
 * ЧТО НЕ ЗАМЕНЯЕТСЯ: должность подписанта и имя главного бухгалтера. Это не
 * реквизиты компании, а настройка того, КТО подписывает документы; у юрлица
 * таких полей нет вовсе, и подставлять туда пустоту значило бы оставить
 * бланк без подписей.
 */
export function sellerMetadataFor(
  organizationMetadata: any,
  legalEntity?: any | null,
): any {
  if (!legalEntity) return organizationMetadata;

  const seller = resolveSellerRequisites(organizationMetadata, legalEntity);

  return {
    ...organizationMetadata,
    name: seller.name,
    inn: seller.inn,
    kpp: seller.kpp,
    ogrn: seller.ogrn,
    address: {
      ...(organizationMetadata?.address ?? {}),
      address1: seller.legalAddress,
    },
    // Юр. форма влияет на бланк: у ИП подписи другие, чем у ООО.
    legalForm: legalEntity?.form ?? organizationMetadata?.legalForm,
    signerDirectorName: seller.directorName,
    bankName: seller.bankName,
    bankBik: seller.bankBik,
    bankAccount: seller.bankAccount,
    bankCorrespondentAccount: seller.bankCorrespondentAccount,
  };
}
