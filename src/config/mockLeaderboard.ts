// MOCK DATA, Firestore'ga ulanmagan

export interface LeaderboardMember {
  id: string;
  nickname: string;
  teamName: string;
  weeklyXP: number;
  consistencyScore: number; // 0-100
  graceDaysLeft: number; // e.g. 2 out of 2
  isMe?: boolean;
}

export interface TeamLeaderboard {
  teamName: string;
  totalXP: number;
  memberCount: number;
  avgConsistency: number;
}

export const MOCK_LEADERBOARD_MEMBERS: LeaderboardMember[] = [
  // Team Alpha
  { id: '1', nickname: 'CyberFalcon', teamName: 'Alpha Vanguard', weeklyXP: 680, consistencyScore: 98, graceDaysLeft: 2 },
  { id: '2', nickname: 'ZenCoder', teamName: 'Alpha Vanguard', weeklyXP: 610, consistencyScore: 92, graceDaysLeft: 2 },
  { id: '3', nickname: 'Sardor_Dev', teamName: 'Alpha Vanguard', weeklyXP: 550, consistencyScore: 88, graceDaysLeft: 1, isMe: true },
  { id: '4', nickname: 'ApexNinja', teamName: 'Alpha Vanguard', weeklyXP: 490, consistencyScore: 82, graceDaysLeft: 2 },
  { id: '5', nickname: 'NovaSpark', teamName: 'Alpha Vanguard', weeklyXP: 420, consistencyScore: 75, graceDaysLeft: 1 },

  // Team Beta
  { id: '6', nickname: 'ByteMaster', teamName: 'Beta Titans', weeklyXP: 650, consistencyScore: 95, graceDaysLeft: 2 },
  { id: '7', nickname: 'ShadowCoder', teamName: 'Beta Titans', weeklyXP: 580, consistencyScore: 90, graceDaysLeft: 2 },
  { id: '8', nickname: 'PixelHero', teamName: 'Beta Titans', weeklyXP: 510, consistencyScore: 85, graceDaysLeft: 1 },
  { id: '9', nickname: 'DataRunner', teamName: 'Beta Titans', weeklyXP: 460, consistencyScore: 80, graceDaysLeft: 2 },
  { id: '10', nickname: 'CodeKnight', teamName: 'Beta Titans', weeklyXP: 390, consistencyScore: 70, graceDaysLeft: 0 },

  // Team Gamma
  { id: '11', nickname: 'EchoPhoenix', teamName: 'Gamma Wolves', weeklyXP: 620, consistencyScore: 94, graceDaysLeft: 2 },
  { id: '12', nickname: 'VortexMind', teamName: 'Gamma Wolves', weeklyXP: 540, consistencyScore: 86, graceDaysLeft: 2 },
  { id: '13', nickname: 'QuantumLearner', teamName: 'Gamma Wolves', weeklyXP: 480, consistencyScore: 81, graceDaysLeft: 1 },
  { id: '14', nickname: 'AstroDev', teamName: 'Gamma Wolves', weeklyXP: 430, consistencyScore: 76, graceDaysLeft: 2 },
  { id: '15', nickname: 'HyperLoop', teamName: 'Gamma Wolves', weeklyXP: 360, consistencyScore: 68, graceDaysLeft: 0 },

  // Team Delta
  { id: '16', nickname: 'IronFocus', teamName: 'Delta Strikers', weeklyXP: 590, consistencyScore: 91, graceDaysLeft: 2 },
  { id: '17', nickname: 'PulseRider', teamName: 'Delta Strikers', weeklyXP: 520, consistencyScore: 84, graceDaysLeft: 1 },
  { id: '18', nickname: 'LogicCraft', teamName: 'Delta Strikers', weeklyXP: 450, consistencyScore: 78, graceDaysLeft: 2 },
  { id: '19', nickname: 'ChronoSeeker', teamName: 'Delta Strikers', weeklyXP: 400, consistencyScore: 72, graceDaysLeft: 1 },
  { id: '20', nickname: 'SolarWind', teamName: 'Delta Strikers', weeklyXP: 330, consistencyScore: 65, graceDaysLeft: 0 },
];
