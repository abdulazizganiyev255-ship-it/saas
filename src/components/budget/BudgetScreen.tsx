import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { Transaction, RecurringTemplate, TabType } from '../../types';
import {
  getMonthTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getRecurringTemplates,
} from '../../services/budget';
import { formatUZS, getTodayDateString } from '../../utils/format';
import { DailyLimitBar } from './DailyLimitBar';
import { QuickAddModal } from './QuickAddModal';
import { MonthCharts } from './MonthCharts';
import { RecurringCard } from './RecurringCard';
import { TransactionList } from './TransactionList';
import { usePlan } from '../../hooks/usePlan';
import { UpgradeModal } from '../common/UpgradeModal';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Scale,
  Undo2,
  Lock,
  Target,
  ArrowRight,
  FileSpreadsheet,
  Crown,
} from 'lucide-react';

interface BudgetScreenProps {
  onNavigate?: (tab: TabType) => void;
}

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ onNavigate }) => {
  const { user, userProfile, language } = useAuth();
  const { isPro } = usePlan();
  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);

  // Current selected month
  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [monthIndex, setMonthIndex] = useState<number>(currentDate.getMonth());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Undo toast state
  const [lastCreatedTx, setLastCreatedTx] = useState<Transaction | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Upgrade modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');

  // Flag for history gating (wired in step 4)
  const canSeeFullHistory = isPro;

  // Load transactions for the month
  const loadTransactions = useCallback(async (refresh: boolean = false) => {
    if (!user) return;
    const list = await getMonthTransactions(user.uid, year, monthIndex, refresh);
    if (list) {
      setTransactions(list);
    }
  }, [user, year, monthIndex]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Load recurring templates
  useEffect(() => {
    if (!user) return;
    getRecurringTemplates(user.uid).then((tpls) => {
      if (tpls) setRecurringTemplates(tpls);
    });
  }, [user]);

  // Month navigation (prev/next)
  const handlePrevMonth = () => {
    if (!canSeeFullHistory) {
      setUpgradeFeature(language === 'uz' ? '30 kundan ortiq arxiv tarixi' : 'Full Budget History');
      setUpgradeModalOpen(true);
      return;
    }
    if (monthIndex === 0) {
      setYear((y) => y - 1);
      setMonthIndex(11);
    } else {
      setMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex === 11) {
      setYear((y) => y + 1);
      setMonthIndex(0);
    } else {
      setMonthIndex((m) => m + 1);
    }
  };

  // CSV Export (Pro feature)
  const handleExportCSV = () => {
    if (!isPro) {
      setUpgradeFeature('CSV Export');
      setUpgradeModalOpen(true);
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Amount_UZS', 'Amount_USD', 'PaymentMethod', 'Note'];
    const rows = transactions.map((t) => [
      t.date,
      t.type,
      `"${t.category.replace(/"/g, '""')}"`,
      t.amountUZS,
      t.amountUSD || '',
      t.paymentMethod,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-transactions-${year}-${monthIndex + 1}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Month display title (e.g. "Oktabr 2026" / "October 2026")
  const monthTitle = useMemo(() => {
    const d = new Date(year, monthIndex, 1);
    const locale = language === 'uz' ? 'uz-UZ' : 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);
  }, [year, monthIndex, language]);

  // Calculate totals
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amountUZS, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amountUZS, 0);
  }, [transactions]);

  const netBalance = totalIncome - totalExpense;

  // Calculate spent on Food today
  const spentFoodToday = useMemo(() => {
    return transactions
      .filter((t) => t.date === todayStr && t.type === 'expense' && t.category === 'Food')
      .reduce((sum, t) => sum + t.amountUZS, 0);
  }, [transactions, todayStr]);

  // Save new / edited transaction
  const handleSaveTransaction = async (txData: Omit<Transaction, 'id'>) => {
    if (!user) return;

    if (editingTx) {
      await updateTransaction(user.uid, editingTx.id, txData, editingTx.date);
      setEditingTx(null);
    } else {
      const created = await addTransaction(user.uid, txData);
      setLastCreatedTx(created);
      setShowUndoToast(true);

      // Auto-hide undo toast after 5 seconds
      setTimeout(() => {
        setShowUndoToast(false);
      }, 5000);
    }

    await loadTransactions(true);
  };

  // Undo transaction creation
  const handleUndo = async () => {
    if (!user || !lastCreatedTx) return;
    await deleteTransaction(user.uid, lastCreatedTx.id, lastCreatedTx.date);
    setShowUndoToast(false);
    setLastCreatedTx(null);
    await loadTransactions(true);
  };

  // Delete transaction
  const handleDeleteTransaction = async (tx: Transaction) => {
    if (!user) return;
    await deleteTransaction(user.uid, tx.id, tx.date);
    await loadTransactions(true);
  };

  // One-tap Add from Recurring Template
  const handleAddRecurringTx = async (tpl: RecurringTemplate) => {
    if (!user) return;

    // Use current month year and template's day of month
    const safeDay = Math.min(tpl.dayOfMonth, new Date(year, monthIndex + 1, 0).getDate());
    const txDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

    await addTransaction(user.uid, {
      date: txDate,
      type: 'expense',
      category: tpl.category,
      amountUZS: tpl.amountUZS,
      paymentMethod: 'card',
      note: tpl.title,
      recurringTemplateId: tpl.id,
      createdAt: new Date().toISOString(),
    });

    await loadTransactions(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:py-7 space-y-5 pb-24">
      {/* 1. Daily Food Limit Progress Bar */}
      <DailyLimitBar spentFoodToday={spentFoodToday} />

      {/* 2. Month Selector & Summary Bar */}
      <div className="rounded-2xl border border-token-raised bg-token-card p-4 sm:p-5 shadow-sm transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-token-raised">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="tap-target flex h-9 w-9 items-center justify-center rounded-xl text-token-muted hover:bg-token-raised transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-extrabold text-token-text capitalize">
              {monthTitle}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="tap-target flex h-9 w-9 items-center justify-center rounded-xl text-token-muted hover:bg-token-raised transition"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* CSV Export Button (Pro) */}
            <button
              onClick={handleExportCSV}
              className={`tap-target flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                isPro
                  ? 'bg-token-raised text-token-text'
                  : 'bg-token-card text-token-cat-4-text border border-token-raised'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-token-cat-4-text" />
              <span>CSV</span>
              {!isPro && <Crown className="h-3 w-3 text-token-warning" />}
            </button>

            {!canSeeFullHistory && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-token-muted">
                <Lock className="h-3 w-3" />
                <span>30-day</span>
              </div>
            )}
          </div>
        </div>

        {/* 3 Metric Cards: Income, Expense, Net */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 text-center">
          {/* Income */}
          <div className="rounded-xl bg-token-raised p-2.5 sm:p-3">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-token-accent uppercase tracking-wider mb-0.5">
              <TrendingUp className="h-3 w-3" />
              <span className="truncate">{t('monthIncome', language)}</span>
            </div>
            <p className="text-sm sm:text-base font-black text-token-text truncate">
              {formatUZS(totalIncome)}
            </p>
          </div>

          {/* Expense */}
          <div className="rounded-xl bg-token-raised p-2.5 sm:p-3">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-token-danger uppercase tracking-wider mb-0.5">
              <TrendingDown className="h-3 w-3" />
              <span className="truncate">{t('monthExpense', language)}</span>
            </div>
            <p className="text-sm sm:text-base font-black text-token-text truncate">
              {formatUZS(totalExpense)}
            </p>
          </div>

          {/* Net Balance */}
          <div className="rounded-xl bg-token-raised p-2.5 sm:p-3">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-token-cat-4-text uppercase tracking-wider mb-0.5">
              <Scale className="h-3 w-3" />
              <span className="truncate">{t('monthNet', language)}</span>
            </div>
            <p
              className={`text-sm sm:text-base font-black truncate ${
                netBalance >= 0 ? 'text-token-accent' : 'text-token-danger'
              }`}
            >
              {netBalance >= 0 ? '+' : ''}
              {formatUZS(netBalance)}
            </p>
          </div>
        </div>

        {/* Link to Financial Goals */}
        {onNavigate && (
          <div className="mt-3 pt-3 border-t border-token-raised flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-token-muted">
              <Target className="h-3.5 w-3.5 text-token-cat-4-text" />
              <span>{language === 'uz' ? 'Moliyaviy maqsadlar' : 'Financial targets & goals'}</span>
            </div>
            <button
              onClick={() => onNavigate('goals')}
              className="tap-target inline-flex items-center gap-1 text-xs font-bold text-token-cat-4-text hover:underline"
            >
              <span>{language === 'uz' ? 'Maqsadlar bo\'limi' : 'View Goals'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Recurring Templates This Month Card */}
      <RecurringCard
        templates={recurringTemplates}
        monthTransactions={transactions}
        onAddRecurringTx={handleAddRecurringTx}
      />

      {/* 4. Donut & Daily Column Charts */}
      <MonthCharts
        transactions={transactions}
        dailyFoodLimit={userProfile?.settings?.dailyFoodLimit ?? 110000}
        year={year}
        monthIndex={monthIndex}
      />

      {/* 5. Transactions List */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-token-muted mb-3">
          {language === 'uz' ? 'Oylik Yozuvlar' : 'Monthly Transactions'}
        </h3>
        <TransactionList
          transactions={transactions}
          onEdit={(tx) => {
            setEditingTx(tx);
            setQuickAddOpen(true);
          }}
          onDelete={handleDeleteTransaction}
        />
      </div>

      {/* 6. Floating "+" Action Button for Quick Add */}
      <button
        onClick={() => {
          setEditingTx(null);
          setQuickAddOpen(true);
        }}
        aria-label="Add transaction"
        className="tap-target fixed bottom-20 md:bottom-8 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-token-accent text-token-on-accent shadow-lg active:scale-95 transition-all cursor-pointer"
      >
        <Plus className="h-7 w-7 stroke-[2.5]" />
      </button>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => {
          setQuickAddOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        editTx={editingTx}
      />

      {/* Undo Toast Notification */}
      {showUndoToast && lastCreatedTx && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-token-card border border-token-raised px-4 py-3 text-xs font-semibold text-token-text shadow-2xl animate-bounce">
          <span>{t('transactionAdded', language)}: {formatUZS(lastCreatedTx.amountUZS)} UZS</span>
          <button
            onClick={handleUndo}
            className="tap-target inline-flex items-center gap-1 rounded-lg bg-token-accent text-token-on-accent px-2.5 py-1 text-xs font-bold transition"
          >
            <Undo2 className="h-3 w-3" />
            <span>{t('undoBtn', language)}</span>
          </button>
        </div>
      )}

      {/* Pro Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        feature={upgradeFeature}
      />
    </div>
  );
};
