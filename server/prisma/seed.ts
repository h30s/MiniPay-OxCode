import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  // Clear existing data
  await prisma.transaction.deleteMany();

  const transactions = [
    {
      type: 'income',
      amount: 85000,
      category: 'Salary',
      note: 'October salary',
      date: new Date('2026-10-01'),
    },
    {
      type: 'income',
      amount: 5000,
      category: 'Freelance',
      note: 'Logo design project',
      date: new Date('2026-10-05'),
    },
    {
      type: 'income',
      amount: 12000,
      category: 'Investment',
      note: 'Dividend payout',
      date: new Date('2026-10-12'),
    },
    {
      type: 'expense',
      amount: 15000,
      category: 'Rent',
      note: 'Monthly rent',
      date: new Date('2026-10-02'),
    },
    {
      type: 'expense',
      amount: 3500,
      category: 'Groceries',
      note: 'Weekly groceries',
      date: new Date('2026-10-03'),
    },
    {
      type: 'expense',
      amount: 2000,
      category: 'Transport',
      note: 'Metro card recharge',
      date: new Date('2026-10-06'),
    },
    {
      type: 'expense',
      amount: 1200,
      category: 'Dining',
      note: 'Lunch at Haldiram',
      date: new Date('2026-10-08'),
    },
    {
      type: 'expense',
      amount: 800,
      category: 'Entertainment',
      note: 'Movie ticket',
      date: new Date('2026-10-10'),
    },
    {
      type: 'expense',
      amount: 4500,
      category: 'Utilities',
      note: 'Electricity bill',
      date: new Date('2026-10-11'),
    },
    {
      type: 'expense',
      amount: 2500,
      category: 'Shopping',
      note: 'New shirt',
      date: new Date('2026-10-14'),
    },
    {
      type: 'income',
      amount: 85000,
      category: 'Salary',
      note: 'November salary',
      date: new Date('2026-11-01'),
    },
    {
      type: 'expense',
      amount: 15000,
      category: 'Rent',
      note: 'Monthly rent',
      date: new Date('2026-11-02'),
    },
    {
      type: 'expense',
      amount: 4200,
      category: 'Groceries',
      note: 'Weekly groceries',
      date: new Date('2026-11-03'),
    },
    {
      type: 'expense',
      amount: 3000,
      category: 'Healthcare',
      note: 'Doctor consultation',
      date: new Date('2026-11-04'),
    },
    {
      type: 'expense',
      amount: 1800,
      category: 'Dining',
      note: 'Late night dinner',
      date: new Date('2026-10-31T20:00:00.000Z'),
    },
  ];

  for (const t of transactions) {
    await prisma.transaction.create({ data: t });
  }

  console.log('Seed data inserted successfully');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });