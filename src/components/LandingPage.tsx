import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { t } from '../i18n';
import { APP_NAME, PRICING_PLANS } from '../config/constants';
import {
  Sparkles,
  Calendar,
  Wallet,
  Dumbbell,
  GraduationCap,
  Target,
  ShieldCheck,
  Moon,
  Sun,
  Lock,
  ArrowRight,
  CheckCircle2,
  Flame,
  ChevronDown,
  ChevronUp,
  Zap,
  Crown,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, language, setLanguage } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error('Sign-in failure:', err);
      setAuthError(
        language === 'uz'
          ? 'Tizimga kirishda xatolik yuz berdi. Qayta urinib ko\'ring.'
          : 'Authentication error. Please try again.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const faqs = [
    {
      q: language === 'uz' ? 'Life OS nima va u kimlar uchun mo\'ljallangan?' : 'What is Life OS and who is it designed for?',
      a: language === 'uz'
        ? 'Life OS — talabalar, yosh dasturchilar va frilanser-asoschilar uchun mo\'ljallangan shaxsiy hayot boshqaruvi tizimi. U kunlik odatlar, 110 ming so\'mlik ovqat limiti bilan byudjet, universitet dars jadvali (juft/toq hafta), zal jurnali va til o\'rganishni bitta yengil ilovada jamlaydi.'
        : 'Life OS is a mobile-first personal operating system tailored for university students and young founders. It unifies daily habit check-ins, UZS budgeting with strict food limits, academic schedules with bi-weekly parity, gym logs, and language practice.',
    },
    {
      q: language === 'uz' ? 'Nega Notion yoki boshqa murakkab ilovalar o\'rniga Life OS?' : 'Why Life OS over heavy Notion templates or generic trackers?',
      a: language === 'uz'
        ? 'Boshqa tizimlar 10-15 daqiqa vaqt oladi va doim chalg\'itadi. Life OS esa "Kuningizni 2 daqiqada yakunlang" tamoyiliga qurilgan: bir bosishda odatlar, tezkor byudjet va avtomatik hisob-kitoblar.'
        : 'Most productivity suites take 15+ minutes of manual overhead. Life OS is strictly built around the promise to close your entire day in 2 minutes with one-tap optimistic UI.',
    },
    {
      q: language === 'uz' ? 'Telefonda qulay ishlaydimi va o\'rnatish mumkinmi (PWA)?' : 'Does it work smoothly on mobile and can it be installed (PWA)?',
      a: language === 'uz'
        ? 'Ha! Life OS to\'liq PWA (Progressive Web App) standartida qurilgan. Brauzer orqali telefoningizning bosh ekraniga ilova sifatida o\'rnatiladi, 360px ekranlarda ham qulay ishlaydi.'
        : 'Yes! Life OS is a compliant Progressive Web App with offline caching, smooth mobile gestures, zero horizontal scroll down to 360px, and installability to home screens.',
    },
    {
      q: language === 'uz' ? 'Ma\'lumotlarim xavfsizmi va ularni eksport qila olamanmi?' : 'Is my personal data isolated and can I export or delete it?',
      a: language === 'uz'
        ? 'To\'liq xavfsiz. Barcha yozuvlar Firestore xavfsizlik qoidalari orqali faqat sizning hisobingizga biriktirilgan. Sozlamalar orqali istalgan paytda barcha ma\'lumotlaringizni bitta JSON fayl sifatida yuklab olishingiz yoki hisobingizni o\'chirishingiz mumkin.'
        : 'Completely private. Strict Firestore rules isolate data under users/{uid}. You retain full data ownership with one-click full JSON export and permanent account deletion.',
    },
    {
      q: language === 'uz' ? 'Universitet dars jadvalida Juft va Toq hafta (Numerator/Denominator) qanday ishlaydi?' : 'How does bi-weekly university parity (Even / Odd weeks) work?',
      a: language === 'uz'
        ? 'Sozlamalarda Dushanba kuni boshlangan juft hafta uchun Anchor sana ko\'rsatiladi. Tizim har bir kun uchun o\'tgan haftalar sonini avtomatik hisoblab, faqat bugungi paritetga mos darslarni ko\'rsatadi.'
        : 'You configure a Monday anchor date that represents an EVEN week in Settings. The system computes whole elapsed weeks to automatically filter classes that run every week, even weeks, or odd weeks.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* 1. Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {APP_NAME}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => setLanguage('uz')}
                className={`tap-target px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  language === 'uz'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                UZ
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`tap-target px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  language === 'en'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="tap-target flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>

            {/* Google Sign-in Header CTA */}
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="tap-target inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{signingIn ? t('signingIn', language) : t('signInWithGoogle', language)}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-50/60 px-4 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>
              {language === 'uz' ? 'Talabalar va yosh asoschilar uchun maxsus' : 'Built for ambitious students & young founders'}
            </span>
          </div>

          {/* ONE-LINE PROMISE */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            {language === 'uz' ? (
              <>
                Butun kuningizni <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">2 daqiqada</span> yakunlang.
              </>
            ) : (
              <>
                Close your whole day in <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">2 minutes</span>.
              </>
            )}
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {language === 'uz'
              ? 'Tonggi reja, kunlik odatlar, 110 000 so\'mlik ovqat limiti bilan byudjet, universitet dars jadvali, zal jurnali va til mashg\'ulotlari — barchasi bitta ixcham tizimda.'
              : 'Daily plan, one-tap habit streaks, 110k UZS food budget cap, university parity schedule, workout overload, and goals tracking in one clean mobile app.'}
          </p>

          {/* CTA Box */}
          <div className="pt-2 flex flex-col items-center justify-center gap-3">
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="tap-target inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-700 active:scale-98 transition cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{signingIn ? t('signingIn', language) : t('signInWithGoogle', language)}</span>
            </button>

            {authError && (
              <p className="text-xs font-semibold text-rose-500 animate-shake">
                {authError}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {language === 'uz' ? 'Bepul boshlash' : 'Free forever plan'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                {language === 'uz' ? 'Xavfsiz Google kirish' : 'Secure Google Auth'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THREE BENEFIT CARDS WITH SCREENSHOT PLACEHOLDERS */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {language === 'uz' ? 'Asosiy Imkoniyatlar' : 'Engineered For Clarity'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === 'uz' ? 'Har bir detal talabalar va intizomli yoshlar tajribasiga moslangan.' : 'Every micro-interaction designed to save your cognitive energy.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Benefit 1: One-tap daily check-in */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-4">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {language === 'uz' ? 'Bir bosishda kunlik check-in' : 'One-tap daily check-in'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {language === 'uz'
                  ? 'Top-3 ustuvor vazifalar, odatlar checklisti, 1-5 energiya, uyqu soatlari va debounced kechki xulosa.'
                  : 'Top 3 priorities, instant optimistic habit toggles, streak freeze protections, and debounced reflections.'}
              </p>
            </div>

            {/* Visual Screenshot Placeholder 1 */}
            <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800/60 dark:bg-slate-950/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-amber-500">
                  <Flame className="h-3.5 w-3.5" /> 7 kunlik streak
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">88% Ball</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="line-through">Deep work (3 soat)</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="line-through">Zal mashg'uloti</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Benefit 2: Budget in so'm with daily limit */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {language === 'uz' ? 'Kunlik ovqat limiti bilan so\'mda byudjet' : 'Budget in so\'m with daily food cap'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {language === 'uz'
                  ? '110k, 1.5m tezkor klaviatura qisqartmalari, 110 000 so\'mlik taom limiti progress bari va oylik tahlil.'
                  : 'Fast 110k / 1.5m amount shortcuts, daily 110,000 UZS food guardrails progress bar, and category breakdown.'}
              </p>
            </div>

            {/* Visual Screenshot Placeholder 2 */}
            <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800/60 dark:bg-slate-950/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">Kunlik Taom</span>
                <span className="text-emerald-600 font-extrabold">45 000 / 110 000</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '41%' }} />
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                65 000 so'm tejaldi (41% sarflandi)
              </p>
            </div>
          </div>

          {/* Benefit 3: Student timetable with even/odd parity */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {language === 'uz' ? 'Juft/toq hafta dars jadvali' : 'Bi-weekly timetable & lecture notes'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {language === 'uz'
                  ? 'Juft va toq hafta paritetini avtomatik hisoblaydigan dars jadvali, bir bosishda konspekt qaydi va topshiriqlar doskasi.'
                  : 'Smart timetable with numerator/denominator week parity calculation, one-tap lecture note logging, and assignment board.'}
              </p>
            </div>

            {/* Visual Screenshot Placeholder 3 */}
            <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-800/60 dark:bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-blue-600 dark:text-blue-400 uppercase">Juft Hafta · 09:00</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]">Ma'ruza</span>
              </div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">Matematik Analiz · 304-xona</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Konspekt qilindi
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRICING TABLE (Free, Pro, Lifetime) */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <div className="text-center space-y-2 mb-12">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
            {language === 'uz' ? 'Shaffof Narxlar' : 'Pricing Plans'}
          </span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">
            {language === 'uz' ? 'O\'zingizga mos tarifni tanlang' : 'Invest in your productivity'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === 'uz' ? 'Hech qanday yashirin to\'lovlar yo\'q. Bepul boshlang.' : 'Zero hidden fees. Start free and upgrade when ready.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Free Plan */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{PRICING_PLANS.free.name}</h3>
                <p className="text-xs text-slate-400">{language === 'uz' ? 'Asosiy intizom uchun' : 'Essential daily tracking'}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white">$0</span>
                <span className="text-xs text-slate-400">{language === 'uz' ? 'doimiy bepul' : 'forever'}</span>
              </div>
              <div className="pt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {language === 'uz' ? 'Kunlik reja & odatlar checklisti' : 'Daily plan & habit checklist'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {language === 'uz' ? 'O\'tgan 30 kunlik byudjet' : 'Last 30 days budget'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {language === 'uz' ? '3 tagacha shaxsiy maqsad' : 'Up to 3 active goals'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {language === 'uz' ? '30 kunlik faollik gridi' : '30-day activity grid'}</div>
              </div>
            </div>

            <button
              onClick={handleSignIn}
              className="tap-target mt-6 w-full rounded-2xl border border-slate-300 dark:border-slate-700 py-3 text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {language === 'uz' ? 'Bepul boshlash' : 'Get Started Free'}
            </button>
          </div>

          {/* Pro Plan (Popular) */}
          <div className="relative rounded-3xl border-2 border-indigo-600 bg-indigo-50/20 p-6 shadow-xl dark:border-indigo-500 dark:bg-indigo-950/20 flex flex-col justify-between">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-black text-white uppercase tracking-wider shadow-sm">
              {language === 'uz' ? 'Eng ko\'p tanlangan' : 'Most Popular'}
            </span>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{PRICING_PLANS.pro.name}</span>
                  <Crown className="h-4 w-4 text-amber-500" />
                </h3>
                <p className="text-xs text-slate-400">{language === 'uz' ? 'Talabalar va asoschilar uchun' : 'Full power for founders'}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white">$3.99</span>
                <span className="text-xs text-slate-400">{language === 'uz' ? ' / oy' : ' / mo'}</span>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> {language === 'uz' ? 'Gym mashg\'ulotlari & Progressive overload' : 'Gym workouts & progressive overload'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> {language === 'uz' ? 'Dars jadvali (Juft/Toq) & Konspektlar' : 'Timetable parity & lecture notes'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> {language === 'uz' ? 'Til mashg\'ulotlari & so\'zlar jurnali' : 'Language logs & vocabulary tracker'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> {language === 'uz' ? 'Haftalik Avtomatik Sharh & Retrospektiva' : 'Auto-calculated Weekly Reviews'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> {language === 'uz' ? 'Cheksiz maqsadlar & CSV eksport' : 'Unlimited goals & CSV export'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> {language === 'uz' ? 'To\'liq 365 kunlik heatmap' : 'Full 365-day year grid'}</div>
              </div>
            </div>

            <button
              onClick={handleSignIn}
              className="tap-target mt-6 w-full rounded-2xl bg-indigo-600 py-3 text-xs font-black text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition"
            >
              {language === 'uz' ? 'Pro bilan boshlash' : 'Start with Pro'}
            </button>
          </div>

          {/* Lifetime Plan */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{PRICING_PLANS.lifetime.name}</h3>
                <p className="text-xs text-slate-400">{language === 'uz' ? 'Bir martalik to\'lov' : 'One-time investment'}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white">$59.99</span>
                <span className="text-xs text-emerald-500 font-bold">{language === 'uz' ? 'umrbod' : 'one-time'}</span>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {language === 'uz' ? 'Barcha Pro imkoniyatlari umrbod' : 'All Pro features forever'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {language === 'uz' ? 'Kelgusi barcha yangilanishlar' : 'All future major upgrades'}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {language === 'uz' ? 'VIP founder status' : 'VIP founder access'}</div>
              </div>
            </div>

            <button
              onClick={handleSignIn}
              className="tap-target mt-6 w-full rounded-2xl border border-slate-300 dark:border-slate-700 py-3 text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {language === 'uz' ? 'Lifetime olish' : 'Get Lifetime Access'}
            </button>
          </div>
        </div>
      </section>

      {/* 5. FAQ (5 QUESTIONS) */}
      <section className="py-12 px-4 max-w-3xl mx-auto">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <HelpCircle className="h-6 w-6 text-indigo-500" />
            <span>{t('faqHeading', language)}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === 'uz' ? 'Ko\'p so\'raladigan savollarga javoblar' : 'Frequently asked questions'}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="tap-target flex w-full items-center justify-between p-4 sm:p-5 text-left text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                >
                  <span className="pr-4">{faq.q}</span>
                  {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-indigo-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. FINAL BOTTOM CTA BANNER */}
      <section className="py-16 px-4 text-center">
        <div className="mx-auto max-w-3xl rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/20 via-slate-900 to-slate-950 p-8 sm:p-12 shadow-2xl text-white space-y-5">
          <h2 className="text-2xl sm:text-4xl font-black">
            {language === 'uz' ? 'Kuningizni bugundan tartibga soling.' : 'Take control of your life starting today.'}
          </h2>
          <p className="mx-auto max-w-md text-xs sm:text-sm text-slate-300">
            {language === 'uz'
              ? 'Hech qanday to\'lov kartasi talab qilinmaydi. Google orqali 5 soniyada kiring.'
              : 'No credit card required. Sign in with Google in 5 seconds.'}
          </p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="tap-target inline-flex items-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-700 transition"
            >
              <span>{t('signInWithGoogle', language)}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-200/80 py-8 text-center text-xs text-slate-400 dark:border-slate-800">
        <p>© 2026 {APP_NAME}. Built for ambitious students and founders.</p>
      </footer>
    </div>
  );
};
