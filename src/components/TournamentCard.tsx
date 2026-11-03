import React, { useState } from 'react';
import {
  Trophy,
  Users,
  Crosshair,
  Lock,
  Unlock,
  Copy,
  Check,
  Calendar,
  Clock,
  Flame,
  Award,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Tournament, TournamentRegistration } from '../types';

interface TournamentCardProps {
  tournament: Tournament;
  userRegistration?: TournamentRegistration | null;
  onJoinClick: (tournament: Tournament) => void;
  onViewDetails?: (tournament: Tournament) => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  userRegistration,
  onJoinClick,
  onViewDetails,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const isJoined = Boolean(userRegistration);
  const isFull = tournament.registeredCount >= tournament.maxSlots;
  const isLive = tournament.status?.toLowerCase() === 'live';
  const isCompleted = tournament.status?.toLowerCase() === 'completed';

  const hasRoomCredentials = Boolean(tournament.roomId && tournament.roomPassword);

  const handleCopy = (text: string, type: 'id' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'clash_squad_1v1':
        return 'CS 1v1';
      case 'clash_squad_4v4':
        return 'CS 4v4';
      default:
        return 'Battle Royale';
    }
  };

  const slotsPercent = Math.min(100, Math.round((tournament.registeredCount / tournament.maxSlots) * 100));

  // Format start time
  const startDate = new Date(tournament.startTime);
  const formattedTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="bg-[#0e0e18] border border-slate-800 hover:border-amber-500/30 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between">
      {/* Top Banner / Match Title */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-[#121222] via-[#0f0f1c] to-[#0c0c16]">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Category & Mode Info */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold text-amber-400 uppercase tracking-wide">
              {getCategoryLabel(tournament.category)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{tournament.mode}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300">{tournament.map}</span>
          </div>

          {/* Status Badge */}
          {isLive && (
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Live Match
            </span>
          )}
          {isCompleted && (
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono uppercase">
              Completed
            </span>
          )}
          {!isLive && !isCompleted && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formattedDate}, {formattedTime}
            </span>
          )}
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white font-heading tracking-tight">
          {tournament.title}
        </h3>
      </div>

      {/* Middle Specs & Prize Pool Grid */}
      <div className="p-4 sm:p-5 space-y-4 flex-1">
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Prize Pool</span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-400 tabular-nums">
              ₹{tournament.totalPrizePool}
            </span>
          </div>

          <div className="border-x border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Per Kill</span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-amber-400 tabular-nums">
              ₹{tournament.perKillReward}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">1st Prize</span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-white tabular-nums">
              ₹{tournament.rank1Prize}
            </span>
          </div>
        </div>

        {/* Slot Progress Indicator */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Registered Slots</span>
            </span>
            <span className="font-mono font-semibold text-slate-200">
              {tournament.registeredCount} / {tournament.maxSlots}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                slotsPercent >= 90 ? 'bg-red-500' : slotsPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${slotsPercent}%` }}
            />
          </div>
        </div>

        {/* ================= ROOM CREDENTIALS UNLOCK PANEL ================= */}
        {isJoined ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Slot #{userRegistration?.slotNumber} Reserved</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                Registered
              </span>
            </div>

            {hasRoomCredentials ? (
              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-mono">Room ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-black/60 rounded text-amber-400 font-mono font-bold text-xs select-all">
                      {tournament.roomId}
                    </code>
                    <button
                      onClick={() => handleCopy(tournament.roomId!, 'id')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Copy Room ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-mono">Password:</span>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-black/60 rounded text-amber-400 font-mono font-bold text-xs select-all">
                      {tournament.roomPassword}
                    </code>
                    <button
                      onClick={() => handleCopy(tournament.roomPassword!, 'pass')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-amber-300/80 pt-1 font-mono">
                  Room credentials are unlocked! Open Free Fire MAX → Custom → Join Room.
                </p>
              </div>
            ) : (
              <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Room ID & Password will unlock here 15 mins before match start.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Room ID & Pass:</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Locked for participants</span>
          </div>
        )}

        {/* If Results declared */}
        {tournament.results && tournament.results.winners && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
            <span className="text-[10px] uppercase font-semibold text-amber-400 block tracking-wider">
              Match Champions (Booyah)
            </span>
            {tournament.results.winners.slice(0, 3).map((w) => (
              <div key={w.rank} className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-300">
                  #{w.rank} {w.ign} ({w.kills} Kills)
                </span>
                <span className="text-emerald-400 font-bold">+₹{w.prizeWon}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 sm:p-5 pt-0">
        {isJoined ? (
          <button
            disabled
            className="w-full h-11 rounded-xl bg-slate-800 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 cursor-default"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Already Registered (Slot #{userRegistration?.slotNumber})</span>
          </button>
        ) : isCompleted ? (
          <button
            disabled
            className="w-full h-11 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <span>Match Concluded</span>
          </button>
        ) : isFull ? (
          <button
            disabled
            className="w-full h-11 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <span>Match Slots Full</span>
          </button>
        ) : (
          <button
            onClick={() => onJoinClick(tournament)}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Join Match · Entry ₹{tournament.entryFee}</span>
          </button>
        )}
      </div>
    </div>
  );
};
