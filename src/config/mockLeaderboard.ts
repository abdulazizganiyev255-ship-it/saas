// MOCK DATA, not connected to Firestore. Real data comes from the leaderboard backend (Group 6).
// Anti-cheat and aggregation must run server-side (serverless + Admin SDK), never in the client.

export interface LeaderboardMember {
  id: string;
  nickname: string;
  teamName: string;
  weeklyXP: number;
  consistencyScore: number; // 0-100
  graceDaysUsed: number; // out of 2 per week
  isMe?: boolean;
}

export interface TeamLeaderboard {
  teamName: string;
  totalXP: number;
  memberCount: number;
  avgConsistency: number;
}

export const MOCK_LEADERBOARD_MEMBERS: LeaderboardMember[] = [
  { id: '1', nickname: 'Sardor_K', teamName: "Olov", weeklyXP: 670, consistencyScore: 81, graceDaysUsed: 1 },
  { id: '2', nickname: 'Aziz_07', teamName: "Olov", weeklyXP: 640, consistencyScore: 72, graceDaysUsed: 1, isMe: true },
  { id: '3', nickname: 'Madina', teamName: "Olov", weeklyXP: 590, consistencyScore: 77, graceDaysUsed: 0 },
  { id: '4', nickname: 'Jasur_dev', teamName: "Olov", weeklyXP: 520, consistencyScore: 70, graceDaysUsed: 1 },
  { id: '5', nickname: 'Nigora', teamName: "Olov", weeklyXP: 460, consistencyScore: 66, graceDaysUsed: 2 },
  { id: '6', nickname: 'Dilshod_X', teamName: "Daryo", weeklyXP: 710, consistencyScore: 78, graceDaysUsed: 0 },
  { id: '7', nickname: 'Zilola', teamName: "Daryo", weeklyXP: 540, consistencyScore: 70, graceDaysUsed: 1 },
  { id: '8', nickname: 'Bekzod', teamName: "Daryo", weeklyXP: 480, consistencyScore: 68, graceDaysUsed: 2 },
  { id: '9', nickname: 'Malika', teamName: "Daryo", weeklyXP: 470, consistencyScore: 69, graceDaysUsed: 0 },
  { id: '10', nickname: 'Rustam', teamName: "Daryo", weeklyXP: 440, consistencyScore: 65, graceDaysUsed: 1 },
  { id: '11', nickname: 'Kamola', teamName: "Tog'", weeklyXP: 690, consistencyScore: 74, graceDaysUsed: 2 },
  { id: '12', nickname: 'Ulugbek', teamName: "Tog'", weeklyXP: 510, consistencyScore: 68, graceDaysUsed: 0 },
  { id: '13', nickname: 'Shahlo', teamName: "Tog'", weeklyXP: 480, consistencyScore: 66, graceDaysUsed: 1 },
  { id: '14', nickname: 'Farhod', teamName: "Tog'", weeklyXP: 450, consistencyScore: 67, graceDaysUsed: 2 },
  { id: '15', nickname: 'Dildora', teamName: "Tog'", weeklyXP: 380, consistencyScore: 65, graceDaysUsed: 0 },
  { id: '16', nickname: 'Otabek', teamName: "Yulduz", weeklyXP: 560, consistencyScore: 66, graceDaysUsed: 1 },
  { id: '17', nickname: 'Laylo', teamName: "Yulduz", weeklyXP: 470, consistencyScore: 64, graceDaysUsed: 2 },
  { id: '18', nickname: 'Sherzod', teamName: "Yulduz", weeklyXP: 440, consistencyScore: 62, graceDaysUsed: 0 },
  { id: '19', nickname: 'Gulnora', teamName: "Yulduz", weeklyXP: 420, consistencyScore: 65, graceDaysUsed: 1 },
  { id: '20', nickname: 'Anvar', teamName: "Yulduz", weeklyXP: 400, consistencyScore: 63, graceDaysUsed: 2 },
];
