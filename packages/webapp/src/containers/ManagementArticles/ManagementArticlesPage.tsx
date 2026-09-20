import React from 'react';
import intl from 'react-intl-universal';
import { useHistory, useLocation } from 'react-router-dom';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArticleTree } from './ArticleTree';
import { ArticleReportMap } from './ArticleReportMap';
import { ArticleForm } from './ArticleForm';
import { ArticleKind, ManagementArticle } from './schemas';
import {
  ARTICLE_KIND_TABS,
  countArticlesByKind,
  kindFromSearch,
  rootsOfKind,
  searchWithKind,
} from './articleKindTabs';
import {
  useManagementArticles,
  useDeleteManagementArticle,
} from '@/hooks/query/managementArticles';
import { ModuleDisabled } from '@/components/ui/module-disabled';

export default function ManagementArticlesPage() {
  const { featureCan } = useFeatureCan();
  const history = useHistory();
  const location = useLocation();

  /**
   * Дерево запрашивается ЦЕЛИКОМ, один раз, без `kind` в запросе.
   *
   * Так счётчики на всех пяти вкладках честные сразу, а переключение вкладки
   * не ходит на сервер: справочник статей маленький, а щелчок по вкладке
   * должен быть мгновенным. Отбор по виду на сервере остаётся — им
   * пользуются другие экраны и ссылки, присланные снаружи.
   */
  const { data: tree } = useManagementArticles({ tree: 'true' }, {});
  const deleteMutation = useDeleteManagementArticle({});
  const [editing, setEditing] = React.useState<ManagementArticle | undefined>(
    undefined,
  );
  const [showForm, setShowForm] = React.useState(false);
  /**
   * Что показывать: дерево статей или схему «куда попадает».
   *
   * Отдельной вкладкой, а не рядом: на телефоне три карточки схемы рядом с
   * деревом не помещаются, и страница поехала бы вбок.
   */
  const [view, setView] = React.useState<'tree' | 'map'>('tree');
  /** Статья, для которой показывается схема. */
  const [mapArticleId, setMapArticleId] = React.useState<number | undefined>(
    undefined,
  );

  const kind = kindFromSearch(location.search);
  const roots = (tree ?? []) as ManagementArticle[];
  const counts = React.useMemo(() => countArticlesByKind(roots), [roots]);
  const visible = React.useMemo(() => rootsOfKind(roots, kind), [roots, kind]);

  if (!featureCan('mgmt_articles')) return <ModuleDisabled />;

  // Вкладка живёт в адресе, а не в состоянии компонента: ссылку «посмотри
  // наши обязательства» можно переслать, и она откроет нужную вкладку.
  const selectKind = (next: string) => {
    history.replace({
      pathname: location.pathname,
      search: searchWithKind(location.search, next as ArticleKind),
    });
  };

  const openCreate = () => {
    setEditing(undefined);
    setShowForm(true);
  };
  const openEdit = (article: ManagementArticle) => {
    setEditing(article);
    setShowForm(true);
  };
  // Щелчок по статье в дереве переводит на схему: человек спрашивает
  // «куда это попадёт» именно про ту статью, по которой щёлкнул.
  const openMap = (article: ManagementArticle) => {
    setMapArticleId(article.id);
    setView('map');
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

      <Tabs
        value={view}
        onValueChange={(next) => setView(next as 'tree' | 'map')}
      >
        <TabsList>
          <TabsTrigger value="tree">
            {intl.get('management_articles.view.tree')}
          </TabsTrigger>
          <TabsTrigger value="map">
            {intl.get('management_articles.view.map')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'map' ? (
        <ArticleReportMap articleId={mapArticleId} />
      ) : (
        <>
      <Tabs value={kind} onValueChange={selectKind}>
        <TabsList>
          {ARTICLE_KIND_TABS.map((tabKind) => (
            <TabsTrigger key={tabKind} value={tabKind}>
              {intl.get(`management_articles.kind_tab.${tabKind}`)}
              {/* Счётчик рядом с названием: видно, где пусто, не щёлкая. */}
              <span className="ml-2 text-xs text-text-secondary tabular-nums">
                {counts[tabKind]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {showForm && (
        <ArticleForm
          key={editing?.id ?? 'new'}
          article={editing}
          defaultKind={kind}
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {visible.length === 0 ? (
        /**
         * Пустая вкладка ОБЪЯСНЯЕТ СЕБЯ.
         *
         * Просто пустота читается как «здесь ничего не работает». Особенно у
         * трёх новых видов: человек их раньше не видел и не знает, что сюда
         * класть. Поэтому рядом — строка про то, что тут бывает, и кнопка.
         */
        <div className="flex flex-col items-start gap-2 rounded-default border border-border p-6">
          <p className="font-medium">
            {intl.get('management_articles.empty_kind.title')}
          </p>
          <p className="max-w-[60ch] text-sm text-text-secondary">
            {intl.get(`management_articles.empty_kind.hint.${kind}`)}
          </p>
          <Button variant="secondary" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {intl.get('management_articles.add')}
          </Button>
        </div>
      ) : (
        <ArticleTree
          nodes={visible}
          onEdit={openEdit}
          onDelete={onDelete}
          onShowMap={openMap}
        />
      )}
        </>
      )}
    </div>
  );
}
