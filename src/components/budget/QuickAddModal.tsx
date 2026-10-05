import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import type { Transaction, TransactionType, PaymentMethod } from '../../types';
import { parseShortcutAmount, formatUZS, getTodayDateString } from '../../utils/format';
import { X, Check, HelpCircle } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  editTx?: Transaction | null;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTx,
}) => {
  const { user, userProfile, language } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TransactionType>('expense');
  const [rawAmount, setRawAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const expenseCategories = userProfile?.settings?.expenseCategories || [
    'Food',
    'Transport',
    'Gym',
    'Education',
    'Subscriptions',
    'Phone and Internet',
    'Other',
  ];

  const incomeCategories = userProfile?.settings?.incomeCategories || [
    'Clipping',
    'Product sales',
    'Trading',
    'Other',
  ];

  // Remember last used category or load editTx
  useEffect(() => {
    if (isOpen) {
      if (editTx) {
        setType(editTx.type);
        setRawAmount(String(editTx.amountUZS));
        setCategory(editTx.category);
        setPaymentMethod(editTx.paymentMethod);
        setDate(editTx.date);
        setNote(editTx.note || '');
      } else {
        const catKey = user ? `lifeos_${user.uid}_last_category` : 'lifeos_anon_last_category';
        const lastCategory = localStorage.getItem(catKey) || 'Food';
        setCategory(lastCategory);
        setType('expense');
        setRawAmount('');
        setDate(getTodayDateString(userProfile?.timezone));
        setNote('');
      }

      // Auto-focus amount field on opening
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editTx, userProfile?.timezone, user]);

  if (!isOpen) return null;

  const parsedAmount = parseShortcutAmount(rawAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!parsedAmount || parsedAmount <= 0) return;

    setSaving(true);
    try {
      if (user) {
        localStorage.setItem(`lifeos_${user.uid}_last_category`, category);
      }

      await onSave({
        date,
        type,
        category,
        amountUZS: parsedAmount,
        paymentMethod,
        note: note.trim(),
        createdAt: editTx ? editTx.createdAt : new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to save transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  const activeCategories = type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      {/* Bottom sheet on mobile, rounded modal on desktop */}
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-token-raised bg-token-card p-5 sm:p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-token-raised">
          {/* Type Selector Tabs */}
          <div className="flex items-center rounded-xl border border-token-raised bg-token-raised p-0.5">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (!expenseCategories.includes(category)) setCategory(expenseCategories[0]);
              }}
              className={`tap-target px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-token-danger text-token-on-accent shadow-sm'
                  : 'text-token-muted hover:text-token-text'
              }`}
            >
              {t('typeExpense', language)}
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                if (!incomeCategories.includes(category)) setCategory(incomeCategories[0]);
              }}
              className={`tap-target px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-token-accent text-token-on-accent shadow-sm'
                  : 'text-token-muted hover:text-token-text'
              }`}
            >
              {t('typeIncome', language)}
            </button>
            <button
              type="button"
              onClick={() => setType('savings')}
              className={`tap-target px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'savings'
                  ? 'bg-token-cat-4 text-token-on-accent shadow-sm'
                  : 'text-token-muted hover:text-token-text'
              }`}
            >
              {t('typeSavings', language)}
            </button>
          </div>

          <button
            onClick={onClose}
            className="tap-target flex h-9 w-9 items-center justify-center rounded-xl text-token-muted hover:bg-token-raised"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Amount Field Comes FIRST, Focused, Numeric Keypad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-token-muted">
                {t('amountLabel', language)}
              </label>
              {parsedAmount !== null && parsedAmount > 0 && (
                <span className="text-xs font-black text-token-cat-4-text">
                  = {formatUZS(parsedAmount)} {t('currencyUzs', language)}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                id="amount"
                type="text"
                inputMode="text"
                autoFocus
                value={rawAmount}
                onChange={(e) => setRawAmount(e.target.value)}
                placeholder={t('amountPlaceholder', language)}
                className="tap-target w-full rounded-2xl border-2 border-token-raised bg-token-raised px-4 py-3.5 text-2xl font-black text-token-text placeholder:text-token-muted focus:border-token-accent focus:outline-none transition"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-token-muted uppercase">
                {t('currencyUzs', language)}
              </span>
            </div>

            <p className="mt-1.5 text-[11px] text-token-muted flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              <span>{t('shortcutHint', language)}</span>
            </p>
          </div>

          {/* Category Chips (Remembers Last Used) */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-token-muted block mb-2">
              {t('categoryLabel', language)}
            </label>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`tap-target px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-token-accent text-token-on-accent shadow-md'
                        : 'bg-token-raised text-token-text hover:bg-token-card'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method Chips */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-token-muted block mb-2">
              {t('paymentMethodLabel', language)}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'card' as PaymentMethod, label: t('methodCard', language) },
                { id: 'cash' as PaymentMethod, label: t('methodCash', language) },
                { id: 'click_payme' as PaymentMethod, label: t('methodClickPayme', language) },
                { id: 'other' as PaymentMethod, label: t('methodOther', language) },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`tap-target py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                    paymentMethod === m.id
                      ? 'bg-token-accent text-token-on-accent shadow-sm'
                      : 'bg-token-raised text-token-muted'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Note Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="txDate" className="text-xs font-bold uppercase tracking-wider text-token-muted block mb-1">
                {t('dateLabel', language)}
              </label>
              <input
                id="txDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tap-target w-full rounded-xl border border-token-raised bg-token-raised px-3.5 py-2 text-xs font-semibold text-token-text focus:ring-token-accent"
              />
            </div>

            <div>
              <label htmlFor="txNote" className="text-xs font-bold uppercase tracking-wider text-token-muted block mb-1">
                {t('noteLabel', language)}
              </label>
              <input
                id="txNote"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('notePlaceholder', language)}
                className="tap-target w-full rounded-xl border border-token-raised bg-token-raised px-3.5 py-2 text-xs font-medium text-token-text placeholder:text-token-muted focus:ring-token-accent"
              />
            </div>
          </div>

          {/* Save Button (One Tap) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !parsedAmount || parsedAmount <= 0}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-2xl bg-token-accent text-token-on-accent py-3.5 text-base font-bold shadow-lg active:scale-98 disabled:opacity-50 transition cursor-pointer"
            >
              <Check className="h-5 w-5" />
              <span>{saving ? t('saving', language) : t('saveTransaction', language)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
