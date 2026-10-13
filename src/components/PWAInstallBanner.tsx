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
      <div className="relative mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-token-accent/30 bg-token-raised p-3 sm:px-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-token-accent text-token-on-accent shrink-0">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-token-text">
              {t('installApp', language)}
            </p>
            <p className="text-[11px] text-token-muted hidden sm:block">
              {t('installAppDesc', language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={install}
            className="tap-target rounded-xl bg-token-accent px-3.5 py-1.5 font-bold text-token-on-accent shadow-sm hover:opacity-90 transition"
          >
            {t('installApp', language)}
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-token-muted hover:text-token-text"
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
        <div className="relative mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-token-raised bg-token-card p-3 sm:px-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-token-raised text-token-text shrink-0">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-token-text">
                {t('installApp', language)}
              </p>
              <p className="text-[11px] text-token-muted">
                iOS Safari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowIOSModal(true)}
              className="tap-target rounded-xl border border-token-raised bg-token-raised px-3 py-1.5 font-bold text-token-text transition"
            >
              Info
            </button>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
              className="tap-target flex h-8 w-8 items-center justify-center rounded-lg text-token-muted hover:text-token-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-token-card p-6 shadow-2xl">
              <h3 className="font-bold text-base text-token-text">
                Install on iPhone / iPad
              </h3>
              <p className="mt-3 text-xs text-token-muted leading-relaxed">
                1. Tap the <strong className="text-token-accent">Share</strong> button in Safari's bottom toolbar.<br />
                2. Scroll down and select <strong className="text-token-accent">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSModal(false)}
                className="tap-target mt-5 w-full rounded-xl bg-token-accent py-2.5 text-xs font-bold text-token-on-accent hover:opacity-90 transition"
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
