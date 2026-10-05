import React from 'react';
import type { RecurringTemplate, Transaction } from '../../types';
import { formatUZS } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import { Repeat, Plus } from 'lucide-react';

interface RecurringCardProps {
  templates: RecurringTemplate[];
  monthTransactions: Transaction[];
  onAddRecurringTx: (template: RecurringTemplate) => Promise<void>;
}

export const RecurringCard: React.FC<RecurringCardProps> = ({
  templates,
  monthTransactions,
  onAddRecurringTx,
}) => {
  const { language } = useAuth();

  if (templates.length === 0) return null;

  // Filter out templates that already have an associated transaction this month
  const pendingTemplates = templates.filter((tpl) => {
    return !monthTransactions.some((tx) => tx.recurringTemplateId === tpl.id);
  });

  if (pendingTemplates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-token-raised bg-token-card p-4 sm:p-5 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-token-cat-4 text-token-on-accent">
          <Repeat className="h-4 w-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-token-cat-4-text">
          {t('recurringThisMonthHeading', language)}
        </h3>
      </div>

      <div className="space-y-2">
        {pendingTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex items-center justify-between rounded-xl border border-token-raised bg-token-raised p-3 shadow-2xs"
          >
            <div className="min-w-0 pr-2">
              <p className="text-sm font-bold text-token-text truncate">
                {tpl.title}
              </p>
              <p className="text-[11px] text-token-muted">
                {tpl.category} · {formatUZS(tpl.amountUZS)} {t('currencyUzs', language)}
              </p>
            </div>

            <button
              onClick={() => onAddRecurringTx(tpl)}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-token-accent text-token-on-accent px-3 py-1.5 text-xs font-bold shadow-sm active:scale-95 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('addRecurringQuick', language)}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
