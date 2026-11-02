import { useState, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import TransactionHistory from './components/TransactionHistory';
import MonthlySummary from './components/MonthlySummary';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransactionAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // Refresh dashboard
    if ((window as any).__refreshDashboard) {
      (window as any).__refreshDashboard();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪙</span>
            <h1 className="text-xl font-bold text-gray-800">MiniPay</h1>
          </div>
          <span className="text-sm text-gray-400">Wallet & Expense Tracker</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Dashboard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AddTransaction onSuccess={handleTransactionAdded} />
            <MonthlySummary />
          </div>
          <div className="lg:col-span-2">
            <TransactionHistory refreshKey={refreshKey} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-gray-400 border-t border-gray-200 mt-8">
        MiniPay — Personal Wallet & Expense Tracker
      </footer>
    </div>
  );
}