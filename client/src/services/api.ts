import type { WalletSummary, Transaction, MonthlySummary, CreateTransactionPayload } from '../types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getWalletSummary(): Promise<WalletSummary> {
  return fetchJSON<WalletSummary>('/wallet');
}

export async function getTransactions(params?: {
  type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Transaction[]> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  const qs = searchParams.toString();
  return fetchJSON<Transaction[]>(`/transactions${qs ? `?${qs}` : ''}`);
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  return fetchJSON<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteTransaction(id: number): Promise<{
  message: string;
  deleted: Transaction;
  wallet: WalletSummary;
}> {
  return fetchJSON(`/transactions/${id}`, { method: 'DELETE' });
}

export async function getMonthlySummary(): Promise<MonthlySummary[]> {
  return fetchJSON<MonthlySummary[]>('/summary/monthly');
}