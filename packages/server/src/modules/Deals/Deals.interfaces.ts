// © 2026 Bigfin
export interface DealProfitability {
  dealId: number;
  revenue: number;
  costs: number;
  profit: number;
  margin: number; // доля 0..1
  articles: Array<{
    id: number;
    name: string;
    kind: string;
    amount: number;
    parentId?: number | null;
  }>;
}
