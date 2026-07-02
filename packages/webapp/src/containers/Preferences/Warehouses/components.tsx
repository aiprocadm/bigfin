import * as React from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

const WAREHOUSES_SKELETON_N = 4;

export interface WarehouseRow {
  id: number;
  name: string;
  code?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone_number?: string | null;
  primary?: boolean;
}

export interface WarehouseCardActions {
  onEdit: () => void;
  onDelete: () => void;
  onMarkPrimary: () => void;
}

/**
 * Меню действий карточки склада (shadcn DropdownMenu).
 */
export function WarehouseActionsMenu({
  warehouse,
  actions,
}: {
  warehouse: WarehouseRow;
  actions: WarehouseCardActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-text-muted sm:h-8 sm:w-8"
          aria-label={intl.get('more_actions')}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={actions.onEdit}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('warehouses.action.edit_warehouse')}
        </DropdownMenuItem>
        {!warehouse.primary && (
          <DropdownMenuItem onClick={actions.onMarkPrimary}>
            <Star className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('warehouses.action.make_as_parimary')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onClick={actions.onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('warehouses.action.delete_warehouse')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Карточка склада (shadcn Card, волосяная граница, без теней).
 */
export function WarehouseCard({
  warehouse,
  actions,
}: {
  warehouse: WarehouseRow;
  actions: WarehouseCardActions;
}) {
  const details = [
    warehouse.city,
    warehouse.country,
    warehouse.email,
    warehouse.phone_number,
  ].filter(Boolean) as string[];

  return (
    <Card className="flex min-h-[140px] flex-col gap-3 p-4 shadow-none">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-text-primary">
              {warehouse.name}
            </h3>
            {warehouse.primary && (
              <Badge variant="secondary" className="shrink-0">
                {intl.get('warehouses.badge.primary')}
              </Badge>
            )}
          </div>
          {warehouse.code && (
            <p className="mt-1 text-xs text-text-muted">{warehouse.code}</p>
          )}
        </div>
        <WarehouseActionsMenu warehouse={warehouse} actions={actions} />
      </div>

      <div className="mt-auto space-y-1">
        {details.map((detail, index) => (
          <p key={index} className="truncate text-xs text-text-secondary">
            {detail}
          </p>
        ))}
      </div>
    </Card>
  );
}

/**
 * Скелетон карточки склада.
 */
function WarehouseCardSkeleton() {
  return (
    <Card className="flex min-h-[140px] flex-col gap-3 p-4 shadow-none">
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="mt-auto space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  );
}

/**
 * Скелетоны сетки складов (на время загрузки).
 */
export function WarehousesSkeleton() {
  return (
    <>
      {Array.from({ length: WAREHOUSES_SKELETON_N }).map((_, index) => (
        <WarehouseCardSkeleton key={index} />
      ))}
    </>
  );
}

/**
 * Сетка карточек складов: 1 колонка на мобильном, 2–3 на десктопе.
 */
export function WarehousesList({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
