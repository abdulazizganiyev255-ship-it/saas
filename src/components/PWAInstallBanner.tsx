import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';
import { Download, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { language } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  if (isInstallable) {
    return (
      <div className="relative mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/90 p-3 sm:px-4 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">
              {t('installApp', language)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              {t('installAppDesc', language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={install}
            className="tap-target rounded-xl bg-indigo-600 px-3.5 py-1.5 font-bold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            {t('installApp', language)}
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isIOS) {
    return (
      <>
        <div className="relative mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 sm:px-4 text-xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {t('installApp', language)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                iOS Safari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowIOSModal(true)}
              className="tap-target rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
            >
              Info
            </button>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
              className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Install on iPhone / iPad
              </h3>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                1. Tap the <strong className="text-indigo-600 dark:text-indigo-400">Share</strong> button in Safari's bottom toolbar.<br />
                2. Scroll down and select <strong className="text-indigo-600 dark:text-indigo-400">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSModal(false)}
                className="tap-target mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
