/**
 * Буквы для значка-аватара контрагента или организации (UI-042-3 ТЗ-4).
 *
 * Правовая форма и кавычки в буквы не попадают: у «ООО «Настоящее»» значок
 * «Н», а не «О«». Иначе значки всех ООО одинаковые и бесполезные.
 */
const LEGAL_FORMS = new Set([
  'ООО',
  'ОАО',
  'ЗАО',
  'ПАО',
  'АО',
  'НАО',
  'ИП',
  'ГУП',
  'МУП',
  'ФГУП',
  'АНО',
  'НКО',
  'ТОО',
  'ОДО',
  'КФХ',
  'ТСЖ',
  'СНТ',
  'LLC',
  'LTD',
  'INC',
  'GMBH',
  'JSC',
]);

const QUOTES = /[«»"'“”„‘’]/g;

export function initials(name: string): string {
  const words = name.replace(QUOTES, ' ').split(/\s+/).filter(Boolean);
  const meaningful = words.filter(
    (w) => !LEGAL_FORMS.has(w.replace(/\.$/, '').toUpperCase()),
  );
  // Название из одной формы («ООО») — лучше буква формы, чем пустой значок.
  const source = meaningful.length ? meaningful : words.slice(0, 1);
  return source
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}
