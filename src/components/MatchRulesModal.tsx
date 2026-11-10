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
  FileText,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { sound } from '../utils/audio';
import { Tournament } from '../types';
import { useAuth } from '../context/AuthContext';

interface MatchRulesModalProps {
  tournament?: Tournament | null;
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
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const currentJoined = tournament?.joinedPlayers ? tournament.joinedPlayers.length : 0;
  const isJoined = Boolean(user?.uid && tournament?.joinedPlayers?.some((p) => p.uid === user.uid));
  const isFull = tournament ? currentJoined >= tournament.maxSlots : false;

  const startDate = tournament ? new Date(tournament.startTime) : new Date();
  const formattedTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const perKill = tournament?.perKillReward || (tournament as any)?.perKill || 0;
  const rank1 = tournament?.rank1Prize || (tournament as any)?.rank1 || 0;
  const rank2 = tournament?.rank2Prize || (tournament as any)?.rank2 || 0;
  const pool = tournament?.totalPrizePool || (tournament as any)?.totalPool || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#090a14] border border-red-950/80 rounded-2xl shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-red-950/60 bg-[#0e0c18] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-400">
              <FileText className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-heading truncate max-w-[240px] sm:max-w-xs">
                  {tournament ? tournament.title : 'Fire Arena Pro Esports Rules & Guidelines'}
                </h3>
              </div>
              <p className="text-[11px] text-red-400 font-mono">
                Official Free Fire MAX Fair Play & Room Regulations
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
          {/* Room ID & Password Box (If Released / Available) */}
          {tournament && (tournament.roomId || tournament.roomPassword) && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 via-black/80 to-amber-950/30 border border-red-500/50 shadow-lg shadow-red-950/30 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Custom Room Credentials
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  ROOM READY
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Room ID Box */}
                <div className="bg-black/70 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Room ID</span>
                    <span className="text-sm font-bold text-amber-400 font-mono tracking-wider truncate block">
                      {tournament.roomId || 'PENDING'}
                    </span>
                  </div>
                  {tournament.roomId && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tournament.roomId || '');
                        sound.playCopy();
                        setCopiedField('room_id');
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedField === 'room_id' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Password Box */}
                <div className="bg-black/70 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Password</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono tracking-wider truncate block">
                      {tournament.roomPassword || 'PENDING'}
                    </span>
                  </div>
                  {tournament.roomPassword && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tournament.roomPassword || '');
                        sound.playCopy();
                        setCopiedField('room_pwd');
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedField === 'room_pwd' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Match Overview Grid (If tournament provided) */}
          {tournament && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
                Match Overview
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-black/50 border border-red-950/50">
                  <span className="text-[10px] text-slate-500 block">Category</span>
                  <span className="text-xs font-bold text-white uppercase">{tournament.category.replace('_', ' ')}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/50 border border-red-950/50">
                  <span className="text-[10px] text-slate-500 block">Mode / Map</span>
                  <span className="text-xs font-bold text-red-400">{tournament.mode} · {tournament.map}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/50 border border-red-950/50">
                  <span className="text-[10px] text-slate-500 block">Start Time</span>
                  <span className="text-xs font-bold text-white font-mono">{formattedTime}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/50 border border-red-950/50">
                  <span className="text-[10px] text-slate-500 block">Slots Booked</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {currentJoined} / {tournament.maxSlots}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Prize Breakdown Section */}
          {tournament && (
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-semibold">
                Coin & Prize Distribution
              </span>
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-black/50 border border-red-950/50 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Pool</span>
                  <span className="text-sm font-bold text-emerald-400">🪙 {pool}</span>
                </div>
                <div className="border-x border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Per Kill</span>
                  <span className="text-sm font-bold text-amber-400">🪙 {perKill}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Rank 1 Prize</span>
                  <span className="text-sm font-bold text-white">🪙 {rank1}</span>
                </div>
              </div>
            </div>
          )}

          {/* Strict Rules */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 block font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Rules & Fair-Play Policy (Strict Enforcement)</span>
            </span>

            {/* Rule 1: Mobile Only */}
            <div className="p-3 rounded-xl bg-black/40 border border-red-950/60 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 font-bold text-[10px] flex items-center justify-center font-mono">
                  1
                </span>
                <span className="text-xs font-bold text-white">Mobile Only — Emulators (PC) Strictly Forbidden</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-7 leading-relaxed">
                Emulators (PC / BlueStacks / LDPlayer / MSI) are strictly not allowed. All matches are purely Mobile touch players only. Emulator detection leads to immediate room kick without refund.
              </p>
            </div>

            {/* Rule 2: No Hacks or Configs */}
            <div className="p-3 rounded-xl bg-black/40 border border-red-950/60 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 font-bold text-[10px] flex items-center justify-center font-mono">
                  2
                </span>
                <span className="text-xs font-bold text-white">No Hacks, Scripts, Aimbots, or Config Tools</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-7 leading-relaxed">
                Zero tolerance for auto-aim, headshot config files, mod APKs, speed hacks, or third-party config tools. Results in instant permanent ban and complete forfeiture of wallet balance.
              </p>
            </div>

            {/* Rule 3: No Teaming */}
            <div className="p-3 rounded-xl bg-black/40 border border-red-950/60 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 font-bold text-[10px] flex items-center justify-center font-mono">
                  3
                </span>
                <span className="text-xs font-bold text-white">No Teaming Up in Solo Matches</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-7 leading-relaxed">
                Teaming up in Solo matches or intentionally feeding kills is strictly prohibited and will lead to immediate disqualification and prize forfeiture for all collaborating players.
              </p>
            </div>

            {/* Rule 4: Screenshot Required */}
            <div className="p-3 rounded-xl bg-black/40 border border-red-950/60 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 font-bold text-[10px] flex items-center justify-center font-mono">
                  4
                </span>
                <span className="text-xs font-bold text-white">Screenshot of End-Game Scoreboard Required</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-7 leading-relaxed">
                Screenshot of end-game kill feed/scoreboard is required to claim kill rewards and rank prizes. Submit via 'Submit Proof' on the match card within 30 minutes of match completion.
              </p>
            </div>

            {/* Rule 5: Room Confidentiality */}
            <div className="p-3 rounded-xl bg-black/40 border border-red-950/60 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 font-bold text-[10px] flex items-center justify-center font-mono">
                  5
                </span>
                <span className="text-xs font-bold text-white">Room ID & Password Confidentiality</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-7 leading-relaxed">
                Room ID & Password sharing outside the app or with unregistered players will result in immediate disqualification and a permanent account ban.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-red-950/60 bg-[#0e0c18] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            I Understand & Accept
          </button>

          {tournament && !isJoined && !isFull && onJoinClick && (
            <button
              onClick={() => {
                onClose();
                onJoinClick(tournament);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer shadow-md shadow-red-600/30"
            >
              Join Match · 🪙 {tournament.entryFee}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
