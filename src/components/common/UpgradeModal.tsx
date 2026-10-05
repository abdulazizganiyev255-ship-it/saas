import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import { CHECKOUT_URL, PRICING_PLANS } from '../../config/constants';
import {
  Sparkles,
  X,
  Check,
  Zap,
  Crown,
  Dumbbell,
  GraduationCap,
  Languages,
  CalendarCheck,
  Infinity,
  FileSpreadsheet,
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature,
}) => {
  const { language } = useAuth();
  const [notice, setNotice] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const proFeatures = [
    { icon: Dumbbell, label: language === 'uz' ? 'Gym & Mashg\'ulotlar jurnali (Progressive overload)' : 'Gym workouts & progressive overload tracker' },
    { icon: GraduationCap, label: language === 'uz' ? 'Universitet dars jadvali (Juft/Toq) & Konspektlar' : 'Student timetable (even/odd parity) & lecture notes' },
    { icon: Languages, label: language === 'uz' ? 'Til mashg\'ulotlari & yangi so\'zlar jurnali' : 'Language practice session logs & word tracker' },
    { icon: CalendarCheck, label: language === 'uz' ? 'Avtomatik Haftalik Sharh & Tahlil' : 'Auto-calculated Weekly Reviews & insights' },
    { icon: Infinity, label: language === 'uz' ? 'Cheksiz shaxsiy maqsadlar (Free: 3 tagacha)' : 'Unlimited goals (Free plan limit is 3)' },
    { icon: FileSpreadsheet, label: language === 'uz' ? 'Byudjet tranzaksiyalarini CSV formatida yuklash' : 'CSV data export for budget transactions' },
    { icon: Sparkles, label: language === 'uz' ? 'To\'liq 365 kunlik heatmap va yillik tarix' : 'Full 365-day year heatmap & complete history' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-token-raised bg-token-card p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-token-raised">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-token-cat-4 text-token-on-accent shadow-md">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <span className="inline-block rounded-md bg-token-raised px-2 py-0.5 text-[10px] font-black uppercase text-token-cat-4-text">
                Life OS PRO
              </span>
              <h2 className="text-lg font-black text-token-text">
                {t('upgradeModalTitle', language)}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-token-muted hover:bg-token-raised"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feature highlight */}
        {feature && (
          <div className="mt-4 rounded-xl bg-token-raised border border-token-raised p-3 text-xs font-semibold text-token-text flex items-center gap-2">
            <Zap className="h-4 w-4 text-token-cat-4-text shrink-0" />
            <span>
              {language === 'uz'
                ? `Ushbu imkoniyat (${feature}) Life OS Pro tarifida mavjud.`
                : `This feature (${feature}) is unlocked with Life OS Pro.`}
            </span>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Monthly */}
          <div className="relative rounded-2xl border-2 border-token-accent bg-token-card p-4 text-center flex flex-col justify-between">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-token-accent px-2.5 py-0.5 text-[9px] font-bold text-token-on-accent uppercase tracking-wider">
              {language === 'uz' ? 'Ommabop' : 'Popular'}
            </span>
            <div>
              <p className="text-xs font-extrabold text-token-text">
                {t('proMonthly', language)}
              </p>
              <div className="mt-1 flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-black text-token-text">
                  {PRICING_PLANS.pro.priceLabel}
                </span>
                <span className="text-[11px] text-token-muted font-semibold">/mo</span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-token-muted">
              {language === 'uz' ? 'Istalgan vaqtda bekor qilish' : 'Cancel anytime'}
            </p>
          </div>

          {/* Lifetime */}
          <div className="rounded-2xl border border-token-raised bg-token-card p-4 text-center flex flex-col justify-between">
            <div>
              <p className="text-xs font-extrabold text-token-text">
                {t('proLifetime', language)}
              </p>
              <div className="mt-1 flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-black text-token-text">
                  {PRICING_PLANS.lifetime.priceLabel}
                </span>
                <span className="text-[11px] text-token-muted font-semibold">
                  {language === 'uz' ? 'bir marta' : 'one-time'}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-token-accent font-bold">
              {language === 'uz' ? 'Umrbod kirish' : 'Lifetime access'}
            </p>
          </div>
        </div>

        {/* Features Checklist */}
        <div className="mt-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-token-muted">
            {language === 'uz' ? 'Pro tarifidagi barcha imkoniyatlar:' : 'Everything included in Pro:'}
          </p>
          <div className="space-y-2">
            {proFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-token-text">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-token-raised text-token-accent shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Button pointing to CHECKOUT_URL */}
        <div className="mt-6 space-y-2">
          {CHECKOUT_URL ? (
            <a
              href={CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target flex w-full items-center justify-center gap-2 rounded-2xl bg-token-accent text-token-on-accent py-3.5 text-sm font-bold shadow-lg active:scale-98"
            >
              <Crown className="h-4 w-4" />
              <span>{t('upgradeNowBtn', language)}</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNotice(language === 'uz' ? "To'lov tez orada ochiladi" : "To'lov tez orada ochiladi");
                setTimeout(() => setNotice(null), 3500);
              }}
              className="tap-target flex w-full items-center justify-center gap-2 rounded-2xl bg-token-accent text-token-on-accent py-3.5 text-sm font-bold shadow-lg active:scale-98 cursor-pointer"
            >
              <Crown className="h-4 w-4" />
              <span>{t('upgradeNowBtn', language)}</span>
            </button>
          )}

          {notice ? (
            <div className="rounded-xl bg-token-raised border border-token-raised p-2.5 text-center text-xs font-bold text-token-warning animate-fade-in">
              {notice}
            </div>
          ) : (
            <p className="text-center text-[11px] text-token-muted">
              {CHECKOUT_URL
                ? (language === 'uz' ? "Xavfsiz to'lov sahifasi ochiladi. Hech qanday majburiyatsiz." : 'Opens secure checkout. 14-day money back guarantee.')
                : "To'lov tez orada ochiladi"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
