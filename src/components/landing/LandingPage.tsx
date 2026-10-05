import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t, type TranslationKey } from '../../i18n';
import { APP_NAME, COHORT, CONTACT_URL, PRICING_PLANS } from '../../config/constants';
import { WaitlistForm } from './WaitlistForm';
import { PrivacyPage } from './PrivacyPage';
import { Check, CloudOff, Languages, Users } from 'lucide-react';

const PRIVACY_HASH = '#maxfiylik';

const FEATURES: { icon: React.ElementType; title: TranslationKey; desc: TranslationKey }[] = [
  { icon: CloudOff, title: 'ldF1T', desc: 'ldF1D' },
  { icon: Languages, title: 'ldF2T', desc: 'ldF2D' },
  { icon: Users, title: 'ldF3T', desc: 'ldF3D' },
];

const STEPS: { title: TranslationKey; desc: TranslationKey }[] = [
  { title: 'ldS1T', desc: 'ldS1D' },
  { title: 'ldS2T', desc: 'ldS2D' },
  { title: 'ldS3T', desc: 'ldS3D' },
];

const FAQ: { q: TranslationKey; a: TranslationKey }[] = [
  { q: 'ldQ1', a: 'ldA1' },
  { q: 'ldQ2', a: 'ldA2' },
  { q: 'ldQ3', a: 'ldA3' },
];

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, language, setLanguage } = useAuth();
  const [hash, setHash] = useState(() => window.location.hash);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState(false);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    setSignInError(false);
    try {
      await signInWithGoogle();
    } catch {
      setSignInError(true);
    } finally {
      setSigningIn(false);
    }
  };

  if (hash === PRIVACY_HASH) return <PrivacyPage />;

  const plans = [
    {
      key: 'cohort',
      name: t('ldCohort', language),
      badge: t('ldSeats', language),
      price: COHORT.priceLabel,
      period: t('ldOneTime', language),
      desc: t('ldCohortD', language),
      highlight: true,
    },
    {
      key: 'free',
      name: PRICING_PLANS.free.name,
      price: PRICING_PLANS.free.priceLabel,
      period: t('ldForever', language),
      desc: t('ldFreeD', language),
    },
    {
      key: 'pro',
      name: PRICING_PLANS.pro.name,
      price: PRICING_PLANS.pro.priceLabel,
      period: t('ldPerMonth', language),
      desc: t('ldProD', language),
    },
    {
      key: 'lifetime',
      name: PRICING_PLANS.lifetime.name,
      price: PRICING_PLANS.lifetime.priceLabel,
      period: t('ldOneTime', language),
      desc: t('ldLifetimeD', language),
    },
  ];

  return (
    <div className="min-h-screen scroll-smooth bg-token-bg text-token-text">
      {/* Top bar */}
      <header className="border-b border-token-raised bg-token-bg">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-token-accent" aria-hidden="true" />
            <span className="text-lg font-black">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === 'uz' ? 'en' : 'uz')}
              className="tap-target rounded-lg px-3 text-sm font-semibold text-token-muted"
            >
              {language === 'uz' ? 'EN' : 'UZ'}
            </button>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={signingIn}
              className="tap-target rounded-xl border border-token-accent px-4 text-sm font-bold text-token-accent disabled:opacity-60"
            >
              {t('ldSignIn', language)}
            </button>
          </div>
        </div>
        {signInError && (
          <p className="pb-2 text-center text-sm text-token-danger" role="alert">
            {language === 'uz' ? "Kirib bo'lmadi. Qayta urinib ko'ring." : 'Sign-in failed. Please try again.'}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-[1120px] space-y-16 px-4 py-10 md:space-y-24 md:py-16">
        {/* Hero */}
        <section className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="space-y-5">
            <span className="inline-flex rounded-full bg-token-raised px-3 py-1 text-sm font-semibold text-token-cat-1-text">
              {t('ldChip', language)}
            </span>
            <h1 className="text-3xl font-black leading-tight md:text-5xl">{t('ldH1', language)}</h1>
            <p className="text-base text-token-muted md:text-lg">{t('ldSub', language)}</p>
            <div>
              <a
                href="#join"
                className="tap-target inline-flex w-full items-center justify-center rounded-xl bg-token-accent px-6 py-3 text-base font-bold text-token-on-accent md:w-auto"
              >
                {t('ldCta', language)}
              </a>
              <p className="mt-2 text-sm text-token-muted">{t('ldCtaNote', language)}</p>
            </div>
          </div>

          <div className="w-full max-w-[400px] justify-self-center rounded-2xl border border-token-raised bg-token-card p-5 md:justify-self-end">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">{t('ldPreviewTitle', language)}</h2>
              <span className="rounded-full bg-token-raised px-3 py-1 text-sm font-bold text-token-cat-1-text">60 XP</span>
            </div>
            <ul className="mt-4 space-y-3">
              {[
                { k: 'ldPrev1' as const, done: true },
                { k: 'ldPrev2' as const, done: true },
                { k: 'ldPrev3' as const, done: false },
              ].map((item) => (
                <li key={item.k} className="flex items-center gap-3 rounded-xl bg-token-raised px-3 py-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      item.done ? 'bg-token-accent text-token-on-accent' : 'border-2 border-token-muted'
                    }`}
                    aria-hidden="true"
                  >
                    {item.done && <Check className="h-4 w-4" />}
                  </span>
                  <span className="text-sm font-semibold">{t(item.k, language)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-2xl font-black md:text-3xl">{t('ldWhy', language)}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-token-raised bg-token-card p-5">
                <f.icon className="h-6 w-6 text-token-accent" aria-hidden="true" />
                <h3 className="mt-3 text-base font-bold">{t(f.title, language)}</h3>
                <p className="mt-1 text-sm text-token-muted">{t(f.desc, language)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section>
          <h2 className="text-2xl font-black md:text-3xl">{t('ldHow', language)}</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-2xl border border-token-raised bg-token-card p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-token-accent text-base font-black text-token-on-accent">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-bold">{t(s.title, language)}</h3>
                  <p className="mt-1 text-sm text-token-muted">{t(s.desc, language)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section>
          <h2 className="text-2xl font-black md:text-3xl">{t('ldPricing', language)}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.key}
                className={`rounded-2xl border bg-token-card p-5 ${p.highlight ? 'border-token-accent' : 'border-token-raised'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold">{p.name}</h3>
                  {p.badge && (
                    <span className="rounded-full bg-token-raised px-2.5 py-0.5 text-xs font-bold text-token-cat-1-text">
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-3xl font-black">{p.price}</p>
                <p className="text-sm text-token-muted">{p.period}</p>
                <p className="mt-3 text-sm text-token-muted">{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-token-muted">{t('ldNoPayment', language)}</p>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-[720px]">
          <h2 className="text-2xl font-black md:text-3xl">{t('ldFaq', language)}</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((f, i) => (
              <details
                key={f.q}
                open={i === 0}
                className="group rounded-2xl border border-token-raised bg-token-card px-5 py-4"
              >
                <summary className="tap-target flex cursor-pointer list-none items-center justify-between gap-3 text-base font-bold [&::-webkit-details-marker]:hidden">
                  {t(f.q, language)}
                  <span className="text-token-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                </summary>
                <p className="mt-2 text-sm text-token-muted">{t(f.a, language)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Form */}
        <section id="join" className="mx-auto max-w-[480px] scroll-mt-6 rounded-2xl border border-token-raised bg-token-card p-5 md:p-6">
          <h2 className="text-2xl font-black">{t('ldFormTitle', language)}</h2>
          <p className="mb-5 mt-1 text-sm text-token-muted">{t('ldFormSub', language)}</p>
          <WaitlistForm />
        </section>
      </main>

      <footer className="border-t border-token-raised">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-token-muted">
          <span className="font-bold text-token-text">{APP_NAME}</span>
          <nav className="flex gap-4">
            <a href={PRIVACY_HASH} className="tap-target inline-flex items-center">{t('ldPrivacy', language)}</a>
            {CONTACT_URL && (
              <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className="tap-target inline-flex items-center">
                {t('ldContact', language)}
              </a>
            )}
          </nav>
          <span>{t('ldCopyright', language)}</span>
        </div>
      </footer>
    </div>
  );
};
