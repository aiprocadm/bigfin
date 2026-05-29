import { buildArticleTree } from './buildArticleTree';

describe('buildArticleTree', () => {
  it('nests children under their parent by parentId', () => {
    const flat = [
      { id: 1, name: 'Доходы', parentId: null },
      { id: 2, name: 'Выручка', parentId: 1 },
      { id: 3, name: 'Расходы', parentId: null },
    ];

    const tree = buildArticleTree(flat);

    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe(2);
    expect(tree[1].id).toBe(3);
    expect(tree[1].children).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(buildArticleTree([])).toEqual([]);
  });
});
