import React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import { ArticleTree } from './ArticleTree';
import { ArticleForm } from './ArticleForm';
import { ManagementArticle } from './schemas';
import {
  useManagementArticles,
  useDeleteManagementArticle,
} from '@/hooks/query/managementArticles';

export default function ManagementArticlesPage() {
  const { featureCan } = useFeatureCan();
  const { data: tree } = useManagementArticles({ tree: 'true' }, {});
  const deleteMutation = useDeleteManagementArticle({});
  const [editing, setEditing] = React.useState<ManagementArticle | undefined>(
    undefined,
  );
  const [showForm, setShowForm] = React.useState(false);

  if (!featureCan('mgmt_articles')) return null;

  const openCreate = () => {
    setEditing(undefined);
    setShowForm(true);
  };
  const openEdit = (article: ManagementArticle) => {
    setEditing(article);
    setShowForm(true);
  };
  const onDelete = (article: ManagementArticle) => {
    if (window.confirm(intl.get('management_articles.delete_confirm'))) {
      deleteMutation.mutate(article.id, {
        onError: (err: any) => {
          const type = err?.response?.data?.errors?.[0]?.type;
          const key =
            type === 'ARTICLE_IN_USE'
              ? 'management_articles.error_in_use'
              : type === 'ARTICLE_HAS_CHILDREN'
                ? 'management_articles.error_has_children'
                : 'something_wentwrong';
          AppToaster.show({ message: intl.get(key), intent: Intent.DANGER });
        },
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('management_articles.page_title')}
        </h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {intl.get('management_articles.add')}
        </Button>
      </div>
      {showForm && (
        <ArticleForm
          key={editing?.id ?? 'new'}
          article={editing}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
      <ArticleTree nodes={tree} onEdit={openEdit} onDelete={onDelete} />
    </div>
  );
}
