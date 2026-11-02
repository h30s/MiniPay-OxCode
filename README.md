# MiniPay — Personal Wallet & Expense Tracker

A full-stack personal finance application built with React, TypeScript, Express, SQLite, and Prisma.

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Node.js, Express, TypeScript        |
| Database | SQLite + Prisma ORM                 |
| Testing  | Vitest, Supertest                   |

## Project Structure

```
MiniPay/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Dashboard, AddTransaction, TransactionHistory, MonthlySummary
│   │   ├── pages/
│   │   ├── services/        # API client (api.ts)
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx          # Main app layout
│   │   └── main.tsx         # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── server/                  # Express backend
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   ├── src/
│   │   ├── controllers/     # transactionController.ts
│   │   ├── services/        # transactionService.ts (calculateWalletBalance, etc.)
│   │   ├── routes/          # transactionRoutes.ts
│   │   ├── middleware/      # errorHandler.ts
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── app.ts           # Express app factory
│   │   └── index.ts         # Server entry point
│   └── tests/
│       ├── setup.ts         # Test DB setup
│       ├── transactionService.test.ts  # Unit tests
│       └── api.test.ts      # API integration tests
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm

### 1. Clone and install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Initialize the database

```bash
cd server

# Generate Prisma client
npx prisma generate

# Create database and tables
npx prisma db push

# Seed with sample data
npm run db:seed
```

### 3. Start the application

```bash
# Terminal 1 — Start the backend (port 3001)
cd server
npm run dev

# Terminal 2 — Start the frontend (port 5173)
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

### 4. Run tests

```bash
cd server

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## API Endpoints

| Method | Endpoint                    | Description                      |
| ------ | --------------------------- | -------------------------------- |
| GET    | `/api/wallet`               | Get wallet balance & totals      |
| GET    | `/api/transactions`         | List transactions (with filters) |
| GET    | `/api/transactions/:id`     | Get single transaction           |
| POST   | `/api/transactions`         | Create transaction               |
| DELETE | `/api/transactions/:id`     | Delete transaction               |
| GET    | `/api/summary/monthly`      | Monthly expense summary          |

### Query Parameters for GET `/api/transactions`

- `type` — `income` or `expense`
- `startDate` — ISO date (e.g., `2026-10-01`)
- `endDate` — ISO date (e.g., `2026-10-31`)

### POST `/api/transactions` Body

```json
{
  "type": "income",
  "amount": 50000,
  "category": "Salary",
  "note": "October salary",
  "date": "2026-10-01"
}
```

## Features

- **Dashboard** — Wallet balance, total income, total expenses in INR
- **Add Transactions** — Income or expense with category, amount, note, and date
- **Transaction History** — Full list with date, category, amount, type badges
- **Filters** — Filter by type (income/expense) and date range
- **Delete** — Remove transactions with automatic balance recalculation
- **Monthly Summary** — Expense breakdown by category with visual bar charts
- **INR Formatting** — All amounts displayed in ₹ (Indian Rupee)

## Key Functions

- `calculateWalletBalance(transactions)` — Calculates wallet balance from a list of transactions
- `calcTotalIncome(transactions)` — Sums all income
- `calcTotalExpenses(transactions)` — Sums all expenses
- `formatINR(amount)` — Formats a number as INR currency