import React from 'react';
import {
  X,
  ShieldAlert,
  Trophy,
  Target,
  Clock,
  Calendar,
  Users,
  AlertTriangle,
  Zap,
  ShieldCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Tournament } from '../types';
import { useAuth } from '../context/AuthContext';

interface MatchRulesModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onJoinClick?: (tournament: Tournament) => void;
}

export const MatchRulesModal: React.FC<MatchRulesModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onJoinClick,
}) => {
  const { user } = useAuth();

  if (!isOpen || !tournament) return null;

  const currentJoined = tournament.joinedPlayers ? tournament.joinedPlayers.length : 0;
  const isJoined = Boolean(user?.uid && tournament.joinedPlayers?.some((p) => p.uid === user.uid));
  const isFull = currentJoined >= tournament.maxSlots;
  const isLive = tournament.status?.toLowerCase() === 'live';
  const isCompleted = tournament.status?.toLowerCase() === 'completed';

  const startDate = new Date(tournament.startTime);
  const formattedTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = startDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const perKill = tournament.perKillReward || (tournament as any).perKill || 0;
  const rank1 = tournament.rank1Prize || (tournament as any).rank1 || 0;
  const rank2 = tournament.rank2Prize || (tournament as any).rank2 || 0;
  const pool = tournament.totalPrizePool || (tournament as any).totalPool || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0b0e14] border border-amber-500/40 rounded-2xl shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-[#121222] via-[#0f0f1c] to-[#0c0c16] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-heading truncate max-w-[240px] sm:max-w-xs">
                  {tournament.title}
                </h3>
              </div>
              <p className="text-[11px] text-amber-400 font-mono">
                Official Free Fire MAX Esports Rules & Prize Breakdown
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Match Overview Grid */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Match Overview
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Category</span>
                <span className="text-xs font-bold text-white uppercase">{tournament.category.replace('_', ' ')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Mode / Map</span>
                <span className="text-xs font-bold text-amber-400">{tournament.mode} · {tournament.map}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Start Time</span>
                <span className="text-xs font-bold text-white font-mono">{formattedTime}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Slots Booked</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {currentJoined} / {tournament.maxSlots}
                </span>
              </div>
            </div>
          </div>

          {/* Prize Breakdown Section */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Prize Breakdown
            </span>
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-orange-500/10 border border-amber-500/20 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Entry Fee</span>
                  <span className="font-mono font-bold text-white text-sm">₹{tournament.entryFee}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Per Kill Reward</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">₹{perKill}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Rank 1 (Booyah)</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">₹{rank1}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Rank 2 Prize</span>
                  <span className="font-mono font-bold text-teal-400 text-sm">₹{rank2}</span>
                </div>
              </div>
              {pool > 0 && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Total Prize Pool</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">₹{pool}</span>
                </div>
              )}
            </div>
          </div>

          {/* Strict Esports Rules Box */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                Strict Esports Tournament Rules
              </span>
            </div>

            <div className="space-y-2 bg-[#06080d] p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  1
                </span>
                <p className="leading-relaxed">
                  <strong className="text-red-400">Emote spamming / Hack / Script:</strong> Game ke dauran kisi bhi tarah ke hacks, config files, mod apk, ya offensive emote spamming par direct account ban aur zero refund hoga.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  2
                </span>
                <p className="leading-relaxed">
                  <strong className="text-amber-400">Room ID & Password Release:</strong> Match start hone se theek 10-15 minute pehle Custom Room ID aur Password aapke match card par live show ho jayega.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  3
                </span>
                <p className="leading-relaxed">
                  <strong className="text-blue-400">Result Screenshot Proof:</strong> Match khatam hote hi final kill aur rank ka clear screenshot platform support / WhatsApp par bhejna anivarya hai.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  4
                </span>
                <p className="leading-relaxed">
                  <strong className="text-orange-400">Slot Discipline:</strong> Custom room me kisi dusre player ke assigned slot par baithne par bina warning ke kick kar diya jayega.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#080b12] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer transition-colors"
          >
            Close Rules
          </button>

          {isJoined ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span>Already Registered for Match</span>
            </div>
          ) : isCompleted ? (
            <span className="text-xs text-slate-500 font-semibold px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
              Match Concluded
            </span>
          ) : isFull ? (
            <span className="text-xs text-red-400 font-semibold px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
              Slots Full
            </span>
          ) : onJoinClick ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onJoinClick(tournament);
              }}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Join Match · ₹{tournament.entryFee}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
