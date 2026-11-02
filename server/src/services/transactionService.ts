import { Transaction } from '@prisma/client';

/**
 * Calculate wallet balance from a list of transactions.
 * Income adds to balance, expenses subtract.
 */
export function calculateWalletBalance(transactions: Pick<Transaction, 'type' | 'amount'>[]): number {
  return transactions.reduce((acc, t) => {
    if (t.type === 'income') return acc + t.amount;
    if (t.type === 'expense') return acc + t.amount;
    return acc;
  }, 0);
}

/**
 * Calculate total income from transactions.
 */
export function calcTotalIncome(transactions: Pick<Transaction, 'type' | 'amount'>[]): number {
  return transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
}

/**
 * Calculate total expenses from transactions.
 */
export function calcTotalExpenses(transactions: Pick<Transaction, 'type' | 'amount'>[]): number {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
}

/**
 * Format a number as INR currency string.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}