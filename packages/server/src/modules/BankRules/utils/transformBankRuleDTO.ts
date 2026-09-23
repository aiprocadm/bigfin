// © 2026 Bigfin
import { CommandBankRuleDto } from '../dtos/BankRule.dto';

/**
 * Запрос → правило со всеми связанными строками (FT-030…FT-032 ТЗ-3).
 *
 * Одно преобразование на создание и правку. Поля ЧУЖОГО типа обнуляются:
 * правило переделали из «разбить» в «заполнить поля» — строки разбиения
 * обязаны исчезнуть, иначе они тихо лежали бы в базе и ждали случая
 * всплыть в отчёте или предпросмотре.
 */
export function transformBankRuleDTO(dto: CommandBankRuleDto) {
  const { splits, ...rest } = dto as CommandBankRuleDto & { splits?: any[] };
  const ruleType = rest.ruleType ?? 'assign';

  return {
    ...rest,
    ruleType,
    // Пусто — «оба»: и поступления, и списания.
    applyIfTransactionType: rest.applyIfTransactionType || null,
    applyIfAccountId: rest.applyIfAccountId || null,
    assignAccountId: ['assign', 'deal'].includes(ruleType) ? rest.assignAccountId ?? null : null,
    // Сделка и этап — только у правила «сделка» (FT-033).
    assignDealId: ruleType === 'deal' ? (rest as any).assignDealId ?? null : null,
    assignDealStageId: ruleType === 'deal' ? (rest as any).assignDealStageId ?? null : null,
    transferToAccountId: ruleType === 'transfer' ? rest.transferToAccountId ?? null : null,
    // Метка (FT-025) — у правила любого вида; пустая строка = без метки.
    assignTag: String((rest as any).assignTag ?? '').trim().slice(0, 64) || null,
    // Перевод затирает направление и контрагента (FT-032) — ставить их
    // правилу перевода бессмысленно.
    assignProjectId: ruleType === 'assign' ? rest.assignProjectId ?? null : null,
    assignContactId: ruleType === 'transfer' ? null : rest.assignContactId ?? null,
    splits:
      ruleType === 'split'
        ? (splits ?? []).map((line, index) => ({
            sharePercent: Number(line.sharePercent),
            articleId: line.articleId,
            projectId: line.projectId ?? null,
            contactId: line.contactId ?? null,
            sortOrder: index,
          }))
        : [],
  };
}
