import React, { useCallback, useContext } from 'react';
import { If, Pagination } from '@/components';
import TableContext from './TableContext';
import { saveInvoke } from '@/utils';

/**
 * Table pagination.
 */
export default function TablePagination() {
  const {
    table: {
      gotoPage,
      setPageSize,
      pageCount,
      state: { pageIndex, pageSize },
    },
    props: { pagination, loading, onPaginationChange, hidePaginationNoPages },
  } = useContext(TableContext);

  const triggerOnPaginationChange = useCallback(
    (payload: any) => {
      saveInvoke(onPaginationChange, payload);
    },
    [onPaginationChange],
  );

  // Handles the page changing.
  const handlePageChange = useCallback(
    ({ page, pageSize }: any) => {
      const pageIndex = page - 1;

      gotoPage(pageIndex);
      triggerOnPaginationChange({ pageIndex, pageSize });
    },
    [gotoPage, triggerOnPaginationChange],
  );

  // Handles the page size changing.
  const handlePageSizeChange = useCallback(
    ({ pageSize, page }: any) => {
      const pageIndex = 0;

      gotoPage(pageIndex);
      setPageSize(pageSize);

      triggerOnPaginationChange({ pageIndex, pageSize });
    },
    [gotoPage, setPageSize, triggerOnPaginationChange],
  );

  // Detarmines when display the pagination.
  const showPagination =
    pagination &&
    ((hidePaginationNoPages && pageCount > 1) || !hidePaginationNoPages) &&
    !loading;

  return (
    showPagination && (
      <Pagination
        currentPage={pageIndex + 1}
        total={pageSize * pageCount}
        size={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    )
  );
}
