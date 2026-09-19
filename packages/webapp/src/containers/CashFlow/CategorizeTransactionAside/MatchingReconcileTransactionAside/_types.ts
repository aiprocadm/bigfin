export interface MatchingReconcileTransactionValues {
  type: string;
  date: string;
  /**
   * Сумма БЫВАЕТ И ЧИСЛОМ, И СТРОКОЙ, и это не небрежность: начальное
   * значение приходит числом (остаток к сверке, округлённый), а то, что
   * человек набирает руками, — строка. Объявление только строкой было
   * неправдой, но слепая зона типов её прятала.
   */
  amount: string | number;
  memo: string;
  referenceNo: string;
  category: string;
  branchId: string;
}