import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { Lock, Map, Pencil, Trash2 } from 'lucide-react';
import { ManagementArticle } from './schemas';
import { buildArticleSummary } from './articleSummary';
import { isSystemArticle } from './articleKindTabs';

interface ArticleTreeProps {
  nodes: ManagementArticle[];
  level?: number;
  onEdit: (article: ManagementArticle) => void;
  onDelete: (article: ManagementArticle) => void;
  /** «Куда попадает эта статья» — переход на схему (FIN-002 ТЗ-2). */
  onShowMap?: (article: ManagementArticle) => void;
}

export function ArticleTree({
  nodes,
  level = 0,
  onEdit,
  onDelete,
  onShowMap,
}: ArticleTreeProps) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className="flex items-center justify-between rounded-control px-2 py-1 hover:bg-muted"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            <span className="flex items-center gap-2">
              <span className="font-medium">{node.name}</span>
              {isSystemArticle(node) && (
                /**
                 * Замок у системной статьи.
                 *
                 * Переименовать её можно, удалить — нет: ею уже размечены
                 * операции у всех организаций, и её исчезновение осиротило
                 * бы разметку. Замок объясняет это ДО щелчка по корзине, а
                 * не отказом после.
                 *
                 * Иконка не единственный носитель смысла: та же мысль есть
                 * словами в подсказке и доступна читалке экрана.
                 */
                <Lock
                  className="h-3 w-3 text-text-secondary"
                  aria-label={intl.get('management_articles.system_article')}
                >
                  <title>
                    {intl.get('management_articles.system_article')}
                  </title>
                </Lock>
              )}
              {(() => {
                const summary = buildArticleSummary(node as any);
                return (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {summary.parts.join(' · ')}
                    </span>
                    <span
                      className={
                        summary.needsAccounts
                          ? 'text-xs text-amber-600'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {summary.accountsLabel}
                    </span>
                  </>
                );
              })()}
            </span>
            <span className="flex items-center gap-1">
              {onShowMap && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={intl.get('management_articles.show_map')}
                  onClick={() => onShowMap(node)}
                >
                  <Map className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={intl.get('management_articles.edit')}
                onClick={() => onEdit(node)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {!isSystemArticle(node) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={intl.get('management_articles.delete')}
                  onClick={() => onDelete(node)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </span>
          </div>
          {node.children && node.children.length > 0 && (
            <ArticleTree
              nodes={node.children}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onShowMap={onShowMap}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
