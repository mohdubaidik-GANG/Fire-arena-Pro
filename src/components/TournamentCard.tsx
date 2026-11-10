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
  Zap,
  FileText,
  UploadCloud,
  ExternalLink
} from 'lucide-react';
import { Tournament, TournamentRegistration } from '../types';
import { useAuth } from '../context/AuthContext';
import { sound } from '../utils/audio';

interface TournamentCardProps {
  tournament: Tournament;
  userRegistration?: TournamentRegistration | null;
  onJoinClick: (tournament: Tournament) => void;
  onViewDetails?: (tournament: Tournament) => void;
  onSubmitProof?: (tournament: Tournament) => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  userRegistration,
  onJoinClick,
  onViewDetails,
  onSubmitProof,
}) => {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Live Countdown Timer
  const [countdown, setCountdown] = useState<string>('');
  const [isStartsSoon, setIsStartsSoon] = useState<boolean>(false);

  React.useEffect(() => {
    const updateCountdown = () => {
      const matchTimestamp = new Date(tournament.startTime).getTime();
      const diff = matchTimestamp - Date.now();

      if (diff <= 0) {
        setCountdown('Starts Now');
        setIsStartsSoon(true);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setIsStartsSoon(hours === 0 && minutes < 15);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setCountdown(`${days}d ${hours % 24}h`);
      } else {
        const pad = (n: number) => String(n).padStart(2, '0');
        setCountdown(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [tournament.startTime]);

  const currentJoined = typeof tournament.joinedSlots === 'number'
    ? tournament.joinedSlots
    : (tournament.joinedPlayers ? tournament.joinedPlayers.length : Number(tournament.registeredCount) || 0);
  const isRegisteredInList = Boolean(user?.uid && tournament.joinedPlayers?.some((p) => p.uid === user.uid));
  const isJoined = Boolean(userRegistration || isRegisteredInList);
  const isFull = currentJoined >= tournament.maxSlots;
  const isLive = tournament.status?.toLowerCase() === 'live';
  const isCompleted = tournament.status?.toLowerCase() === 'completed';

  const hasRoomCredentials = Boolean(
    tournament.roomId &&
    tournament.roomId.trim() !== '' &&
    tournament.roomPassword &&
    tournament.roomPassword.trim() !== ''
  );

  const triggerCopyToast = (msg: string) => {
    setCopyToast(msg);
    setTimeout(() => setCopyToast(null), 3000);
  };

  const handleCopy = (text: string, type: 'id' | 'pass' | 'all') => {
    sound.playCopy();
    if (type === 'id') {
      navigator.clipboard.writeText(text);
      setCopiedId(true);
      triggerCopyToast("Room ID Copied!");
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === 'pass') {
      navigator.clipboard.writeText(text);
      setCopiedPass(true);
      triggerCopyToast("Room Password Copied!");
      setTimeout(() => setCopiedPass(false), 2000);
    } else {
      const fullText = `Room ID: ${tournament.roomId}\nPassword: ${tournament.roomPassword}`;
      navigator.clipboard.writeText(fullText);
      setCopiedId(true);
      setCopiedPass(true);
      triggerCopyToast("Credentials Copied! Free Fire open karke room join karein.");
      setTimeout(() => {
        setCopiedId(false);
        setCopiedPass(false);
      }, 2000);
    }
  };

  const getCategoryLabel = (cat: string) => {
    return cat ? cat.replace(/_/g, ' ').toUpperCase() : 'FULL MAP';
  };

  const slotsPercent = Math.min(100, Math.round((currentJoined / tournament.maxSlots) * 100));

  const startDate = new Date(tournament.startTime);
  const formattedTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = startDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Get user slot number if available
  const userSlotNum = userRegistration?.slotNumber || 
    tournament.joinedPlayers?.find(p => p.uid === user?.uid)?.slotNumber || 1;

  return (
    <div className="bg-[#0b0c10] border border-red-950/70 hover:border-red-600/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-red-600/10 transition-all flex flex-col justify-between group relative">
      {/* Toast Alert */}
      {copyToast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-black text-[11px] font-bold px-3 py-1 rounded-full shadow-lg shadow-amber-500/30 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
          {copyToast}
        </div>
      )}

      {/* Top Banner / Match Title */}
      <div className="p-4 sm:p-5 border-b border-red-950/50 bg-gradient-to-r from-[#140a16] via-[#0d0914] to-[#07070d]">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Category Badge & Mode Info */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-700 text-white font-heading font-black text-[10px] uppercase tracking-wider shadow-sm shadow-red-600/30">
              {getCategoryLabel(tournament.category)}
            </span>
            <span className="text-[11px] font-mono text-slate-400">· {tournament.mode}</span>
            <span className="text-[11px] font-mono text-slate-400">· {tournament.map}</span>
          </div>

          {/* Status Badge */}
          {isLive && (
            <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> LIVE MATCH
            </span>
          )}
          {isCompleted && (
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-mono uppercase">
              COMPLETED
            </span>
          )}
          {!isLive && !isCompleted && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="px-2 py-0.5 rounded-full bg-red-950/40 text-red-300 border border-red-900/40 text-[10px] font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-red-400" /> {formattedDate}, {formattedTime}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border shadow-sm ${
                  isStartsSoon
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-900/90 text-slate-300 border-slate-800'
                }`}
              >
                <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                <span>Starts in: {countdown}</span>
              </span>
            </div>
          )}
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white font-heading tracking-tight group-hover:text-red-400 transition-colors">
          {tournament.title}
        </h3>
      </div>

      {/* Middle Specs & Prize Pool Grid */}
      <div className="p-4 sm:p-5 space-y-4 flex-1">
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#0e0f1c]/90 border border-red-950/60 text-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Prize Pool</span>
            <span className="text-sm sm:text-base font-black font-mono text-emerald-400 tabular-nums">
              🪙 {tournament.totalPrizePool}
            </span>
          </div>

          <div className="border-x border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Per Kill</span>
            <span className="text-sm sm:text-base font-black font-mono text-amber-400 tabular-nums">
              🪙 {tournament.perKillReward}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Rank 1 Prize</span>
            <span className="text-sm sm:text-base font-black font-mono text-white tabular-nums">
              🪙 {tournament.rank1Prize}
            </span>
          </div>
        </div>

        {/* Slot Progress Indicator */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-red-400" />
              <span>Registered Slots</span>
            </span>
            <span className="font-mono font-bold text-slate-200">
              {currentJoined} / {tournament.maxSlots} Joined
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                slotsPercent >= 90 ? 'bg-red-500' : slotsPercent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${slotsPercent}%` }}
            />
          </div>
        </div>

        {/* ================= ONE-TAP ROOM CREDENTIALS UNLOCK PANEL ================= */}
        {isJoined ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#160b13] to-[#0c0d16] border border-amber-500/40 shadow-lg shadow-amber-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-heading">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Slot #{userSlotNum} Confirmed</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                Registered
              </span>
            </div>

            {hasRoomCredentials ? (
              <div className="pt-2 border-t border-amber-500/20 space-y-2.5">
                {/* Glow box with 1-Tap Copy */}
                <div className="p-3 rounded-xl bg-black/80 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-heading font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Custom Room Ready</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('', 'all')}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-[10px] uppercase font-heading flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <Copy className="w-3 h-3" />
                      <span>1-Tap Copy All</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-[#141522] border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Room ID</span>
                        <code className="text-amber-400 font-mono font-bold text-xs select-all">
                          {tournament.roomId}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopy(tournament.roomId!, 'id')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                        title="Copy Room ID"
                      >
                        {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="p-2 rounded-lg bg-[#141522] border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block font-mono">Password</span>
                        <code className="text-amber-400 font-mono font-bold text-xs select-all">
                          {tournament.roomPassword}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopy(tournament.roomPassword!, 'pass')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                        title="Copy Password"
                      >
                        {copiedPass ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-amber-200/90 font-mono text-center">
                  Free Fire MAX → Custom → Search Room ID → Enter Password → Take Slot #{userSlotNum}.
                </p>
              </div>
            ) : (
              <div className="pt-2 border-t border-red-950/50">
                <div className="p-2.5 rounded-xl bg-black/50 border border-red-950/60 text-xs flex items-start gap-2">
                  <Clock className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="font-semibold text-white">Room ID & Password will unlock 15 mins before match</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Admin will publish credentials once room is setup.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Room ID & Pass:</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Unlocks 15 mins before match start</span>
          </div>
        )}

        {/* If Results declared */}
        {tournament.results && tournament.results.winners && (
          <div className="p-3 rounded-xl bg-[#0e0f1c] border border-red-950/60 text-xs space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider font-heading">
              Match Champions (Booyah)
            </span>
            {tournament.results.winners.slice(0, 3).map((w) => (
              <div key={w.rank} className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-300">
                  #{w.rank} {w.ign} ({w.kills} Kills)
                </span>
                <span className="text-emerald-400 font-bold">+🪙 {w.prizeWon}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 sm:p-5 pt-0 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onViewDetails?.(tournament);
            }}
            className="w-full h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-red-900/60 text-slate-300 hover:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span>Rules & Details</span>
          </button>

          {/* Submit Result Screenshot Proof */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onSubmitProof?.(tournament);
            }}
            className="w-full h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
            <span>Submit Proof</span>
          </button>
        </div>

        {isJoined ? (
          <button
            disabled
            className="w-full h-11 rounded-xl bg-slate-900 border border-red-500/40 text-red-400 font-bold text-xs flex items-center justify-center gap-2 cursor-default shadow-sm font-heading"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Already Registered (Slot #{userSlotNum})</span>
          </button>
        ) : isCompleted ? (
          <button
            disabled
            className="w-full h-11 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed font-heading"
          >
            <span>Match Concluded</span>
          </button>
        ) : isFull ? (
          <button
            disabled
            className="w-full h-11 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed font-heading"
          >
            <span>Match Slots Full</span>
          </button>
        ) : (
          <button
            onClick={() => {
              sound.playClick();
              if (isJoined || isRegisteredInList) {
                alert("Aap is match me pehle se registered hain!");
                return;
              }
              if (isFull) {
                alert("Match slots full!");
                return;
              }
              onJoinClick(tournament);
            }}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-heading font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.98] transition-all cursor-pointer tracking-wider uppercase"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Join Match · 🪙 {tournament.entryFee} Coins</span>
          </button>
        )}
      </div>
    </div>
  );
};
