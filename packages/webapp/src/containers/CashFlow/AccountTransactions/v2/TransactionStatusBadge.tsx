import React from 'react';
import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'success' | 'secondary';

/** Маппинг статуса банковской транзакции в вариант Badge (паритет с легаси Tag). */
export function getStatusBadgeVariant(status: string): BadgeVariant {
  if (status === 'categorized' || status === 'matched') return 'success';
  return 'secondary';
}

interface TransactionStatusBadgeProps {
  status: string;
  label: string;
}

export function TransactionStatusBadge({ status, label }: TransactionStatusBadgeProps) {
  return <Badge variant={getStatusBadgeVariant(status)}>{label}</Badge>;
}
