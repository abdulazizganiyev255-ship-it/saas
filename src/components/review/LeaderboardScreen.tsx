import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t, tf } from '../../i18n';
import {
  MOCK_LEADERBOARD_MEMBERS,
  type LeaderboardMember,
  type TeamLeaderboard,
} from '../../config/mockLeaderboard';
import { getTodayDateString, getWeekdayNumber } from '../../utils/format';
import { isoWeekNumber, GRACE_DAYS_MAX } from '../../utils/weekly';
import { Check, ChevronDown, Share2, Trophy } from 'lucide-react';

const MEDAL_CLASS = ['text-token-accent', 'text-token-muted', 'text-token-cat-3-text'];

export const LeaderboardScreen: React.FC = () => {
  const { language, userProfile } = useAuth();
  const [tab, setTab] = useState<'teams' | 'global'>('teams');
  const [copied, setCopied] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const [override, setOverride] = useState<Record<string, boolean>>({});

  const todayStr = useMemo(() => getTodayDateString(userProfile?.timezone), [userProfile?.timezone]);
  const weekNumber = isoWeekNumber(todayStr);
  const daysLeft = 7 - getWeekdayNumber(todayStr);

  const globalSorted = useMemo<LeaderboardMember[]>(
    () => [...MOCK_LEADERBOARD_MEMBERS].sort((a, b) => b.weeklyXP - a.weeklyXP),
    []
  );

  const teams = useMemo(() => {
    const byTeam = new Map<string, LeaderboardMember[]>();
    MOCK_LEADERBOARD_MEMBERS.forEach((m) => {
      byTeam.set(m.teamName, [...(byTeam.get(m.teamName) ?? []), m]);
    });
    const list = Array.from(byTeam.entries()).map(([teamName, members]) => {
      const sortedMembers = [...members].sort((a, b) => b.weeklyXP - a.weeklyXP);
      const summary: TeamLeaderboard = {
        teamName,
        totalXP: members.reduce((s, m) => s + m.weeklyXP, 0),
        memberCount: members.length,
        avgConsistency: Math.round(members.reduce((s, m) => s + m.consistencyScore, 0) / members.length),
      };
      return { ...summary, members: sortedMembers };
    });
    return list.sort((a, b) => b.totalXP - a.totalXP);
  }, []);

  const me = useMemo(() => {
    const idx = globalSorted.findIndex((m) => m.isMe);
    if (idx === -1) return null;
    const member = globalSorted[idx];
    const teamRank = teams.find((tm) => tm.teamName === member.teamName)!.members.findIndex((m) => m.isMe) + 1;
    return { member, globalRank: idx + 1, teamRank };
  }, [globalSorted, teams]);

  const isOpen = (teamName: string, index: number) => override[teamName] ?? index === 0;

  const toggle = (teamName: string, index: number) =>
    setOverride((prev) => ({ ...prev, [teamName]: !(prev[teamName] ?? index === 0) }));

  const handleShare = async () => {
    if (!me) return;
    const text = tf('lbShareText', language, {
      n: weekNumber,
      nick: me.member.nickname,
      team: me.member.teamName,
      rank: me.globalRank,
      xp: me.member.weeklyXP,
      score: me.member.consistencyScore,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setShareFailed(false);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setShareFailed(true);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-24 sm:py-7">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-token-text">{t('navLeaderboard', language)}</h1>
          <p className="mt-0.5 text-sm text-token-muted">
            {tf('lbWeekLine', language, { n: weekNumber, d: daysLeft })}
          </p>
        </div>
        <span className="rounded-full bg-token-raised px-3 py-1 text-xs font-semibold text-token-muted">
          {t('lbDemo', language)}
        </span>
      </div>

      {/* My status */}
      {me && (
        <section className="rounded-2xl border border-token-accent bg-token-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-token-muted">
            {t('lbYourStatus', language)}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-token-accent text-lg font-black text-token-on-accent">
              {me.member.nickname.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-token-text">{me.member.nickname}</p>
              <p className="text-sm text-token-muted">{tf('lbTeamOf', language, { name: me.member.teamName })}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { v: `#${me.globalRank}`, l: t('lbOverallRank', language) },
              { v: `#${me.teamRank}`, l: t('lbTeamRank', language) },
              { v: String(me.member.weeklyXP), l: t('wrWeeklyXP', language) },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-token-raised px-2 py-3">
                <p className="text-xl font-black text-token-text">{s.v}</p>
                <p className="mt-0.5 text-xs text-token-muted">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-token-raised px-3 py-1 text-xs font-semibold text-token-text">
              {t('lbConsistency', language)}: {me.member.consistencyScore}
            </span>
            <span className="rounded-full bg-token-raised px-3 py-1 text-xs font-semibold text-token-text">
              {t('lbGraceDays', language)}: {me.member.graceDaysUsed} / {GRACE_DAYS_MAX}
            </span>
          </div>
        </section>
      )}

      {/* Segmented control */}
      <div className="flex rounded-xl bg-token-raised p-1" role="tablist">
        {(['teams', 'global'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`tap-target flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
              tab === k ? 'bg-token-card text-token-text' : 'text-token-muted'
            }`}
          >
            {k === 'teams' ? t('tabTeams', language) : t('tabGlobal', language)}
          </button>
        ))}
      </div>

      {tab === 'teams' ? (
        <div className="space-y-3">
          {teams.map((team, idx) => {
            const open = isOpen(team.teamName, idx);
            return (
              <section key={team.teamName} className="rounded-2xl border border-token-raised bg-token-card">
                <button
                  type="button"
                  onClick={() => toggle(team.teamName, idx)}
                  aria-expanded={open}
                  className="tap-target flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-token-raised text-sm font-black text-token-text">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-token-text">
                      {tf('lbTeamOf', language, { name: team.teamName })}
                    </span>
                    <span className="block text-xs text-token-muted">
                      {t('lbConsistency', language)}: {team.avgConsistency}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-base font-black text-token-text">{team.totalXP.toLocaleString('en-US').replace(/,/g, ' ')} XP</span>
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-token-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <ul className="border-t border-token-raised px-4 pb-2">
                    {team.members.map((m) => (
                      <li
                        key={m.id}
                        className={`my-2 flex items-center gap-3 rounded-xl px-3 py-2 ${
                          m.isMe ? 'bg-token-raised ring-1 ring-token-accent' : ''
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-token-raised text-xs font-bold text-token-cat-1-text">
                          {m.nickname.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-token-text">
                          {m.nickname}
                          {m.isMe && (
                            <span className="ml-2 rounded-full bg-token-accent px-2 py-0.5 text-xs font-bold text-token-on-accent">
                              {t('myRankBadge', language)}
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-bold text-token-text">{m.weeklyXP}</span>
                        <span className="w-8 text-right text-xs text-token-muted">{m.consistencyScore}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-2">
          {globalSorted.slice(0, 8).map((m, i) => (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-2xl border bg-token-card p-3 ${
                m.isMe ? 'border-token-accent' : 'border-token-raised'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                {i < 3 ? (
                  <Trophy className={`h-5 w-5 ${MEDAL_CLASS[i]}`} aria-label={`#${i + 1}`} />
                ) : (
                  <span className="text-sm font-black text-token-muted">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-token-text">
                  {m.nickname}
                  {m.isMe && (
                    <span className="ml-2 rounded-full bg-token-accent px-2 py-0.5 text-xs font-bold text-token-on-accent">
                      {t('myRankBadge', language)}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-token-muted">{tf('lbTeamOf', language, { name: m.teamName })}</span>
              </span>
              <span className="text-sm font-black text-token-text">{m.weeklyXP} XP</span>
            </li>
          ))}
        </ul>
      )}

      {/* Info */}
      <p className="rounded-2xl bg-token-raised p-4 text-sm text-token-muted">{t('lbPrivacy', language)}</p>

      {/* Share */}
      {me && (
        <div>
          <button
            type="button"
            onClick={handleShare}
            className="tap-target flex w-full items-center justify-center gap-2 rounded-xl bg-token-accent px-4 py-3 text-sm font-bold text-token-on-accent"
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {copied ? t('shareSuccess', language) : t('shareResultBtn', language)}
          </button>
          <p className={`mt-2 text-center text-xs ${shareFailed ? 'text-token-danger' : 'text-token-muted'}`} role="status">
            {shareFailed ? t('shareFailed', language) : t('lbShareHint', language)}
          </p>
        </div>
      )}
    </div>
  );
};
