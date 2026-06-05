import { filterRows } from './filter-rows';

const rows = [
  { display_name: 'ООО «Ромашка»', company_name: 'Ромашка', work_phone: '+7 495 123-45-67' },
  { display_name: 'ИП Сидоров', company_name: '', work_phone: '+7 916 555-22-11' },
  { display_name: 'ТехноСтрой', company_name: 'ТехноСтрой', work_phone: null },
];
const fields = ['display_name', 'company_name', 'work_phone'];

describe('filterRows', () => {
  it('returns all rows for empty / whitespace query', () => {
    expect(filterRows(rows, '', fields)).toHaveLength(3);
    expect(filterRows(rows, '   ', fields)).toHaveLength(3);
  });

  it('matches a substring case-insensitively', () => {
    expect(filterRows(rows, 'ромашка', fields)).toHaveLength(1);
    expect(filterRows(rows, 'РОМАШ', fields)).toHaveLength(1);
  });

  it('matches across any of the listed fields', () => {
    expect(filterRows(rows, '555-22-11', fields)).toHaveLength(1);
    expect(filterRows(rows, 'Сидоров', fields)).toHaveLength(1);
  });

  it('ignores null/empty field values without throwing', () => {
    expect(filterRows(rows, 'ТехноСтрой', fields)).toHaveLength(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterRows(rows, 'нет-такого', fields)).toEqual([]);
  });
});
