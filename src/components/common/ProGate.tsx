import React, { useState } from 'react';
import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import { UpgradeModal } from './UpgradeModal';
import { Crown, Lock, Sparkles, ArrowRight } from 'lucide-react';

interface ProGateProps {
  feature: string;
  featureTitle?: string;
  featureDesc?: string;
  children: React.ReactNode;
  preview?: React.ReactNode;
}

export const ProGate: React.FC<ProGateProps> = ({
  feature,
  featureTitle,
  featureDesc,
  children,
  preview,
}) => {
  const { isPro } = usePlan();
  const { language } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // If user is Pro, render feature normally
  if (isPro) {
    return <>{children}</>;
  }

  // If user is Free, show preview + lock banner and upgrade modal
  return (
    <div className="relative w-full">
      {/* Locked overlay hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-slate-900 to-slate-950 p-6 sm:p-8 text-center shadow-xl dark:border-indigo-500/20 mb-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-3">
          <Crown className="h-6 w-6 text-amber-400" />
        </div>

        <span className="inline-block rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-bold text-indigo-300 border border-indigo-500/30 mb-2">
          {t('proFeatureBadge', language)}
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-white">
          {featureTitle || feature}
        </h2>

        <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-300 leading-relaxed">
          {featureDesc ||
            (language === 'uz'
              ? `${feature} moduli Life OS Pro tarifida to'liq ochiladi. Shaxsiy unumdorlikni eng yuqori darajaga olib chiqing.`
              : `The ${feature} module is available exclusively on Life OS Pro. Unlock your ultimate productivity system.`)}
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="tap-target inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-xl shadow-indigo-600/40 hover:from-indigo-700 hover:to-indigo-800 transition active:scale-95 cursor-pointer"
          >
            <Crown className="h-4 w-4 text-amber-300" />
            <span>{t('unlockWithProBtn', language)}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Blurred / Dimmed preview of the underlying screen */}
      <div className="relative pointer-events-none select-none opacity-40 blur-[2px] filter transition-all">
        {preview ? preview : children}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        feature={feature}
      />
    </div>
  );
};
