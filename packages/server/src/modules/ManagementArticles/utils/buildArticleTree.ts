export interface ArticleNode {
  id: number;
  name: string;
  parentId: number | null;
  children: ArticleNode[];
  [key: string]: any;
}

/**
 * Converts a flat list of articles into a nested tree by `parentId`.
 * @param {Array<{ id: number; parentId: number | null }>} articles
 * @returns {ArticleNode[]} root nodes
 */
export function buildArticleTree(articles: any[]): ArticleNode[] {
  const byId = new Map<number, ArticleNode>();
  const roots: ArticleNode[] = [];

  articles.forEach((article) => {
    byId.set(article.id, { ...article, children: [] });
  });

  byId.forEach((node) => {
    if (node.parentId != null && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
