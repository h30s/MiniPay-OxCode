import { describe, it, expect } from 'vitest';
import { calculateWalletBalance, calcTotalIncome, calcTotalExpenses, formatINR } from '../src/services/transactionService';

describe('calculateWalletBalance', () => {
  it('should return 0 for empty transactions', () => {
    expect(calculateWalletBalance([])).toBe(0);
  });

  it('should sum income transactions correctly', () => {
    const transactions = [
      { type: 'income' as const, amount: 1000 },
      { type: 'income' as const, amount: 500 },
    ];
    expect(calculateWalletBalance(transactions)).toBe(1500);
  });

  it('should subtract expenses from income', () => {
    const transactions = [
      { type: 'income' as const, amount: 5000 },
      { type: 'expense' as const, amount: 1200 },
      { type: 'expense' as const, amount: 800 },
    ];
    expect(calculateWalletBalance(transactions)).toBe(3000);
  });

  it('should handle only expenses (negative balance)', () => {
    const transactions = [
      { type: 'expense' as const, amount: 500 },
      { type: 'expense' as const, amount: 300 },
    ];
    expect(calculateWalletBalance(transactions)).toBe(-800);
  });

  it('should ignore unknown transaction types', () => {
    const transactions = [
      { type: 'income' as const, amount: 1000 },
      { type: 'unknown' as any, amount: 500 },
    ];
    expect(calculateWalletBalance(transactions)).toBe(1000);
  });
});

describe('calcTotalIncome', () => {
  it('should return 0 for no income', () => {
    const transactions = [
      { type: 'expense' as const, amount: 100 },
    ];
    expect(calcTotalIncome(transactions)).toBe(0);
  });

  it('should sum all income', () => {
    const transactions = [
      { type: 'income' as const, amount: 85000 },
      { type: 'expense' as const, amount: 15000 },
      { type: 'income' as const, amount: 5000 },
    ];
    expect(calcTotalIncome(transactions)).toBe(90000);
  });
});

describe('calcTotalExpenses', () => {
  it('should return 0 for no expenses', () => {
    const transactions = [
      { type: 'income' as const, amount: 1000 },
    ];
    expect(calcTotalExpenses(transactions)).toBe(0);
  });

  it('should sum all expenses', () => {
    const transactions = [
      { type: 'income' as const, amount: 85000 },
      { type: 'expense' as const, amount: 15000 },
      { type: 'expense' as const, amount: 3500 },
    ];
    expect(calcTotalExpenses(transactions)).toBe(18500);
  });
});

describe('formatINR', () => {
  it('should format zero', () => {
    expect(formatINR(0)).toContain('0');
  });

  it('should format positive amount in INR', () => {
    const result = formatINR(85000);
    expect(result).toContain('85');
    expect(result).toContain('₹');
  });

  it('should format with two decimal places', () => {
    const result = formatINR(1234.5);
    expect(result).toContain('.50');
  });
});