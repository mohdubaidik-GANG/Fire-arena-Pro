import React, { useState } from 'react';
import { X, Trophy, Crosshair, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Wallet } from 'lucide-react';
import { doc, runTransaction, collection, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Tournament, TournamentRegistration } from '../types';

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

  if (!isOpen || !tournament || !user || !profile) return null;

  const currentJoined = tournament.joinedPlayers ? tournament.joinedPlayers.length : 0;
  const entryFee = tournament.entryFee;
  const depositBal = profile.depositBalance || 0;
  const winningsBal = profile.winningsBalance || 0;
  const totalAvailable = depositBal + winningsBal;

  const hasEnoughFunds = totalAvailable >= entryFee;

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

        const currentDep = userData?.depositBalance || 0;
        const currentWin = userData?.winningsBalance || 0;
        const currentTotal = currentDep + currentWin;

        if (currentTotal < entryFee) {
          throw new Error('Insufficient balance to pay tournament entry fee.');
        }

        // Deduct from deposit balance first, remainder from winnings balance
        let deductDep = Math.min(currentDep, entryFee);
        let deductWin = entryFee - deductDep;

        const newDepositBal = currentDep - deductDep;
        const newWinningsBal = currentWin - deductWin;

        transaction.update(userRef, {
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
        joinedAt: new Date().toISOString(),
      };

      // 1. Realtime Firestore Tracking: Update 'matches' document using arrayUnion
      try {
        await updateDoc(doc(db, 'matches', tournament.id), {
          joinedPlayers: arrayUnion(playerRecord),
          updatedAt: new Date().toISOString(),
        });
      } catch (matchErr) {
        console.warn('Match doc arrayUnion note:', matchErr);
      }

      // 2. Also update 'tournaments' document using arrayUnion and updated registeredCount
      try {
        await updateDoc(doc(db, 'tournaments', tournament.id), {
          joinedPlayers: arrayUnion(playerRecord),
          registeredCount: currentJoined + 1,
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
          slotNumber: currentJoined + 1,
          entryFeePaid: entryFee,
          registeredAt: new Date().toISOString(),
        };
        await setDoc(regRef, newReg);
      } catch (subErr) {
        console.warn('Subcollection registration note:', subErr);
      }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0e0e18] border border-amber-500/30 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#121222]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Confirm Entry</h2>
              <p className="text-xs text-slate-400">Join Free Fire MAX Tournament</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Match Info Summary */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-white font-heading">{tournament.title}</h3>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Map: <strong className="text-slate-200">{tournament.map}</strong></span>
              <span>Mode: <strong className="text-slate-200">{tournament.mode}</strong></span>
              <span>Slots: <strong className="text-amber-400 font-mono">{currentJoined} / {tournament.maxSlots} Joined</strong></span>
            </div>
          </div>

          {/* Gamer Credentials Confirmation */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
              Registered Game Identity
            </span>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-300">IGN: <strong className="text-amber-400">{profile.ign}</strong></span>
              <span className="text-slate-400">UID: <strong className="text-white">{profile.freeFireUid}</strong></span>
            </div>
          </div>

          {/* Pricing & Wallet Deduction Breakdown */}
          <div className="p-3.5 rounded-xl bg-black/50 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tournament Entry Fee:</span>
              <span className="font-mono font-bold text-white text-sm">₹{entryFee}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Your Deposit Cash:</span>
              <span className="font-mono text-slate-200">₹{depositBal}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Your Winnings Cash:</span>
              <span className="font-mono text-emerald-400">₹{winningsBal}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-semibold">
              <span className="text-slate-300">Total Usable Balance:</span>
              <span className={`font-mono ${hasEnoughFunds ? 'text-emerald-400' : 'text-red-400'}`}>
                ₹{totalAvailable}
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
                You need ₹{entryFee - totalAvailable} more to join this match.
              </p>
              <button
                type="button"
                onClick={() => {
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
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isJoining ? 'Securing Slot...' : `Pay ₹${entryFee} & Confirm Slot`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
