import { useState, useEffect } from 'react';
import type { MonthlySummary } from '../types';
import { getMonthlySummary } from '../services/api';

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const CATEGORY_COLORS: Record<string, string> = {
  Rent: 'bg-blue-500',
  Groceries: 'bg-green-500',
  Transport: 'bg-yellow-500',
  Dining: 'bg-red-500',
  Utilities: 'bg-purple-500',
  Shopping: 'bg-pink-500',
  Entertainment: 'bg-indigo-500',
  Healthcare: 'bg-teal-500',
  Education: 'bg-orange-500',
};

function getColor(category: string): string {
  return CATEGORY_COLORS[category] || 'bg-gray-500';
}

export default function MonthlySummary() {
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMonthlySummary();
        setSummaries(data);
      } catch (err) {
        console.error('Failed to fetch monthly summary:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Expense Summary</h2>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Expense Summary</h2>
        <p className="text-gray-400 text-center py-4">No expense data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Expense Summary</h2>
      <div className="space-y-4">
        {summaries.map((summary) => {
          const maxTotal = Math.max(...summary.categories.map((c) => c.total));
          return (
            <div key={summary.month}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700">{monthLabel(summary.month)}</h3>
                <span className="text-sm font-bold text-orange-600">
                  {formatINR(summary.monthlyTotal)}
                </span>
              </div>
              <div className="space-y-1.5">
                {summary.categories
                  .sort((a, b) => b.total - a.total)
                  .map((cat) => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20 truncate">{cat.category}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getColor(cat.category)} transition-all duration-500`}
                          style={{ width: `${Math.max((cat.total / maxTotal) * 100, 3)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-20 text-right">
                        {formatINR(cat.total)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}