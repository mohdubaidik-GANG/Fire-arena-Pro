import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Coins,
  ArrowDownCircle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  PlusCircle,
  CreditCard,
  History,
  ShieldCheck,
  Receipt,
  ExternalLink
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { DepositRequest, WithdrawalRequest, Tournament } from '../types';

interface WalletAndCareerStatsProps {
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  className?: string;
}

export const WalletAndCareerStats: React.FC<WalletAndCareerStatsProps> = ({
  onOpenDeposit,
  onOpenWithdraw,
  className = '',
}) => {
  const { user, profile } = useAuth();

  // History tab toggle: 'all' | 'deposits' | 'withdrawals'
  const [historyTab, setHistoryTab] = useState<'all' | 'deposits' | 'withdrawals'>('all');

  // Realtime Lists
  const [myDeposits, setMyDeposits] = useState<DepositRequest[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Listen to user's deposit & withdrawal requests in realtime
  useEffect(() => {
    if (!user) return;

    setLoadingHistory(true);

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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const depositBal = Number(profile?.depositBalance || 0);
  const winningsBal = Number(profile?.winningsBalance || 0);
  const totalBalance = depositBal + winningsBal;

  // Calculate total fulfilled payouts
  const totalPayouts = myWithdrawals
    .filter((w) => w.status === 'approved')
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  // Calculate estimated total earnings
  const totalEarnings = winningsBal + totalPayouts;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* =========================================================================
          1. WALLET SCREEN: DEEP INDIGO / DARK PURPLE / CRIMSON CARD CONTAINER
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1c0f38] via-[#120a28] to-[#250d28] border border-purple-500/30 p-5 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(139,92,246,0.15)]">
        {/* Ambient backlight glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Row: Total Balance Headline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-purple-300 uppercase block mb-1">
                TOTAL BALANCE
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-4xl text-amber-400">🪙</span>
                <span className="text-3xl sm:text-5xl font-black font-mono text-white tracking-tight tabular-nums">
                  {totalBalance.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-slate-400 self-end mb-1">Coins</span>
              </div>
            </div>

            {/* Quick Actions (Add Coins & Redeem Coins) */}
            <div className="flex items-center gap-2.5 sm:self-center">
              <button
                onClick={onOpenDeposit}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>ADD COINS</span>
              </button>

              <button
                onClick={onOpenWithdraw}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>REDEEM COINS</span>
              </button>
            </div>
          </div>

          {/* 4-Item Breakdown Grid: Deposited | Winning | Earnings | PAYOUTS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-purple-900/50">
            <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
              <span className="text-[10px] text-purple-300 uppercase font-mono block mb-1">Deposited</span>
              <div className="text-lg font-black font-mono text-white tabular-nums">
                🪙 {depositBal.toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Match Entry</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-mono block mb-1">Winning</span>
              <div className="text-lg font-black font-mono text-emerald-400 tabular-nums">
                🪙 {winningsBal.toFixed(2)}
              </div>
              <span className="text-[9px] text-emerald-400/80 font-mono">100% Redeemable</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
              <span className="text-[10px] text-amber-400 uppercase font-mono block mb-1">Earnings</span>
              <div className="text-lg font-black font-mono text-amber-400 tabular-nums">
                🪙 {totalEarnings.toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Lifetime Won</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 text-center">
              <span className="text-[10px] text-rose-400 uppercase font-mono block mb-1">PAYOUTS</span>
              <div className="text-lg font-black font-mono text-rose-400 tabular-nums">
                🪙 {totalPayouts.toFixed(2)}
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Withdrawn</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. WALLET HISTORY SECTION
         ========================================================================= */}
      <div className="rounded-2xl bg-[#090a12] border border-red-950/70 p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-950/50 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-bold text-white font-heading tracking-wide">
              WALLET HISTORY
            </h3>
          </div>

          <div className="flex items-center gap-1 p-1 bg-black/60 rounded-xl border border-red-950/60 self-start">
            <button
              onClick={() => setHistoryTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                historyTab === 'all'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setHistoryTab('deposits')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                historyTab === 'deposits'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Deposits ({myDeposits.length})
            </button>
            <button
              onClick={() => setHistoryTab('withdrawals')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                historyTab === 'withdrawals'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Redeems ({myWithdrawals.length})
            </button>
          </div>
        </div>

        {/* Combined Transactions Feed */}
        {loadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading recent transactions...
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Deposits List */}
            {(historyTab === 'all' || historyTab === 'deposits') &&
              myDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="p-3.5 rounded-xl bg-[#0c0d18] border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <ArrowDownCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Deposit via UPI</span>
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                            dep.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : dep.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        UTR: {dep.utrNumber} · {new Date(dep.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-400 block">
                      +🪙 {dep.amount}
                    </span>
                  </div>
                </div>
              ))}

            {/* Withdrawals List */}
            {(historyTab === 'all' || historyTab === 'withdrawals') &&
              myWithdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl bg-[#0c0d18] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {(w.method === 'redeem_code' || w.payoutMethod === 'REDEEM_CODE') ? 'Play Redeem Code' : 'UPI Transfer'}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                            w.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : w.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {(w.method === 'redeem_code' || w.payoutMethod === 'REDEEM_CODE')
                          ? `Email: ${w.deliveryEmail || user?.email}`
                          : `UPI: ${w.upiId}`} · {new Date(w.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {/* Redeem code reveal if approved */}
                    {w.redeemCode && w.status === 'approved' && (
                      <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-lg border border-red-500/30">
                        <code className="text-amber-400 font-mono text-[11px] font-bold select-all">
                          {w.redeemCode}
                        </code>
                        <button
                          onClick={() => handleCopy(w.redeemCode!, w.id)}
                          className="p-1 hover:text-white text-slate-400 cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedId === w.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                    <span className="text-base font-black font-mono text-rose-400">
                      -🪙 {w.amount}
                    </span>
                  </div>
                </div>
              ))}

            {myDeposits.length === 0 && myWithdrawals.length === 0 && (
              <div className="p-8 rounded-xl bg-black/30 border border-slate-900 text-center text-xs text-slate-500">
                No wallet transactions yet. Add coins or join tournaments to earn real coins!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
