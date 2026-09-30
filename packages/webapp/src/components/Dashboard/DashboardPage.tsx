// @ts-nocheck
import React, { useEffect, Suspense } from 'react';
import { CLASSES } from '@/constants/classes';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { compose } from '@/utils';
import { PageSkeleton } from '@/components/ui/page-skeleton';

import { withUniversalSearchActions } from '@/containers/UniversalSearch/withUniversalSearchActions';

/**
 * Dashboard pages wrapper.
 */
function DashboardPage({
  // #ownProps
  pageTitle,
  backLink,
  sidebarExpand = true,
  Component,
  name,
  hint,
  defaultSearchResource,

  // #withDashboardActions
  changePageTitle,
  setDashboardBackLink,
  changePageHint,
  toggleSidebarExpand,

  // #withUniversalSearch
  setResourceTypeUniversalSearch,
  resetResourceTypeUniversalSearch,
}) {
  // Hydrate the given page title.
  useEffect(() => {
    pageTitle && changePageTitle(pageTitle);

    return () => {
      pageTitle && changePageTitle('');
    };
  });

  // Hydrate the given page hint.
  useEffect(() => {
    hint && changePageHint(hint);

    return () => {
      hint && changePageHint('');
    };
  }, [hint, changePageHint]);

  // Hydrate the dashboard back link status.
  useEffect(() => {
    backLink && setDashboardBackLink(backLink);

    return () => {
      backLink && setDashboardBackLink(false);
    };
  }, [backLink, setDashboardBackLink]);

  useEffect(() => {
    const className = `page-${name}`;
    name && document.body.classList.add(className);

    return () => {
      name && document.body.classList.remove(className);
    };
  }, [name]);

  useEffect(() => {
    toggleSidebarExpand(sidebarExpand);
  }, [toggleSidebarExpand, sidebarExpand]);

  useEffect(() => {
    if (defaultSearchResource) {
      setResourceTypeUniversalSearch(defaultSearchResource);
    }
    return () => {
      resetResourceTypeUniversalSearch();
    };
  }, [
    defaultSearchResource,
    resetResourceTypeUniversalSearch,
    setResourceTypeUniversalSearch,
  ]);

  return (
    <div className={CLASSES.DASHBOARD_PAGE}>
      <Suspense
        // Скелет вместо значка загрузки (UI-055-3 ТЗ-4).
        fallback={<PageSkeleton />}
      >
        <Component />
      </Suspense>
    </div>
  );
}

export default compose(
  withDashboardActions,
  // withUniversalSearch,
  withUniversalSearchActions,
)(DashboardPage);
