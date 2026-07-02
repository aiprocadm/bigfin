/**
 * Форма ответа `GET manual-journals/:id` (легаси react-query хук `useJournal`
 * не типизирован — описываем нужные поля локально, только для чтения).
 */
export interface ManualJournalEntry {
  id?: number;
  index?: number;
  note?: string;
  debit?: number;
  credit?: number;
  account?: { name?: string };
  contact?: { display_name?: string };
  branch?: { name?: string };
}

export interface ManualJournalDetail {
  id?: number;
  journal_number?: string;
  journal_type?: string;
  reference?: string;
  currency_code?: string;
  description?: string;
  is_published?: boolean;

  amount?: number;
  formatted_amount?: string;

  entries?: ManualJournalEntry[];
}
