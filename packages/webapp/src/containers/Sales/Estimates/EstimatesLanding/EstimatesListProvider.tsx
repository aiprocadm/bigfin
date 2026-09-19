import React, { createContext } from 'react';
import { isEmpty } from 'lodash';

import { DashboardInsider } from '@/components/Dashboard';

import { useResourceViews, useResourceMeta, useEstimates } from '@/hooks/query';
import { getFieldsFromResourceMeta } from '@/utils';

// Estimates list context.
const EstimatesListContext = createContext<any>(undefined);

/**
 * Sale estimates data provider.
 */
function EstimatesListProvider({ query, tableStateChanged, ...props }: any) {
  // Fetches estimates resource views and fields.
  const { data: estimatesViews, isLoading: isViewsLoading } =
    useResourceViews('sale_estimates');

  // Fetches the estimates resource fields.
  const {
    data: resourceMeta,
    isLoading: isResourceLoading,
    isFetching: isResourceFetching,
  } = useResourceMeta('sale_estimates');

  // Fetches estimates list according to the given custom view id.
  const {
    data: { estimates, pagination, filterMeta },
    isLoading: isEstimatesLoading,
    isFetching: isEstimatesFetching,
    isError: isEstimatesError,
    refetch: refetchEstimates,
  } = useEstimates(query, { keepPreviousData: true });

  // Detarmines the datatable empty status.
  const isEmptyStatus =
    !isEstimatesLoading && !tableStateChanged && isEmpty(estimates);

  // Provider payload.
  const provider = {
    estimates,
    pagination,

    fields: getFieldsFromResourceMeta(resourceMeta.fields),
    estimatesViews,

    isResourceLoading,
    isResourceFetching,

    isEstimatesLoading,
    isEstimatesFetching,
    isViewsLoading,

    isEmptyStatus,
  };

  return (
    <DashboardInsider
      loading={isViewsLoading || isResourceLoading}
      error={isEstimatesError}
      onRetry={refetchEstimates}
      name={'sale_estimate'}
    >
      <EstimatesListContext.Provider value={provider} {...props} />
    </DashboardInsider>
  );
}

const useEstimatesListContext = () => React.useContext(EstimatesListContext);

export { EstimatesListProvider, useEstimatesListContext };
