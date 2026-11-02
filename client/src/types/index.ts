export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletSummary {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface MonthlySummary {
  month: string;
  categories: { category: string; total: number }[];
  monthlyTotal: number;
}

export interface CreateTransactionPayload {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  date?: string;
}