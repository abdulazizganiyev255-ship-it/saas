import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import { NAME_MAX, joinWaitlist, validateTelegram } from '../../services/waitlist';
import { CheckCircle2 } from 'lucide-react';

type Status = 'idle' | 'sending' | 'error' | 'success';

export const WaitlistForm: React.FC = () => {
  const { language } = useAuth();
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');
  const [nameError, setNameError] = useState(false);
  const [tgError, setTgError] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    const nameBad = name.trim().length === 0;
    const tgBad = !validateTelegram(telegram);
    setNameError(nameBad);
    setTgError(tgBad);
    if (nameBad || tgBad) return;

    setStatus('sending');
    try {
      await joinWaitlist({ name, telegram, lang: language });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
        <CheckCircle2 className="h-12 w-12 text-token-accent" />
        <h3 className="text-xl font-black text-token-text">{t('ldThanks', language)}</h3>
        <p className="text-sm text-token-muted">{t('ldThanksSub', language)}</p>
      </div>
    );
  }

  const fieldBase =
    'tap-target mt-2 w-full rounded-xl border bg-token-raised px-3 py-2.5 text-base text-token-text placeholder:text-token-muted placeholder:opacity-100 focus:outline-none';

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor="wl-name" className="block text-sm font-semibold text-token-text">
          {t('ldName', language)}
        </label>
        <input
          id="wl-name"
          type="text"
          autoComplete="given-name"
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('ldNamePh', language)}
          aria-invalid={nameError}
          aria-describedby={nameError ? 'wl-name-err' : undefined}
          className={`${fieldBase} ${nameError ? 'border-token-danger' : 'border-token-raised focus:border-token-accent'}`}
        />
        {nameError && (
          <p id="wl-name-err" className="mt-1 text-sm text-token-danger">{t('ldNameError', language)}</p>
        )}
      </div>

      <div>
        <label htmlFor="wl-tg" className="block text-sm font-semibold text-token-text">
          {t('ldTg', language)}
        </label>
        <input
          id="wl-tg"
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={33}
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="@username"
          aria-invalid={tgError}
          aria-describedby="wl-tg-help"
          className={`${fieldBase} ${tgError ? 'border-token-danger' : 'border-token-raised focus:border-token-accent'}`}
        />
        <p id="wl-tg-help" className={`mt-1 text-sm ${tgError ? 'text-token-danger' : 'text-token-muted'}`}>
          {tgError ? t('ldTgError', language) : t('ldTgHelp', language)}
        </p>
      </div>

      {status === 'error' && (
        <p className="text-sm text-token-danger" role="alert">{t('ldSendError', language)}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="tap-target w-full rounded-xl bg-token-accent px-4 py-3 text-base font-bold text-token-on-accent disabled:opacity-60"
      >
        {status === 'sending' ? t('ldSending', language) : t('ldCta', language)}
      </button>
    </form>
  );
};
