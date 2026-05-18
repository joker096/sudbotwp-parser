import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import type { RosstatResult } from '../lib/rosstat';
import { calculateRatios, hasHighDebt } from '../lib/rosstat';

export default function RosstatSection({ data }: { data: RosstatResult }) {
  const ratios = calculateRatios(data.reports);
  const highDebt = hasHighDebt(ratios);

  const chartData = data.reports
    .map((r) => ({
      year: r.year,
      Выручка: r.revenue,
      Прибыль: r.profit,
      Активы: r.assets,
    }))
    .sort((a, b) => a.year - b.year);

  return (
    <div className="space-y-6">
      {highDebt && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Высокая доля кредиторской задолженности: {ratios[ratios.length - 1]?.debtRatio}%
          </p>
        </div>
      )}

      <div className="h-64 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Выручка" fill="#5856d6" />
            <Bar dataKey="Прибыль" fill="#10b981" />
            <Bar dataKey="Активы" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ratios.slice(-3).map((r) => (
          <div key={r.year} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400">{r.year}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              Рентабельность: {r.profitability ?? '—'}%
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Ликвидность: {r.liquidity ?? '—'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Долг: {r.debtRatio ?? '—'}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
