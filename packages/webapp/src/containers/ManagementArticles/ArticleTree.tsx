import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface ArticleTreeProps {
  nodes: any[];
  level?: number;
  onEdit: (article: any) => void;
  onDelete: (article: any) => void;
}

export function ArticleTree({ nodes, level = 0, onEdit, onDelete }: ArticleTreeProps) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            <span className="flex items-center gap-2">
              <span className="font-medium">{node.name}</span>
              <span className="text-xs text-muted-foreground">
                {intl.get(`management_articles.kind.${node.kind}`)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={intl.get('management_articles.edit')}
                onClick={() => onEdit(node)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={intl.get('management_articles.delete')}
                onClick={() => onDelete(node)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </div>
          {node.children && node.children.length > 0 && (
            <ArticleTree
              nodes={node.children}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
