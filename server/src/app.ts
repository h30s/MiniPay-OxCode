import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import transactionRoutes from './routes/transactionRoutes';
import { errorHandler } from './middleware/errorHandler';
import { setControllerPrisma } from './controllers/transactionController';
import { setPrisma } from './db';

export function createApp(prismaClient?: PrismaClient) {
  if (prismaClient) {
    setPrisma(prismaClient);
    setControllerPrisma(prismaClient);
  }

  const app = express();

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api', transactionRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}