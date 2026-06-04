import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DataTablePagination } from './data-table-pagination';

const meta: Meta<typeof DataTablePagination> = {
  title: 'UI/DataTablePagination',
  component: DataTablePagination,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof DataTablePagination> = {
  render: () => {
    const [pageIndex, setPageIndex] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(20);
    return (
      <DataTablePagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={7}
        total={124}
        onPageChange={setPageIndex}
        onPageSizeChange={setPageSize}
      />
    );
  },
};
