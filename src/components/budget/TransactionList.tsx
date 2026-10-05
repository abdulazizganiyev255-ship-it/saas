import React, { useState } from 'react';
import type { Transaction } from '../../types';
import { formatUZS, formatDateDisplay } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import {
  CreditCard,
  Banknote,
  Smartphone,
  HelpCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => Promise<void>;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
}) => {
  const { language } = useAuth();
  const [deleteCandidate, setDeleteCandidate] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Group transactions by date (descending)
  const grouped: { [date: string]: Transaction[] } = {};
  transactions.forEach((tx) => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-3.5 w-3.5 text-blue-500" />;
      case 'cash':
        return <Banknote className="h-3.5 w-3.5 text-emerald-500" />;
      case 'click_payme':
        return <Smartphone className="h-3.5 w-3.5 text-cyan-500" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await onDelete(deleteCandidate);
      setDeleteCandidate(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800/80 dark:bg-slate-900 transition-colors">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('noTransactionsMonth', language)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((dateStr) => {
        const txs = grouped[dateStr];
        const dayExpenseSum = txs
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amountUZS, 0);

        return (
          <div
            key={dateStr}
            className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 transition-colors"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between bg-slate-50/70 px-4 py-2.5 border-b border-slate-100 dark:bg-slate-950/40 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                {formatDateDisplay(dateStr, language)}
              </span>
              {dayExpenseSum > 0 && (
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  -{formatUZS(dayExpenseSum)} {t('currencyUzs', language)}
                </span>
              )}
            </div>

            {/* List of items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {txs.map((tx) => {
                const isExpense = tx.type === 'expense';
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                        {getMethodIcon(tx.paymentMethod)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tx.category}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {tx.note || tx.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span
                        className={`text-sm font-black ${
                          isExpense
                            ? 'text-rose-600 dark:text-rose-400'
                            : isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatUZS(tx.amountUZS)}
                      </span>

                      <div className="flex items-center">
                        <button
                          onClick={() => onEdit(tx)}
                          aria-label="Edit"
                          className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(tx)}
                          aria-label="Delete"
                          className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Delete Confirmation Dialog */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-900/50 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold text-sm">
                  {t('deleteTxConfirmTitle', language)}
                </h3>
              </div>
              <button
                onClick={() => setDeleteCandidate(null)}
                className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              {t('deleteTxConfirmText', language)}
            </p>

            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800 font-semibold">
              <p>{deleteCandidate.category} · {formatUZS(deleteCandidate.amountUZS)} UZS</p>
              <p className="text-[11px] text-slate-400">{deleteCandidate.date}</p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleting}
                className="tap-target rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                {t('cancel', language)}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="tap-target flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleting ? t('deleting', language) : t('confirmDelete', language)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
