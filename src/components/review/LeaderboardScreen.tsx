import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../i18n';
import {
  MOCK_LEADERBOARD_MEMBERS,
  LeaderboardMember,
  TeamLeaderboard,
} from '../../config/mockLeaderboard';
import { Trophy, Share2, Users, User, ShieldCheck, Check, Info } from 'lucide-react';

export const LeaderboardScreen: React.FC = () => {
  const { language } = useAuth();
  const [activeTab, setActiveTab] = useState<'teams' | 'global'>('teams');
  const [copied, setCopyState] = useState<boolean>(false);
  const [loading] = useState<boolean>(false);

  // Sorted Global Members
  const sortedGlobalMembers = useMemo(() => {
    return [...MOCK_LEADERBOARD_MEMBERS].sort((a, b) => b.weeklyXP - a.weeklyXP);
  }, []);

  // Aggregated Team Stats
  const teamRankings = useMemo(() => {
    const map: { [team: string]: { totalXP: number; count: number; totalConsistency: number } } = {};

    MOCK_LEADERBOARD_MEMBERS.forEach((m) => {
      if (!map[m.teamName]) {
        map[m.teamName] = { totalXP: 0, count: 0, totalConsistency: 0 };
      }
      map[m.teamName].totalXP += m.weeklyXP;
      map[m.teamName].count += 1;
      map[m.teamName].totalConsistency += m.consistencyScore;
    });

    const teams: TeamLeaderboard[] = Object.entries(map).map(([teamName, data]) => ({
      teamName,
      totalXP: data.totalXP,
      memberCount: data.count,
      avgConsistency: Math.round(data.totalConsistency / data.count),
    }));

    return teams.sort((a, b) => b.totalXP - a.totalXP);
  }, []);

  // Current user info
  const myMemberInfo = useMemo(() => {
    const index = sortedGlobalMembers.findIndex((m) => m.isMe);
    if (index === -1) return null;
    return {
      member: sortedGlobalMembers[index],
      rank: index + 1,
    };
  }, [sortedGlobalMembers]);

  // Share result handler
  const handleShareResult = async () => {
    if (!myMemberInfo) return;
    const textCard = `🏆 Life OS Leaderboard
A'zo: ${myMemberInfo.member.nickname}
O'rin: #${myMemberInfo.rank}
Haftalik XP: ${myMemberInfo.member.weeklyXP} XP
Izchillik: ${myMemberInfo.member.consistencyScore}%`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textCard);
        setCopyState(true);
        setTimeout(() => setCopyState(false), 3000);
      }
    } catch {
      // Ignore copy error
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center space-y-4">
        <div className="h-32 rounded-2xl bg-token-raised animate-pulse" />
        <div className="h-64 rounded-2xl bg-token-raised animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:py-7 space-y-5 pb-24">
      {/* Header Banner */}
      <div className="rounded-2xl border border-token-raised bg-token-card p-5 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-token-cat-4 text-token-on-accent shrink-0">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-token-text">
                {t('leaderboardTitle', language)}
              </h1>
              <p className="text-xs text-token-muted mt-0.5">
                {t('leaderboardSubtitle', language)}
              </p>
            </div>
          </div>

          {/* Share My Result Button */}
          {myMemberInfo && (
            <button
              onClick={handleShareResult}
              className="tap-target inline-flex items-center justify-center gap-2 rounded-xl bg-token-accent text-token-on-accent px-4 py-2.5 text-xs font-bold shadow-sm active:scale-95 transition cursor-pointer shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span>{copied ? t('shareSuccess', language) : t('shareResultBtn', language)}</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="mt-5 flex items-center rounded-xl border border-token-raised bg-token-raised p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`tap-target flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'teams'
                ? 'bg-token-card text-token-text shadow-xs'
                : 'text-token-muted hover:text-token-text'
            }`}
          >
            <Users className="h-4 w-4 text-token-cat-4-text" />
            <span>{t('tabTeams', language)}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`tap-target flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'global'
                ? 'bg-token-card text-token-text shadow-xs'
                : 'text-token-muted hover:text-token-text'
            }`}
          >
            <User className="h-4 w-4 text-token-cat-2-text" />
            <span>{t('tabGlobal', language)}</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      {activeTab === 'teams' ? (
        /* TEAMS TAB */
        <div className="space-y-3">
          {teamRankings.length === 0 ? (
            <div className="rounded-2xl border border-token-raised bg-token-card p-8 text-center text-xs text-token-muted">
              {t('emptyLeaderboard', language)}
            </div>
          ) : (
            teamRankings.map((team, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={team.teamName}
                  className="rounded-2xl border border-token-raised bg-token-card p-4 flex items-center justify-between shadow-2xs transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-token-raised shrink-0 font-black text-xs text-token-text">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-token-text truncate">
                        {team.teamName}
                      </p>
                      <p className="text-[11px] text-token-muted truncate">
                        {team.memberCount} {t('totalMembers', language)} · {t('avgConsistency', language)}: {team.avgConsistency}%
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-token-cat-4-text">
                      {team.totalXP} XP
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* GLOBAL MEMBERS TAB */
        <div className="space-y-3">
          {sortedGlobalMembers.length === 0 ? (
            <div className="rounded-2xl border border-token-raised bg-token-card p-8 text-center text-xs text-token-muted">
              {t('emptyLeaderboard', language)}
            </div>
          ) : (
            sortedGlobalMembers.map((member, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={member.id}
                  className={`rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between shadow-2xs transition-colors ${
                    member.isMe
                      ? 'border-token-accent bg-token-raised'
                      : 'border-token-raised bg-token-card'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-token-raised shrink-0 font-black text-xs text-token-text">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-token-text truncate">
                          {member.nickname}
                        </span>
                        {member.isMe && (
                          <span className="rounded-md bg-token-accent text-token-on-accent px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                            {t('myRankBadge', language)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-token-muted truncate">
                        {member.teamName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div className="hidden sm:block">
                      <p className="text-[11px] font-semibold text-token-muted">
                        {t('consistencyCol', language)}: {member.consistencyScore}%
                      </p>
                      <p className="text-[10px] text-token-muted flex items-center justify-end gap-1">
                        <ShieldCheck className="h-3 w-3 text-token-accent" />
                        <span>{member.graceDaysLeft}/2 {t('graceDaysLeft', language)}</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-black text-token-cat-4-text">
                        {member.weeklyXP} XP
                      </p>
                      <span className="text-[10px] font-bold text-token-muted sm:hidden">
                        {member.consistencyScore}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Rules & Info Footnote */}
      <div className="rounded-2xl border border-token-raised bg-token-card p-4 flex items-start gap-2.5 text-xs text-token-muted">
        <Info className="h-4 w-4 text-token-cat-4-text shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t('leaderboardRuleNote', language)}
        </p>
      </div>
    </div>
  );
};
