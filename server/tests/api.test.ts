import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { createApp } from '../src/app';

// Create a test-specific prisma client pointing to test.db
const testDbPath = path.resolve(__dirname, '..', 'prisma', 'test.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${testDbPath}`,
    },
  },
});

const app = createApp(prisma);

beforeAll(async () => {
  await prisma.transaction.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/wallet', () => {
  it('should return zero balance when no transactions', async () => {
    const res = await request(app).get('/api/wallet');
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(0);
    expect(res.body.totalIncome).toBe(0);
    expect(res.body.totalExpenses).toBe(0);
  });
});

describe('POST /api/transactions', () => {
  it('should create an income transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        type: 'income',
        amount: 50000,
        category: 'Salary',
        note: 'Test salary',
        date: '2026-10-01',
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('income');
    expect(res.body.amount).toBe(50000);
    expect(res.body.category).toBe('Salary');
  });

  it('should create an expense transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        type: 'expense',
        amount: 5000,
        category: 'Rent',
        note: 'Test rent',
        date: '2026-10-02',
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('expense');
    expect(res.body.amount).toBe(5000);
  });

  it('should reject invalid type', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        type: 'invalid',
        amount: 100,
        category: 'Test',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('income" or "expense');
  });

  it('should reject negative amount', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        type: 'income',
        amount: -100,
        category: 'Test',
      });
    expect(res.status).toBe(400);
  });

  it('should reject zero amount', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        type: 'income',
        amount: 0,
        category: 'Test',
      });
    expect(res.status).toBe(400);
  });

  it('should reject missing category', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        type: 'income',
        amount: 100,
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/transactions', () => {
  let createdId: number;

  beforeAll(async () => {
    const t = await prisma.transaction.create({
      data: {
        type: 'income',
        amount: 75000,
        category: 'Freelance',
        note: 'API test',
        date: new Date('2026-11-01'),
      },
    });
    createdId = t.id;
  });

  it('should return all transactions', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should filter by type=income', async () => {
    const res = await request(app).get('/api/transactions?type=income');
    expect(res.status).toBe(200);
    res.body.forEach((t: any) => {
      expect(t.type).toBe('income');
    });
  });

  it('should filter by type=expense', async () => {
    const res = await request(app).get('/api/transactions?type=expense');
    expect(res.status).toBe(200);
    res.body.forEach((t: any) => {
      expect(t.type).toBe('expense');
    });
  });

  it('should filter by date range', async () => {
    const res = await request(app)
      .get('/api/transactions?startDate=2026-10-01&endDate=2026-10-31');
    expect(res.status).toBe(200);
  });

  it('should return a single transaction', async () => {
    const res = await request(app).get(`/api/transactions/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);
  });

  it('should return 404 for non-existent transaction', async () => {
    const res = await request(app).get('/api/transactions/99999');
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('should delete a transaction and return updated wallet', async () => {
    // Create a transaction to delete
    const t = await prisma.transaction.create({
      data: {
        type: 'expense',
        amount: 999,
        category: 'ToDelete',
        date: new Date(),
      },
    });

    const res = await request(app).delete(`/api/transactions/${t.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Transaction deleted');
    expect(res.body.deleted.id).toBe(t.id);
    expect(res.body.wallet).toBeDefined();
    expect(typeof res.body.wallet.balance).toBe('number');
  });

  it('should return 404 for deleting non-existent transaction', async () => {
    const res = await request(app).delete('/api/transactions/99999');
    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid ID', async () => {
    const res = await request(app).delete('/api/transactions/abc');
    expect(res.status).toBe(400);
  });
});

describe('Wallet balance after CRUD', () => {
  it('should reflect correct balance after adding income and expense', async () => {
    // Clear all
    await prisma.transaction.deleteMany();

    // Add income
    await request(app).post('/api/transactions').send({
      type: 'income', amount: 100000, category: 'Salary', date: '2026-10-01',
    });

    // Add expense
    await request(app).post('/api/transactions').send({
      type: 'expense', amount: 30000, category: 'Rent', date: '2026-10-02',
    });

    const wallet = await request(app).get('/api/wallet');
    expect(wallet.body.balance).toBe(70000);
    expect(wallet.body.totalIncome).toBe(100000);
    expect(wallet.body.totalExpenses).toBe(30000);
  });
});

describe('GET /api/summary/monthly', () => {
  it('should return monthly expense summary', async () => {
    const res = await request(app).get('/api/summary/monthly');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});