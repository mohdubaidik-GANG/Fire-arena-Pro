import React, { useState, useMemo } from 'react';
import { X, Trophy, Crosshair, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Wallet, Grid } from 'lucide-react';
import { doc, runTransaction, collection, setDoc, updateDoc, arrayUnion, increment, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Tournament, TournamentRegistration } from '../types';
import { sound } from '../utils/audio';

interface JoinMatchModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenDeposit: () => void;
}

export const JoinMatchModal: React.FC<JoinMatchModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onSuccess,
  onOpenDeposit,
}) => {
  const { user, profile } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute occupied slots
  const occupiedSlotsMap = useMemo(() => {
    const map = new Map<number, string>();
    if (!tournament?.joinedPlayers) return map;
    tournament.joinedPlayers.forEach((player, idx) => {
      const slotNum = player.slotNumber || (idx + 1);
      map.set(slotNum, player.ign || 'Player');
    });
    return map;
  }, [tournament?.joinedPlayers]);

  // Find first available slot
  const defaultAvailableSlot = useMemo(() => {
    if (!tournament) return 1;
    const max = tournament.maxSlots || 48;
    for (let i = 1; i <= max; i++) {
      if (!occupiedSlotsMap.has(i)) return i;
    }
    return 1;
  }, [tournament, occupiedSlotsMap]);

  const [selectedSlot, setSelectedSlot] = useState<number>(defaultAvailableSlot);

  // Sync selectedSlot when tournament changes
  React.useEffect(() => {
    setSelectedSlot(defaultAvailableSlot);
  }, [defaultAvailableSlot]);

  if (!isOpen || !tournament || !user || !profile) return null;

  const currentJoined = typeof tournament.joinedSlots === 'number' 
    ? tournament.joinedSlots 
    : (tournament.joinedPlayers ? tournament.joinedPlayers.length : Number(tournament.registeredCount) || 0);
  const entryFee = tournament.entryFee;
  const depositBal = profile.depositBalance || 0;
  const winningsBal = profile.winningsBalance || 0;
  const walletBal = Number(profile.walletBalance ?? (depositBal + winningsBal));
  const totalAvailable = walletBal;

  const hasEnoughFunds = totalAvailable >= entryFee;

  const handleSelectSlot = (slotNum: number) => {
    if (occupiedSlotsMap.has(slotNum)) return;
    sound.playClick();
    setSelectedSlot(slotNum);
  };

  const handleJoin = async () => {
    // 1. Duplicate Registration Prevention
    if (tournament.joinedPlayers?.some((p) => p.uid === user.uid)) {
      alert("Aap is match me pehle se registered hain!");
      return;
    }

    // 2. Slot Capacity Check
    if (currentJoined >= tournament.maxSlots) {
      alert("Match slots full!");
      return;
    }

    // 3. Selected Slot Taken Check
    if (occupiedSlotsMap.has(selectedSlot)) {
      setError(`Slot #${selectedSlot} has just been occupied by another player. Please pick a different slot.`);
      return;
    }

    if (!hasEnoughFunds) {
      setError(`Insufficient balance. You need ₹${entryFee} to join this match.`);
      return;
    }

    if (profile.isBanned) {
      setError('Your account is currently suspended from participating in tournaments.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      // Execute wallet deduction atomically in Firestore
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await transaction.get(userRef);
        const userData = userSnap.data();

        const currentDep = Number(userData?.depositBalance || 0);
        const currentWin = Number(userData?.winningsBalance || 0);
        const currentWallet = Number(userData?.walletBalance ?? (currentDep + currentWin));

        if (currentWallet < entryFee) {
          throw new Error(`Insufficient wallet balance. You need ₹${entryFee} to join this match.`);
        }

        // Deduct from deposit balance first, remainder from winnings balance
        let deductDep = Math.min(currentDep, entryFee);
        let deductWin = entryFee - deductDep;

        const newDepositBal = Math.max(0, currentDep - deductDep);
        const newWinningsBal = Math.max(0, currentWin - deductWin);
        const newWalletBal = Math.max(0, currentWallet - entryFee);

        transaction.update(userRef, {
          walletBalance: newWalletBal,
          wallet_balance: newWalletBal,
          depositBalance: newDepositBal,
          winningsBalance: newWinningsBal,
          updatedAt: new Date().toISOString(),
        });
      });

      // Prepare player payload for arrayUnion
      const playerRecord = {
        uid: user.uid,
        ign: profile.ign || (user as any).displayName || 'Gamer',
        email: user.email || '',
        slotNumber: selectedSlot,
        joinedAt: new Date().toISOString(),
      };

      // 1. Realtime Firestore Tracking: Update 'matches' document with arrayUnion and increment(1)
      try {
        await updateDoc(doc(db, 'matches', tournament.id), {
          joinedPlayers: arrayUnion(playerRecord),
          joinedSlots: increment(1),
          registeredCount: increment(1),
          updatedAt: new Date().toISOString(),
        });
      } catch (matchErr) {
        console.warn('Match doc arrayUnion note:', matchErr);
      }

      // 2. Also update 'tournaments' document using arrayUnion and updated registeredCount/joinedSlots
      try {
        await updateDoc(doc(db, 'tournaments', tournament.id), {
          joinedPlayers: arrayUnion(playerRecord),
          joinedSlots: increment(1),
          registeredCount: increment(1),
          updatedAt: new Date().toISOString(),
        });
      } catch (tourErr) {
        console.warn('Tournaments doc arrayUnion note:', tourErr);
      }

      // 3. Keep registration document in subcollection for receipt & historical query
      try {
        const regId = `${tournament.id}_${user.uid}`;
        const regRef = doc(db, `tournaments/${tournament.id}/registrations`, regId);
        const newReg: TournamentRegistration = {
          id: regId,
          tournamentId: tournament.id,
          userId: user.uid,
          userEmail: user.email || '',
          userIgn: profile.ign,
          userFreeFireUid: profile.freeFireUid,
          slotNumber: selectedSlot,
          entryFeePaid: entryFee,
          registeredAt: new Date().toISOString(),
        };
        await setDoc(regRef, newReg);
      } catch (subErr) {
        console.warn('Subcollection registration note:', subErr);
      }

      // 4. Record ledger transaction for wallet passbook
      try {
        const txRef = doc(collection(db, 'transactions'));
        await setDoc(txRef, {
          userId: user.uid,
          amount: entryFee,
          type: 'MATCH_JOIN',
          description: `Entry fee for match: ${tournament.title} (Slot #${selectedSlot})`,
          matchId: tournament.id,
          createdAt: serverTimestamp(),
        });
      } catch (txErr) {
        console.warn('Transaction record warning:', txErr);
      }

      sound.playCoin();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join tournament';
      setError(msg);
      handleFirestoreError(err, OperationType.WRITE, `tournaments/${tournament.id}`);
    } finally {
      setIsJoining(false);
    }
  };

  const totalSlotsCount = tournament.maxSlots || 48;
  const slotsList = Array.from({ length: totalSlotsCount }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0b0c10] border border-red-900/60 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-red-950/60 bg-[#120e18]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Confirm Entry & Pick Slot</h2>
              <p className="text-xs text-slate-400">Fire Arena Pro Esports Tournament</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Match Info Summary */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-red-950/50 space-y-2">
            <h3 className="text-sm font-bold text-white font-heading">{tournament.title}</h3>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Map: <strong className="text-slate-200">{tournament.map}</strong></span>
              <span>Mode: <strong className="text-slate-200">{tournament.mode}</strong></span>
              <span>Slots: <strong className="text-amber-400 font-mono">{currentJoined} / {tournament.maxSlots} Joined</strong></span>
            </div>
          </div>

          {/* Gamer Credentials Confirmation */}
          <div className="p-3 rounded-xl bg-black/50 border border-slate-800 text-xs space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Free Fire In-Game Identity
            </span>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-300">IGN: <strong className="text-amber-400">{profile.ign}</strong></span>
              <span className="text-slate-400">UID: <strong className="text-white">{profile.freeFireUid}</strong></span>
            </div>
          </div>

          {/* ================= SLOT BOOKING GRID ================= */}
          <div className="p-3.5 rounded-xl bg-[#0e0f18] border border-red-950/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white font-heading">
                <Grid className="w-4 h-4 text-amber-400" />
                <span>Select Your Room Slot:</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                Slot #{selectedSlot} Selected
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/80" /> Available
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Selected
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700" /> Occupied
              </span>
            </div>

            {/* Grid of Slots */}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-1 bg-black/40 rounded-lg border border-slate-900">
              {slotsList.map((slotNum) => {
                const isOccupied = occupiedSlotsMap.has(slotNum);
                const isSelected = selectedSlot === slotNum;
                const occupantIgn = occupiedSlotsMap.get(slotNum);

                return (
                  <button
                    key={slotNum}
                    type="button"
                    disabled={isOccupied}
                    onClick={() => handleSelectSlot(slotNum)}
                    title={isOccupied ? `Slot ${slotNum}: ${occupantIgn}` : `Choose Slot ${slotNum}`}
                    className={`h-9 rounded-lg font-mono text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/30 scale-105 border-2 border-amber-300'
                        : isOccupied
                        ? 'bg-slate-900/80 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-60'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40'
                    }`}
                  >
                    <span>{slotNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing & Wallet Deduction Breakdown */}
          <div className="p-3.5 rounded-xl bg-black/50 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tournament Entry Fee:</span>
              <span className="font-mono font-bold text-white text-sm">🪙 {entryFee} Coins</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Your Deposit Cash:</span>
              <span className="font-mono text-slate-200">🪙 {depositBal}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Your Winnings Cash:</span>
              <span className="font-mono text-emerald-400">🪙 {winningsBal}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-semibold">
              <span className="text-slate-300">Total Usable Balance:</span>
              <span className={`font-mono ${hasEnoughFunds ? 'text-emerald-400' : 'text-red-400'}`}>
                🪙 {totalAvailable}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!hasEnoughFunds ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-amber-300 text-center">
                You need 🪙 {entryFee - totalAvailable} more coins to join this match.
              </p>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                  onOpenDeposit();
                }}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Add Cash / Deposit via UPI</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isJoining ? 'Securing Slot...' : `Book Slot #${selectedSlot} · Pay 🪙 ${entryFee}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
