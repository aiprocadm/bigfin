/**
 * Какие выделенные строки реестра получат месяц начисления (FT-013 ТЗ-3).
 *
 * Месяц бывает только у денежной операции: у счёта, оплаты счёта, проводки
 * вручную свой документ и свой срок. Такие строки не трогаем и прямо
 * говорим, сколько их пропущено, — молча изменить половину было бы хуже.
 */
export function accrualTargets(rows: any[]): { ids: number[]; skipped: number } {
  const ids: number[] = [];
  let skipped = 0;
  (rows ?? []).forEach((row) => {
    const type = row.reference_type ?? row.referenceType;
    const id = Number(row.reference_id ?? row.referenceId);
    if (type === 'CashflowTransaction' && id > 0) {
      if (!ids.includes(id)) ids.push(id);
    } else {
      skipped += 1;
    }
  });
  return { ids, skipped };
}
