import { useState, useEffect } from 'react';
import type { WalletSummary } from '../types';
import { getWalletSummary } from '../services/api';

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function Dashboard() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      const data = await getWalletSummary();
      setWallet(data);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  // Expose refresh for parent
  useEffect(() => {
    (window as any).__refreshDashboard = fetchWallet;
    return () => { delete (window as any).__refreshDashboard; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-36" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Wallet Balance',
      value: wallet?.balance ?? 0,
      color: wallet && wallet.balance >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: 'bg-emerald-50',
      icon: '💰',
    },
    {
      label: 'Total Income',
      value: wallet?.totalIncome ?? 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      icon: '📈',
    },
    {
      label: 'Total Expenses',
      value: wallet?.totalExpenses ?? 0,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      icon: '📉',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">{card.label}</span>
            <span className="text-xl">{card.icon}</span>
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>
            {formatINR(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}