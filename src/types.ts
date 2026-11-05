export interface UserProfile {
  uid: string;
  email: string;
  ign: string; // Free Fire In-Game Name
  freeFireUid: string; // Free Fire numeric UID
  phone?: string;
  password?: string;
  role?: string;
  totalKills?: number;
  matchesPlayed?: number;
  tournamentsWon?: number;
  depositBalance: number;
  winningBalance?: number;
  winningsBalance: number;
  referralCode?: string;
  referredBy?: string | null;
  totalReferrals?: number;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TournamentCategory =
  | 'all'
  | 'FULL MAP'
  | 'FULL MAP 2'
  | 'CS HEAD'
  | 'LW 1V1'
  | 'LW 2V2'
  | 'CS 1V1'
  | 'CS 2V2'
  | 'LW HEAD'
  | 'LW LOSS'
  | 'LW ₹10'
  | 'NIGHT MODE'
  | 'FREE MATCH'
  | 'battle_royale'
  | 'clash_squad_1v1'
  | 'clash_squad_4v4'
  | string;
export type TournamentMode = 'Solo' | 'Duo' | 'Squad';
export type TournamentStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

export interface JoinedPlayer {
  uid: string;
  ign: string;
  email?: string;
  joinedAt?: string;
}

export interface Tournament {
  id: string;
  title: string;
  category: TournamentCategory;
  mode: TournamentMode;
  map: string; // Bermuda, Purgatory, Kalahari, Alpine
  entryFee: number;
  totalPrizePool: number;
  perKillReward: number;
  rank1Prize: number;
  rank2Prize: number;
  rank3Prize: number;
  maxSlots: number;
  registeredCount: number;
  joinedPlayers?: JoinedPlayer[];
  startTime: string; // ISO string
  status: TournamentStatus;
  roomId?: string;
  roomPassword?: string;
  roomUnlockedAt?: string;
  createdAt: string;
  updatedAt: string;
  results?: {
    declaredAt: string;
    winners: {
      rank: number;
      userId: string;
      ign: string;
      kills: number;
      prizeWon: number;
    }[];
  };
}

export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  userId: string;
  userEmail: string;
  userIgn: string;
  userFreeFireUid: string;
  slotNumber: number;
  entryFeePaid: number;
  registeredAt: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userEmail: string;
  userIgn: string;
  amount: number;
  utrNumber?: string; // 12-digit UPI reference number
  orderId?: string;
  gateway?: string;
  proofUrl?: string; // payment screenshot or receipt note
  status: 'pending' | 'approved' | 'rejected' | 'COMPLETED';
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userIgn: string;
  amount: number;
  method: 'upi' | 'redeem_code';
  payoutMethod?: string;
  upiId?: string;
  deliveryEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  payoutUtr?: string;
  redeemCode?: string;
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
}

export interface AdminSettings {
  upiId: string; // e.g. "firearenapay@okaxis"
  upiName: string; // e.g. "FireArena MAX Esports"
  qrCodeUrl: string; // Dynamic or custom QR URL
  supportWhatsapp: string;
  minDeposit: number;
  minWithdrawal: number;
  rules: string;
  updatedAt?: string;
}

export const SUPER_ADMIN_EMAILS = [
  'ubedmo650@gmail.com',
  'ubada900593@gmail.com',
  'mohdubaid.ik@gmail.com'
];
