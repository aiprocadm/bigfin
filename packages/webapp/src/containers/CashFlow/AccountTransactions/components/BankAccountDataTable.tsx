import clsx from 'classnames';
import { DataTable } from '@/components';
import styles from './BankAccountDataTable.module.scss';

interface BankAccountDataTableProps {
  className?: string;
  /** Остальное уходит в `DataTable` как есть — обёртка ничего не отбирает. */
  [key: string]: any;
}

export function BankAccountDataTable({
  className,
  ...props
}: BankAccountDataTableProps) {
  return (
    <DataTable
      {...props}
      className={clsx('table-constrant', styles.root, className)}
    />
  );
}
