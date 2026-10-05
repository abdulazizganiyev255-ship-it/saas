import React from 'react';
import type { Transaction } from '../../types';
import { formatUZS } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface MonthChartsProps {
  transactions: Transaction[];
  dailyFoodLimit: number;
  year: number;
  monthIndex: number;
}

const CATEGORY_COLORS = [
  '#f43f5e', // rose-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#64748b', // slate-500
];

export const MonthCharts: React.FC<MonthChartsProps> = ({
  transactions,
  dailyFoodLimit,
  year,
  monthIndex,
}) => {
  const { language } = useAuth();

  // 1. Group expenses by category for Donut chart
  const expenses = transactions.filter((tx) => tx.type === 'expense');

  const categoryMap: { [cat: string]: number } = {};
  expenses.forEach((tx) => {
    categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amountUZS;
  });

  const donutData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 2. Group expenses by day of month for Column chart
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dayExpenseMap: { [day: number]: number } = {};

  for (let d = 1; d <= daysInMonth; d++) {
    dayExpenseMap[d] = 0;
  }

  expenses.forEach((tx) => {
    const dayNr = parseInt(tx.date.split('-')[2], 10);
    if (!isNaN(dayNr) && dayNr >= 1 && dayNr <= daysInMonth) {
      dayExpenseMap[dayNr] = (dayExpenseMap[dayNr] || 0) + tx.amountUZS;
    }
  });

  const columnData = Object.entries(dayExpenseMap).map(([day, amount]) => ({
    day: String(day),
    amount,
    formatted: `${formatUZS(amount)} ${t('currencyUzs', language)}`,
  }));

  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Donut Chart: Expenses by Category */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          {t('expenseByCategory', language)}
        </h3>

        <div className="h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {donutData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [
                  `${formatUZS(Number(val))} ${t('currencyUzs', language)}`,
                  language === 'uz' ? 'Xarajat' : 'Expense',
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category legend chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {donutData.slice(0, 6).map((item, idx) => (
            <span
              key={item.name}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
              />
              <span>{item.name}:</span>
              <span className="font-bold">{formatUZS(item.value)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Column Chart: Expenses per Day with Horizontal Limit Line */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('expenseByDay', language)}
          </h3>
          <span className="text-[10px] text-amber-500 font-bold">
            Limit: {formatUZS(dailyFoodLimit)} {t('currencyUzs', language)}
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={columnData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                formatter={(_val: any, _name: any, item: any) => [
                  item.payload.formatted,
                  language === 'uz' ? 'Kunlik xarajat' : 'Daily expense',
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              {/* Horizontal daily limit line */}
              <ReferenceLine
                y={dailyFoodLimit}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: 'Limit',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
