import React, { useState } from 'react';
import {
  Trophy,
  Crosshair,
  Crown,
  Calendar,
  Flame,
  Award,
  Zap,
  Info,
  Medal,
  Users,
  Search,
  CheckCircle2
} from 'lucide-react';
import { Tournament, UserProfile } from '../types';
import { sound } from '../utils/audio';

interface LeaderboardTabProps {
  tournaments: Tournament[];
  profile: UserProfile | null;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  tournaments,
  profile
}) => {
  // Main View: 'rankings' | 'standings'
  const [activeSubTab, setActiveSubTab] = useState<'rankings' | 'standings'>('rankings');

  // Timeframe: 'week' | 'month' | 'all'
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week');

  // Selected tournament for live points standings
  const activeOrCompleted = tournaments.filter(
    (t) => t.status?.toLowerCase() === 'live' || t.status?.toLowerCase() === 'completed' || Boolean(t.results?.winners?.length)
  );
  const defaultTourId = activeOrCompleted[0]?.id || tournaments[0]?.id || '';
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(defaultTourId);

  // Weekly Top Killers & Winners Data
  const weeklyTopPlayers = [
    { rank: 1, ign: 'Raistar_Pro99', ffUid: '74829103', kills: 48, winnings: 3450, matches: 12, isUser: false },
    { rank: 2, ign: 'White444_Head', ffUid: '55492109', kills: 41, winnings: 2890, matches: 10, isUser: false },
    { rank: 3, ign: 'ViperKill_FF', ffUid: '81239044', kills: 36, winnings: 2150, matches: 9, isUser: false },
    { rank: 4, ign: 'ShadowSniper', ffUid: '69213840', kills: 29, winnings: 1720, matches: 8, isUser: false },
    { rank: 5, ign: 'KillerClash', ffUid: '90341822', kills: 25, winnings: 1400, matches: 7, isUser: false },
    { rank: 6, ign: 'HeadshotKing_99', ffUid: '63821094', kills: 22, winnings: 1100, matches: 6, isUser: false },
    { rank: 7, ign: 'DesiGamer_T1', ffUid: '84920155', kills: 19, winnings: 950, matches: 5, isUser: false },
    { rank: 8, ign: 'LoneWolf_Pro', ffUid: '72940183', kills: 16, winnings: 780, matches: 4, isUser: false },
    { rank: 9, ign: 'Total_Gaming_9', ffUid: '61048291', kills: 14, winnings: 600, matches: 4, isUser: false },
    {
      rank: 10,
      ign: profile?.ign || 'You (Gamer)',
      ffUid: profile?.freeFireUid || '12345678',
      kills: profile?.totalKills || 0,
      winnings: (profile?.winningsBalance || 0) + (profile?.depositBalance || 0),
      matches: profile?.matchesPlayed || 0,
      isUser: true
    }
  ];

  // Monthly Data
  const monthlyTopPlayers = [
    { rank: 1, ign: 'Raistar_Pro99', ffUid: '74829103', kills: 214, winnings: 16920, matches: 58, isUser: false },
    { rank: 2, ign: 'White444_Head', ffUid: '55492109', kills: 182, winnings: 12450, matches: 49, isUser: false },
    { rank: 3, ign: 'ViperKill_FF', ffUid: '81239044', kills: 159, winnings: 9800, matches: 44, isUser: false },
    { rank: 4, ign: 'ShadowSniper', ffUid: '69213840', kills: 135, winnings: 7650, matches: 38, isUser: false },
    { rank: 5, ign: 'SniperKing7', ffUid: '48201948', kills: 118, winnings: 6200, matches: 32, isUser: false },
    { rank: 6, ign: 'KillerClash', ffUid: '90341822', kills: 104, winnings: 5100, matches: 29, isUser: false },
    { rank: 7, ign: 'DesiGamer_T1', ffUid: '84920155', kills: 92, winnings: 4300, matches: 25, isUser: false },
    { rank: 8, ign: 'LoneWolf_Pro', ffUid: '72940183', kills: 78, winnings: 3400, matches: 21, isUser: false },
    { rank: 9, ign: 'HeadshotKing_99', ffUid: '63821094', kills: 69, winnings: 2900, matches: 19, isUser: false },
    {
      rank: 10,
      ign: profile?.ign || 'You (Gamer)',
      ffUid: profile?.freeFireUid || '12345678',
      kills: profile?.totalKills || 0,
      winnings: (profile?.winningsBalance || 0) + (profile?.depositBalance || 0),
      matches: profile?.matchesPlayed || 0,
      isUser: true
    }
  ];

  const currentLeaderboard = timeframe === 'month' ? monthlyTopPlayers : weeklyTopPlayers;

  // Selected tournament for live points table
  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId) || tournaments[0];

  // Calculate live points table for tournament
  // Standard Esports Scoring:
  // Rank 1: 12 pts, Rank 2: 9 pts, Rank 3: 8 pts, Rank 4: 7 pts, Rank 5: 6 pts,
  // Rank 6: 5 pts, Rank 7: 4 pts, Rank 8: 3 pts, Rank 9: 2 pts, Rank 10: 1 pt.
  // Each kill = 1 kill point (or match perKill multiplier).
  const placementPointsMap: Record<number, number> = {
    1: 12,
    2: 9,
    3: 8,
    4: 7,
    5: 6,
    6: 5,
    7: 4,
    8: 3,
    9: 2,
    10: 1
  };

  // Build live points standings from match joined players or declared winners
  const liveStandings = React.useMemo(() => {
    if (!selectedTournament) return [];

    // If results declared with winners
    if (selectedTournament.results?.winners?.length) {
      return selectedTournament.results.winners.map((w, index) => {
        const placementPts = placementPointsMap[w.rank] || 0;
        const killPts = w.kills || 0;
        return {
          rank: w.rank,
          ign: w.ign,
          kills: killPts,
          placementPts,
          totalPoints: placementPts + killPts,
          prizeWon: w.prizeWon
        };
      });
    }

    // If tournament has joined players
    const joined = selectedTournament.joinedPlayers || [];
    if (joined.length > 0) {
      return joined.map((p, idx) => {
        const simulatedKills = idx === 0 ? 7 : idx === 1 ? 5 : idx === 2 ? 3 : Math.max(0, 4 - idx);
        const placementPts = placementPointsMap[idx + 1] || 0;
        return {
          rank: idx + 1,
          ign: p.ign || `Player_${p.uid?.slice(-4)}`,
          kills: simulatedKills,
          placementPts,
          totalPoints: placementPts + simulatedKills,
          prizeWon: idx === 0 ? selectedTournament.rank1Prize : idx === 1 ? selectedTournament.rank2Prize : 0
        };
      });
    }

    // Default mock live points if empty
    return [
      { rank: 1, ign: 'Raistar_Pro99', kills: 8, placementPts: 12, totalPoints: 20, prizeWon: selectedTournament.rank1Prize || 150 },
      { rank: 2, ign: 'White444_Head', kills: 6, placementPts: 9, totalPoints: 15, prizeWon: selectedTournament.rank2Prize || 75 },
      { rank: 3, ign: 'ViperKill_FF', kills: 4, placementPts: 8, totalPoints: 12, prizeWon: 30 },
      { rank: 4, ign: 'ShadowSniper', kills: 3, placementPts: 7, totalPoints: 10, prizeWon: 0 },
      { rank: 5, ign: 'SniperKing7', kills: 2, placementPts: 6, totalPoints: 8, prizeWon: 0 }
    ];
  }, [selectedTournament]);

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Esports Standings</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-white tracking-wide flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>LEADERBOARD & LIVE STANDINGS</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time rankings, top fraggers of the week, and live tournament points table.
          </p>
        </div>

        {/* View Switcher: Top Rankings vs Live Points Table */}
        <div className="flex items-center gap-1 p-1 bg-black/60 rounded-xl border border-red-950/70 shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveSubTab('rankings');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'rankings'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>Top Killers</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveSubTab('standings');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'standings'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Live Points Table</span>
          </button>
        </div>
      </div>

      {/* ================= VIEW 1: TOP KILLERS & WINNERS ================= */}
      {activeSubTab === 'rankings' && (
        <div className="space-y-4">
          {/* Timeframe Selector */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#090a14] border border-red-950/60">
            <span className="text-xs font-bold text-slate-300 font-heading flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Select Timeframe:</span>
            </span>

            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setTimeframe('week');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  timeframe === 'week'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top of the Week
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setTimeframe('month');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  timeframe === 'month'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top of the Month
              </button>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {/* Rank 2 (Silver Medal 🥈) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-600/15 via-[#0e101d] to-[#080911] border border-slate-400/30 text-center flex flex-col items-center justify-between space-y-2 shadow-lg relative">
              <span className="text-xl">🥈</span>
              <div className="w-8 h-8 rounded-full bg-slate-300 text-black font-mono font-black text-xs flex items-center justify-center shadow-md">
                #2
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block truncate w-full">
                  {currentLeaderboard[1].ign}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  🎯 {currentLeaderboard[1].kills} Kills
                </span>
              </div>
              <span className="text-xs font-black font-mono text-slate-200">
                🪙 ₹{currentLeaderboard[1].winnings}
              </span>
            </div>

            {/* Rank 1 (Gold Medal 🥇) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 via-[#18121f] to-[#0c0d18] border-2 border-amber-500/60 text-center flex flex-col items-center justify-between space-y-2 -translate-y-2 shadow-xl shadow-amber-500/20 relative">
              <span className="text-2xl animate-bounce">🥇</span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-black font-mono font-black text-sm flex items-center justify-center shadow-lg shadow-amber-500/40">
                <Crown className="w-5 h-5 fill-black" />
              </div>
              <div className="space-y-0.5">
                <span className="text-sm font-black text-amber-300 block truncate w-full">
                  {currentLeaderboard[0].ign}
                </span>
                <span className="text-[10px] text-amber-400/90 font-mono block">
                  🎯 {currentLeaderboard[0].kills} Kills · {currentLeaderboard[0].matches} Matches
                </span>
              </div>
              <span className="text-sm font-black font-mono text-amber-300">
                🪙 ₹{currentLeaderboard[0].winnings} Won
              </span>
            </div>

            {/* Rank 3 (Bronze Medal 🥉) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-900/15 via-[#0e0c15] to-[#080911] border border-amber-800/30 text-center flex flex-col items-center justify-between space-y-2 shadow-lg relative">
              <span className="text-xl">🥉</span>
              <div className="w-8 h-8 rounded-full bg-amber-700 text-black font-mono font-black text-xs flex items-center justify-center shadow-md">
                #3
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block truncate w-full">
                  {currentLeaderboard[2].ign}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  🎯 {currentLeaderboard[2].kills} Kills
                </span>
              </div>
              <span className="text-xs font-black font-mono text-amber-500">
                🪙 ₹{currentLeaderboard[2].winnings}
              </span>
            </div>
          </div>

          {/* Full Leaderboard Table: Rank, Player IGN, Total Kills, Total Winnings */}
          <div className="rounded-2xl bg-[#090a14] border border-red-950/70 overflow-hidden shadow-xl">
            <div className="p-3.5 border-b border-red-950/60 bg-[#0d0e1c] grid grid-cols-12 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              <span className="col-span-2 text-center">Rank</span>
              <span className="col-span-5">Player IGN / UID</span>
              <span className="col-span-2 text-center">Total Kills</span>
              <span className="col-span-3 text-right">Total Winnings</span>
            </div>

            <div className="divide-y divide-red-950/40">
              {currentLeaderboard.map((player) => (
                <div
                  key={player.rank}
                  className={`p-3.5 grid grid-cols-12 items-center text-xs hover:bg-red-950/20 transition-colors ${
                    player.isUser ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-2 flex items-center justify-center">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        player.rank === 1
                          ? 'bg-amber-400 text-black font-black'
                          : player.rank === 2
                          ? 'bg-slate-300 text-black font-black'
                          : player.rank === 3
                          ? 'bg-amber-700 text-white font-black'
                          : 'text-slate-400'
                      }`}
                    >
                      #{player.rank}
                    </span>
                  </div>

                  {/* Player IGN */}
                  <div className="col-span-5 flex items-center gap-2 min-w-0 pr-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate block">
                          {player.ign}
                        </span>
                        {player.isUser && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/30">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        UID: {player.ffUid}
                      </span>
                    </div>
                  </div>

                  {/* Total Kills */}
                  <div className="col-span-2 text-center font-mono font-bold text-amber-400">
                    🎯 {player.kills}
                  </div>

                  {/* Total Winnings */}
                  <div className="col-span-3 text-right font-mono font-black text-emerald-400">
                    🪙 ₹{player.winnings.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: LIVE POINTS TABLE (STANDINGS) ================= */}
      {activeSubTab === 'standings' && (
        <div className="space-y-4">
          {/* Tournament Match Picker */}
          <div className="p-3.5 rounded-2xl bg-[#090a14] border border-red-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold">
                Select Tournament Room
              </span>
              <span className="text-xs text-white font-bold">
                {selectedTournament?.title || 'Active Esports Match'}
              </span>
            </div>

            {tournaments.length > 0 && (
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="h-9 px-3 rounded-xl bg-black border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.category} · {t.status || 'UPCOMING'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Official Scoring Matrix Rule Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/30 via-black to-[#0f0e1c] border border-red-900/40 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-[11px]">
              <Info className="w-3.5 h-3.5" />
              <span>Official Fire Arena Pro Points Calculation System</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-300 pt-1">
              <div className="p-1.5 rounded bg-black/60 border border-slate-800">
                #1 (Booyah): <strong className="text-amber-400">12 Pts</strong>
              </div>
              <div className="p-1.5 rounded bg-black/60 border border-slate-800">
                #2 Rank: <strong className="text-slate-300">9 Pts</strong>
              </div>
              <div className="p-1.5 rounded bg-black/60 border border-slate-800">
                #3 Rank: <strong className="text-amber-600">8 Pts</strong>
              </div>
              <div className="p-1.5 rounded bg-black/60 border border-slate-800">
                Each Kill: <strong className="text-emerald-400">1 Pt</strong>
              </div>
            </div>
          </div>

          {/* Live Points Standings Table */}
          <div className="rounded-2xl bg-[#090a14] border border-red-950/70 overflow-hidden shadow-xl">
            <div className="p-3.5 border-b border-red-950/60 bg-[#0d0e1c] grid grid-cols-12 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              <span className="col-span-2 text-center">Rank</span>
              <span className="col-span-4">Player / Team</span>
              <span className="col-span-2 text-center">Kills</span>
              <span className="col-span-2 text-center">Placement</span>
              <span className="col-span-2 text-right">Total Pts</span>
            </div>

            <div className="divide-y divide-red-950/40">
              {liveStandings.map((row) => (
                <div
                  key={row.rank}
                  className="p-3.5 grid grid-cols-12 items-center text-xs hover:bg-red-950/20 transition-colors"
                >
                  <div className="col-span-2 flex items-center justify-center">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        row.rank === 1
                          ? 'bg-amber-400 text-black font-black'
                          : row.rank === 2
                          ? 'bg-slate-300 text-black font-black'
                          : row.rank === 3
                          ? 'bg-amber-700 text-white font-black'
                          : 'text-slate-400'
                      }`}
                    >
                      #{row.rank}
                    </span>
                  </div>

                  <div className="col-span-4 font-bold text-white truncate pr-2 flex items-center gap-1.5">
                    <span>{row.ign}</span>
                    {row.rank === 1 && <span>👑</span>}
                  </div>

                  <div className="col-span-2 text-center font-mono font-bold text-red-400">
                    {row.kills}
                  </div>

                  <div className="col-span-2 text-center font-mono font-semibold text-slate-300">
                    {row.placementPts} pts
                  </div>

                  <div className="col-span-2 text-right font-mono font-black text-amber-400">
                    {row.totalPoints} PTS
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
