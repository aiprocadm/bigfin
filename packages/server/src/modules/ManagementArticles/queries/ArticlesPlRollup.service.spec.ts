import { foldAccountsIntoArticles } from './ArticlesPlRollup.service';

describe('foldAccountsIntoArticles', () => {
  const articles = [
    { id: 1, name: 'Выручка', kind: 'income' },
    { id: 2, name: 'Аренда', kind: 'expense' },
  ];
  // accountId -> articleId
  const map = [
    { accountId: 100, articleId: 1 },
    { accountId: 101, articleId: 1 },
    { accountId: 200, articleId: 2 },
  ];
  // net per account (credit - debit)
  const accountNets = [
    { accountId: 100, net: 300 },
    { accountId: 101, net: 200 },
    { accountId: 200, net: -150 },
    { accountId: 999, net: 50 }, // unmapped — must be ignored
  ];

  it('sums account nets into their article', () => {
    const result = foldAccountsIntoArticles(articles, map, accountNets);

    const revenue = result.find((a) => a.id === 1);
    const rent = result.find((a) => a.id === 2);

    expect(revenue.amount).toBe(500); // 300 + 200
    expect(rent.amount).toBe(-150);
  });

  it('article total equals sum of its mapped account nets (invariant)', () => {
    const result = foldAccountsIntoArticles(articles, map, accountNets);

    const mappedAccountIds = new Set(map.map((m) => m.accountId));
    const mappedTotal = accountNets
      .filter((a) => mappedAccountIds.has(a.accountId))
      .reduce((sum, a) => sum + a.net, 0);
    const articlesTotal = result.reduce((sum, a) => sum + a.amount, 0);

    expect(articlesTotal).toBe(mappedTotal); // 350
  });
});
