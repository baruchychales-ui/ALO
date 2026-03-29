export interface FinancialEntry {
  id: string;
  sequenceNumber: number;
  type: 'venda' | 'compra' | 'custo_fixo' | 'imposto' | 'investimento' | 'outros';
  description: string;
  date: string;
  amount: number;
  amountInBRL?: number;
  currency: string;
  isIncome: boolean;
}

export interface DashboardStats {
  projectedBalance: number;
  growthPercentage: number;
}
