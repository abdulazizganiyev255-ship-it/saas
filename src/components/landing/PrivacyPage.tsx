import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t, type TranslationKey } from '../../i18n';
import { CONTACT_URL } from '../../config/constants';
import { ArrowLeft } from 'lucide-react';

const SECTIONS: { h: TranslationKey; p: TranslationKey }[] = [
  { h: 'ldPrivCollectH', p: 'ldPrivCollect' },
  { h: 'ldPrivWhyH', p: 'ldPrivWhy' },
  { h: 'ldPrivShowH', p: 'ldPrivShow' },
  { h: 'ldPrivStoreH', p: 'ldPrivStore' },
  { h: 'ldPrivDelH', p: 'ldPrivDel' },
];

export const PrivacyPage: React.FC = () => {
  const { language } = useAuth();
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-token-bg px-4 py-8 text-token-text">
      <a href="#" className="tap-target inline-flex items-center gap-2 text-sm font-semibold text-token-accent">
        <ArrowLeft className="h-4 w-4" />
        {t('ldBack', language)}
      </a>
      <h1 className="mt-4 text-2xl font-black">{t('ldPrivTitle', language)}</h1>
      <div className="mt-6 space-y-5">
        {SECTIONS.map((s) => (
          <section key={s.h} className="rounded-2xl border border-token-raised bg-token-card p-4">
            <h2 className="text-base font-bold">{t(s.h, language)}</h2>
            <p className="mt-1 text-sm text-token-muted">{t(s.p, language)}</p>
          </section>
        ))}
      </div>
      {CONTACT_URL && (
        <a
          href={CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-target mt-6 inline-flex items-center text-sm font-semibold text-token-accent"
        >
          {t('ldContact', language)}
        </a>
      )}
    </main>
  );
};
