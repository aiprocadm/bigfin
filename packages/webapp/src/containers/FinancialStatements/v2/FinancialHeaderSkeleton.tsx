import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

interface FinancialHeaderSkeletonProps {
  /** Количество строк «подпись + поле»; по умолчанию 3 (как в легаси). */
  lines?: number;
}

/**
 * Скелет загрузки содержимого панели настроек отчёта
 * (замена легаси FinancialHeaderLoadingSkeleton на Blueprint Classes.SKELETON).
 */
export function FinancialHeaderSkeleton({
  lines = 3,
}: FinancialHeaderSkeletonProps) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-full max-w-xs" />
        </div>
      ))}
    </div>
  );
}
