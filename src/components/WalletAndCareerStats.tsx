import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Coins,
  ArrowDownCircle,
  ArrowUpRight,
  Trophy,
  Target,
  Crosshair,
  Crown,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { DepositRequest, WithdrawalRequest, Tournament } from '../types';

interface WalletAndCareerStatsProps {
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  className?: string;
}

interface CareerStats {
  matchesPlayed: number;
  tournamentsWon: number;
  totalKills: number;
  totalEarnings: number;
}

export const WalletAndCareerStats: React.FC<WalletAndCareerStatsProps> = ({
  onOpenDeposit,
  onOpenWithdraw,
  className = '',
}) => {
  const { user, profile } = useAuth();

  // History tab toggle: 'deposit' | 'withdrawal'
  const [historyTab, setHistoryTab] = useState<'deposit' | 'withdrawal'>('deposit');

  // Realtime Lists
  const [myDeposits, setMyDeposits] = useState<DepositRequest[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  // Career Stats
  const [stats, setStats] = useState<CareerStats>({
    matchesPlayed: 0,
    tournamentsWon: 0,
    totalKills: 0,
    totalEarnings: 0,
  });

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 1. Listen to user's deposit & withdrawal requests in realtime
  useEffect(() => {
    if (!user) return;

    setLoadingHistory(true);

    // Deposit Requests query
    const qDep = query(
      collection(db, 'depositRequests'),
      where('userId', '==', user.uid)
    );
    const unsubDeposits = onSnapshot(
      qDep,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DepositRequest));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyDeposits(list);
        setLoadingHistory(false);
      },
      (err) => {
        console.error('Error fetching deposit history:', err);
        setLoadingHistory(false);
      }
    );

    // Withdrawal Requests query
    const qWith = query(
      collection(db, 'withdrawalRequests'),
      where('userId', '==', user.uid)
    );
    const unsubWithdrawals = onSnapshot(
      qWith,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WithdrawalRequest));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyWithdrawals(list);
      },
      (err) => {
        console.error('Error fetching withdrawal history:', err);
      }
    );

    return () => {
      unsubDeposits();
      unsubWithdrawals();
    };
  }, [user]);

  // 2. Realtime Career Stats Calculation from tournaments & match results
  useEffect(() => {
    if (!user) return;

    const unsubTournaments = onSnapshot(
      collection(db, 'tournaments'),
      async (snapshot) => {
        const allTournaments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));

        let playedCount = 0;
        let wonCount = 0;
        let killsCount = 0;
        let earningsSum = 0;

        // Check winners & registrations
        for (const tour of allTournaments) {
          // If tournament has declared results
          if (tour.results?.winners && Array.isArray(tour.results.winners)) {
            const userWin = tour.results.winners.find((w) => w.userId === user.uid);
            if (userWin) {
              playedCount++;
              killsCount += Number(userWin.kills) || 0;
              earningsSum += Number(userWin.prizeWon) || 0;
              if (userWin.rank === 1) {
                wonCount++;
              }
            }
          }
        }

        // Also check how many tournaments user currently has registered in
        try {
          const regPromises = allTournaments.map(async (t) => {
            const regRef = collection(db, `tournaments/${t.id}/registrations`);
            const q = query(regRef, where('userId', '==', user.uid));
            const snap = await getDocs(q);
            return snap.empty ? 0 : 1;
          });
          const regResults: number[] = await Promise.all(regPromises);
          const totalRegistered = regResults.reduce((acc: number, curr: number) => acc + curr, 0);

          setStats({
            matchesPlayed: Math.max(playedCount, totalRegistered),
            tournamentsWon: wonCount,
            totalKills: killsCount,
            totalEarnings: Math.max(earningsSum, (profile?.winningsBalance || 0)),
          });
        } catch {
          setStats({
            matchesPlayed: playedCount,
            tournamentsWon: wonCount,
            totalKills: killsCount,
            totalEarnings: Math.max(earningsSum, (profile?.winningsBalance || 0)),
          });
        }
      },
      (err) => {
        console.warn('Error calculating stats:', err);
      }
    );

    return () => unsubTournaments();
  }, [user, profile?.winningsBalance]);

  // Copy handler with toast
  const handleCopy = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopyToast(`${label} copied to clipboard!`);
    setTimeout(() => {
      setCopiedId(null);
      setCopyToast(null);
    }, 2500);
  };

  // Date and Time formatting
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const depositBal = profile?.depositBalance ?? 0;
  const winningsBal = profile?.winningsBalance ?? 0;
  const totalBalance = depositBal + winningsBal;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* =========================================================================
          1. ZEST ACCOUNT TOTAL BALANCE CARD (TOP HERO)
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121224] via-[#0d0d18] to-[#151226] border border-amber-500/40 p-5 sm:p-7 shadow-2xl">
        {/* Cyber Neon Ambient Glow Background */}
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left Balance Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block" />
              <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-amber-400">
                ZEST ACCOUNT TOTAL BALANCE
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Active
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black shadow-lg shadow-amber-500/30 shrink-0">
                <Coins className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white tabular-nums">
                  ₹{totalBalance.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Combined Wallet: Deposit (₹{depositBal}) + Winnings (₹{winningsBal})
                </p>
              </div>
            </div>
          </div>

          {/* Quick Info Chip */}
          <div className="flex flex-col sm:items-end justify-center text-xs text-slate-400 space-y-1 bg-black/40 border border-slate-800 p-3 rounded-xl backdrop-blur-sm self-start md:self-center">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Free Fire MAX Competitive Arena</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Player IGN: <strong className="text-amber-400">{profile?.ign || 'Gamer'}</strong>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              UID: {profile?.freeFireUid || '—'}
            </div>
          </div>
        </div>

        {/* =========================================================================
            DUAL WALLET SIDE-BY-SIDE NEON CARDS
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
          {/* Card A: DEPOSIT CASH */}
          <div className="relative overflow-hidden rounded-xl bg-[#090912]/90 border border-amber-500/30 p-4 hover:border-amber-500/60 transition-all shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ArrowDownCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold font-mono tracking-wider text-amber-400 uppercase">
                  DEPOSIT CASH
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Match Entry
              </span>
            </div>

            <div className="my-1.5">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">
                ₹{depositBal.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Non-withdrawable · Used to pay entry fees for solo & squad tournaments.
              </p>
            </div>
          </div>

          {/* Card B: WINNINGS CASH */}
          <div className="relative overflow-hidden rounded-xl bg-[#07130f]/90 border border-emerald-500/40 p-4 hover:border-emerald-500/70 transition-all shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold font-mono tracking-wider text-emerald-400 uppercase">
                  WINNINGS CASH
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                100% Withdrawable
              </span>
            </div>

            <div className="my-1.5">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 tabular-nums">
                ₹{winningsBal.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Earned from Kills & Booyah · Instant payout via UPI or Google Play code.
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TWO LARGE SLEEK ACTION BUTTONS
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-5">
          <button
            onClick={onOpenDeposit}
            className="h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <ArrowDownCircle className="w-5 h-5 stroke-[2.5]" />
            <span className="tracking-wide uppercase font-heading">ADD MONEY / DEPOSIT</span>
          </button>

          <button
            onClick={onOpenWithdraw}
            className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            <span className="tracking-wide uppercase font-heading">WITHDRAW WINNINGS</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. CAREER STATS SECTION: "TOURNAMENT CAREER STATS" GRID
         ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-extrabold font-heading text-white uppercase tracking-wider">
              TOURNAMENT CAREER STATS
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Realtime Match Sync</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Stat 1: Matches Played */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Matches Played
              </span>
              <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Crosshair className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-white tabular-nums">
              {stats.matchesPlayed}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Tournaments Entered</p>
          </div>

          {/* Stat 2: Tournaments Won (Booyahs) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Tournaments Won
              </span>
              <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400 tabular-nums">
              {stats.tournamentsWon}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Rank #1 Booyah Finishes</p>
          </div>

          {/* Stat 3: Total Kills */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-red-500/20 hover:border-red-500/40 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                Total Kills
              </span>
              <div className="w-6 h-6 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center">
                <Target className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-red-400 tabular-nums">
              {stats.totalKills}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Official In-Game Frags</p>
          </div>

          {/* Stat 4: Total Earnings */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Total Earnings
              </span>
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
              ₹{stats.totalEarnings.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Total Prize Cash Won</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. COMPLETE TRANSACTION HISTORY SECTION
         ========================================================================= */}
      <div className="rounded-2xl bg-[#0c0c16] border border-slate-800 overflow-hidden shadow-xl">
        {/* History Header & Toggle Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0f0f1c] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-heading uppercase tracking-wide">
              Transaction History
            </h3>
          </div>

          {/* Toggle Tabs: [ Deposit History ] vs [ Withdrawal History ] */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setHistoryTab('deposit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                historyTab === 'deposit'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Deposit History</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/30">
                {myDeposits.length}
              </span>
            </button>

            <button
              onClick={() => setHistoryTab('withdrawal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                historyTab === 'withdrawal'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdrawal History</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/30">
                {myWithdrawals.length}
              </span>
            </button>
          </div>
        </div>

        {/* History Content */}
        <div className="p-4 sm:p-5">
          {loadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Loading your transaction records...
            </div>
          ) : historyTab === 'deposit' ? (
            /* ==================== DEPOSIT HISTORY LIST ==================== */
            myDeposits.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <ArrowDownCircle className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">No deposit history yet</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Add cash using your PhonePe, Google Pay, or Paytm UPI app to register for upcoming matches.
                </p>
                <button
                  onClick={onOpenDeposit}
                  className="mt-2 px-3.5 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs cursor-pointer hover:bg-amber-400 transition-colors"
                >
                  Deposit Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myDeposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-3.5 sm:p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                          <ArrowDownCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg font-black font-mono text-white tabular-nums">
                              ₹{dep.amount}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              UPI Deposit
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDateTime(dep.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {dep.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approved / Success</span>
                          </span>
                        )}
                        {dep.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Admin Review</span>
                          </span>
                        )}
                        {dep.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* UTR Reference Row */}
                    <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                        <span>12-digit UTR:</span>
                        <code className="text-amber-300 font-bold bg-black/40 px-2 py-0.5 rounded select-all">
                          {dep.utrNumber}
                        </code>
                        <button
                          onClick={() => handleCopy(dep.utrNumber, dep.id, 'UTR Number')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy UTR Reference"
                        >
                          {copiedId === dep.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {dep.adminNote && (
                        <div className="text-[11px] text-amber-400/90 italic">
                          Admin note: {dep.adminNote}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* ==================== WITHDRAWAL HISTORY LIST ==================== */
            myWithdrawals.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <ArrowUpRight className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">No withdrawal history yet</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Play Free Fire MAX matches, bag kills & Booyahs to earn withdrawable cash.
                </p>
                <button
                  onClick={onOpenWithdraw}
                  className="mt-2 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs cursor-pointer hover:bg-emerald-400 transition-colors"
                >
                  Withdraw Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 sm:p-4 rounded-xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg font-black font-mono text-emerald-400 tabular-nums">
                              ₹{w.amount}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {w.method === 'upi' ? 'UPI Payout' : 'Play Redeem Code'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDateTime(w.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {w.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Completed / Paid</span>
                          </span>
                        )}
                        {w.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Under Process</span>
                          </span>
                        )}
                        {w.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Declined</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Method details & UPI VPA */}
                    {w.method === 'upi' && w.upiId && (
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                        <span>Receiver UPI ID:</span>
                        <span className="text-white font-semibold">{w.upiId}</span>
                      </div>
                    )}

                    {/* If Bank Payout UTR is available */}
                    {w.payoutUtr && (
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-black/30 p-2 rounded-lg">
                        <span className="text-emerald-400 font-semibold">Bank UTR Reference:</span>
                        <code className="text-white font-bold select-all">{w.payoutUtr}</code>
                        <button
                          onClick={() => handleCopy(w.payoutUtr!, w.id, 'Payout UTR')}
                          className="ml-auto p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedId === w.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    {/* If Google Play Redeem Code voucher was issued */}
                    {w.redeemCode && (
                      <div className="p-3 bg-gradient-to-r from-amber-500/10 via-black/80 to-amber-500/10 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                            <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider">
                              Google Play Redeem Code
                            </span>
                          </div>
                          <code className="text-base sm:text-lg font-mono font-extrabold text-white tracking-wider select-all block">
                            {w.redeemCode}
                          </code>
                        </div>

                        <button
                          onClick={() => handleCopy(w.redeemCode!, w.id, 'Google Play Code')}
                          className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
                        >
                          {copiedId === w.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === w.id ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                      </div>
                    )}

                    {w.adminNote && (
                      <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                        Note: {w.adminNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
