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
        return <CreditCard className="h-3.5 w-3.5 text-token-cat-2" />;
      case 'cash':
        return <Banknote className="h-3.5 w-3.5 text-token-accent" />;
      case 'click_payme':
        return <Smartphone className="h-3.5 w-3.5 text-token-cat-2" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-token-muted" />;
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
      <div className="rounded-2xl border border-token-raised bg-token-card p-8 text-center transition-colors">
        <p className="text-sm text-token-muted">
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
            className="rounded-2xl border border-token-raised bg-token-card overflow-hidden shadow-2xs transition-colors"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between bg-token-raised px-4 py-2.5 border-b border-token-raised">
              <span className="text-xs font-bold text-token-text capitalize">
                {formatDateDisplay(dateStr, language)}
              </span>
              {dayExpenseSum > 0 && (
                <span className="text-xs font-semibold text-token-danger">
                  -{formatUZS(dayExpenseSum)} {t('currencyUzs', language)}
                </span>
              )}
            </div>

            {/* List of items */}
            <div className="divide-y divide-token-raised">
              {txs.map((tx) => {
                const isExpense = tx.type === 'expense';
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 hover:bg-token-raised transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-token-raised shrink-0">
                        {getMethodIcon(tx.paymentMethod)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-token-text truncate">
                          {tx.category}
                        </p>
                        <p className="text-xs text-token-muted truncate">
                          {tx.note || tx.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span
                        className={`text-sm font-black ${
                          isExpense
                            ? 'text-token-danger'
                            : isIncome
                            ? 'text-token-accent'
                            : 'text-token-cat-4-text'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatUZS(tx.amountUZS)}
                      </span>

                      <div className="flex items-center">
                        <button
                          onClick={() => onEdit(tx)}
                          aria-label="Edit"
                          className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-token-muted hover:text-token-cat-4-text transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(tx)}
                          aria-label="Delete"
                          className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-token-muted hover:text-token-danger transition"
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
          <div className="w-full max-w-sm rounded-2xl border border-token-raised bg-token-card p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-token-raised">
              <div className="flex items-center gap-2 text-token-danger">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold text-sm">
                  {t('deleteTxConfirmTitle', language)}
                </h3>
              </div>
              <button
                onClick={() => setDeleteCandidate(null)}
                className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-token-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-token-muted">
              {t('deleteTxConfirmText', language)}
            </p>

            <div className="mt-3 rounded-xl bg-token-raised p-3 text-xs font-semibold text-token-text">
              <p>{deleteCandidate.category} · {formatUZS(deleteCandidate.amountUZS)} UZS</p>
              <p className="text-[11px] text-token-muted">{deleteCandidate.date}</p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleting}
                className="tap-target rounded-xl border border-token-raised px-3.5 py-2 text-xs font-semibold text-token-text"
              >
                {t('cancel', language)}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="tap-target flex items-center gap-1.5 rounded-xl bg-token-danger px-4 py-2 text-xs font-bold text-token-on-accent disabled:opacity-50"
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
