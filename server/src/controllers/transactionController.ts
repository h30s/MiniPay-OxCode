import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import getPrisma from '../db';
import { calculateWalletBalance, calcTotalIncome, calcTotalExpenses } from '../services/transactionService';

let prisma = getPrisma();

// Allow overriding prisma for tests
export function setControllerPrisma(client: PrismaClient) {
  prisma = client;
}

/**
 * Get wallet summary: balance, total income, total expenses.
 */
export async function getWalletSummary(_req: Request, res: Response): Promise<void> {
  try {
    const transactions = await prisma.transaction.findMany();
    const balance = calculateWalletBalance(transactions);
    const totalIncome = calcTotalIncome(transactions);
    const totalExpenses = calcTotalExpenses(transactions);

    res.json({
      balance,
      totalIncome,
      totalExpenses,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet summary' });
  }
}

/**
 * Get all transactions with optional filters.
 * Query params: type (income|expense), startDate, endDate
 */
export async function getTransactions(req: Request, res: Response): Promise<void> {
  try {
    const { type, startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};

    if (type === 'income' || type === 'expense') {
      where.type = type as string;
    } else if (type) {
      where.type = type as string;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate as string);
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lt = new Date(endDate as string);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

/**
 * Get a single transaction by ID.
 */
export async function getTransaction(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid transaction ID' });
      return;
    }

    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
}

/**
 * Create a new transaction.
 */
export async function createTransaction(req: Request, res: Response): Promise<void> {
  try {
    const { type, amount, category, note, date } = req.body;

    // Validate type
    if (type !== 'income' && type !== 'expense') {
      res.status(400).json({ error: 'Type must be "income" or "expense"' });
      return;
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    // Validate category
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      res.status(400).json({ error: 'Category is required' });
      return;
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parsedAmount,
        category: category.trim(),
        note: note?.trim() || null,
        date: date ? new Date(date) : new Date(),
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
}

/**
 * Delete a transaction by ID.
 */
export async function deleteTransaction(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid transaction ID' });
      return;
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    await prisma.transaction.delete({ where: { id } });

    // Return updated wallet summary after deletion
    const transactions = await prisma.transaction.findMany();
    const balance = calculateWalletBalance(transactions);
    const totalIncome = calcTotalIncome(transactions);
    const totalExpenses = calcTotalExpenses(transactions);

    res.json({
      message: 'Transaction deleted',
      deleted: existing,
      wallet: {
        balance,
        totalIncome,
        totalExpenses,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
}

/**
 * Get monthly expense summary grouped by month and category.
 */
export async function getMonthlySummary(_req: Request, res: Response): Promise<void> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { type: 'expense' },
      orderBy: { date: 'asc' },
    });

    // Group by month and category
    const summary: Record<string, Record<string, number>> = {};

    for (const t of transactions) {
      const monthKey = `${t.date.getUTCFullYear()}-${String(t.date.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!summary[monthKey]) {
        summary[monthKey] = {};
      }
      if (!summary[monthKey][t.category]) {
        summary[monthKey][t.category] = 0;
      }
      summary[monthKey][t.category] += t.amount;
    }

    // Convert to array format
    const result = Object.entries(summary).map(([month, categories]) => ({
      month,
      categories: Object.entries(categories).map(([category, total]) => ({
        category,
        total,
      })),
      monthlyTotal: Object.values(categories).reduce((sum, val) => sum + val, 0),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
}