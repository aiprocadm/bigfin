import { findNodeTotal } from './findNodeTotal';

const tree = [
  {
    id: 'ASSETS',
    total: { amount: 1000 },
    children: [
      { id: 'CURRENT_ASSETS', total: { amount: 500 },
        children: [{ id: 'INVENTORY', total: { amount: 100 } }] },
      { id: 'FIXED_ASSET', total: { amount: 500 } },
    ],
  },
  { id: 'LIABILITY_EQUITY', total: { amount: 1000 },
    children: [
      { id: 'LIABILITY', total: { amount: 400 },
        children: [{ id: 'CURRENT_LIABILITY', total: { amount: 250 } }] },
      { id: 'EQUITY', total: { amount: 600 } },
    ] },
];

describe('findNodeTotal', () => {
  it('находит корневой узел', () => {
    expect(findNodeTotal(tree, 'ASSETS')).toBe(1000);
  });

  it('находит вложенный узел (глубокий поиск)', () => {
    expect(findNodeTotal(tree, 'CURRENT_ASSETS')).toBe(500);
    expect(findNodeTotal(tree, 'INVENTORY')).toBe(100);
    expect(findNodeTotal(tree, 'CURRENT_LIABILITY')).toBe(250);
    expect(findNodeTotal(tree, 'EQUITY')).toBe(600);
  });

  it('не найден → 0', () => {
    expect(findNodeTotal(tree, 'NON_EXISTENT')).toBe(0);
  });

  it('узел без total → 0, не падает', () => {
    expect(findNodeTotal([{ id: 'X' }], 'X')).toBe(0);
    expect(findNodeTotal(undefined, 'X')).toBe(0);
  });
});
