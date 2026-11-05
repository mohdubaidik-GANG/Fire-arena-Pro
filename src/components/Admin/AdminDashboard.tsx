import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Trophy,
  Wallet,
  Users,
  Settings,
  PlusCircle,
  CheckCircle2,
  XCircle,
  X,
  Key,
  Flame,
  Search,
  AlertCircle,
  Copy,
  Check,
  Edit3,
  Trash2,
  Send,
  DollarSign,
  Ban,
  UserCheck,
  Award,
  Clock,
  Sparkles,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Tournament,
  DepositRequest,
  WithdrawalRequest,
  UserProfile,
  AdminSettings,
  TournamentCategory,
  TournamentMode,
  TournamentStatus
} from '../../types';

interface AdminDashboardProps {
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { user, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tournaments' | 'deposits' | 'withdrawals' | 'users' | 'settings'>('tournaments');

  // Tournaments State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoomTour, setEditingRoomTour] = useState<Tournament | null>(null);
  const [declaringResultsTour, setDeclaringResultsTour] = useState<Tournament | null>(null);

  // Deposits State
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Withdrawals State
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [fulfillingWithdrawal, setFulfillingWithdrawal] = useState<WithdrawalRequest | null>(null);

  // Users Inspector State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingWalletUser, setEditingWalletUser] = useState<UserProfile | null>(null);

  // Admin Settings State
  const [settings, setSettings] = useState<AdminSettings>({
    upiId: '9005939633@ptyes',
    upiName: 'Fire Arena Pro',
    qrCodeUrl: '',
    supportWhatsapp: '919876543210',
    minDeposit: 20,
    minWithdrawal: 50,
    rules: 'Entry fee is deducted from Deposit balance. Winnings can be withdrawn via UPI or Redeem codes.',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // State for match deletion modal and admin feedback toasts
  const [matchToDelete, setMatchToDelete] = useState<{ id: string; title?: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [adminToast, setAdminToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => {
      setAdminToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }, []);

  // Internal persistent map refs for real-time match synchronization
  const tourneysMapRef = useRef<Map<string, Tournament>>(new Map());
  const matchesMapRef = useRef<Map<string, Tournament>>(new Map());

  const updateTournamentsState = useCallback(() => {
    const mergedMap = new Map<string, Tournament>();
    tourneysMapRef.current.forEach((val, key) => mergedMap.set(key, val));
    matchesMapRef.current.forEach((val, key) => {
      const existing = mergedMap.get(key);
      mergedMap.set(key, { ...existing, ...val });
    });
    const list = Array.from(mergedMap.values());
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setTournaments(list);
  }, []);

  // Real-time Listeners for all collections
  useEffect(() => {
    // 1. Tournaments and Matches Listener (Unified with proper deletion sync)
    const unsubTournaments = onSnapshot(
      collection(db, 'tournaments'),
      (snapshot) => {
        tourneysMapRef.current.clear();
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const existing = tourneysMapRef.current.get(d.id);
          const joinedList = Array.isArray(data.joinedPlayers) && data.joinedPlayers.length > 0
            ? data.joinedPlayers
            : Array.isArray(existing?.joinedPlayers) && existing.joinedPlayers.length > 0
            ? existing.joinedPlayers
            : Array.isArray(data.joinedPlayers) ? data.joinedPlayers : [];

          tourneysMapRef.current.set(d.id, {
            id: d.id,
            ...data,
            joinedPlayers: joinedList,
            registeredCount: joinedList.length || Number(data.registeredCount) || 0,
          } as Tournament);
        });
        updateTournamentsState();
      },
      (error) => {
        console.error('Error fetching tournaments:', error);
      }
    );

    const unsubMatches = onSnapshot(
      collection(db, 'matches'),
      (snapshot) => {
        matchesMapRef.current.clear();
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const existing = matchesMapRef.current.get(d.id);
          const joinedList = Array.isArray(data.joinedPlayers) && data.joinedPlayers.length > 0
            ? data.joinedPlayers
            : Array.isArray(existing?.joinedPlayers) && existing.joinedPlayers.length > 0
            ? existing.joinedPlayers
            : Array.isArray(data.joinedPlayers) ? data.joinedPlayers : [];

          matchesMapRef.current.set(d.id, {
            id: d.id,
            title: data.title || 'Free Fire CS Match',
            category: data.category || 'battle_royale',
            mode: data.mode || 'Solo',
            map: data.map || data.mapName || 'Bermuda',
            entryFee: Number(data.entryFee) || 0,
            perKillReward: Number(data.perKill) || 0,
            totalPrizePool: Number(data.totalPool) || 0,
            rank1Prize: Number(data.rank1) || 0,
            rank2Prize: Number(data.rank2) || 0,
            rank3Prize: 0,
            maxSlots: Number(data.maxSlots) || 2,
            startTime: data.startTime || new Date().toISOString(),
            status: ((data.status || 'UPCOMING').toLowerCase() === 'upcoming' ? 'upcoming' : data.status) as TournamentStatus,
            roomId: data.roomId || '',
            roomPassword: data.roomPassword || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
            ...data,
            joinedPlayers: joinedList,
            registeredCount: joinedList.length || Number(data.registeredCount) || 0,
          } as unknown as Tournament);
        });
        updateTournamentsState();
      },
      (error) => {
        console.warn('Matches subscription note:', error);
      }
    );

    // 2. Deposits Listener
    const unsubDeposits = onSnapshot(
      collection(db, 'depositRequests'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DepositRequest));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDeposits(list);
      },
      (error) => {
        console.error('Error fetching deposits:', error);
      }
    );

    // 3. Withdrawals Listener
    const unsubWithdrawals = onSnapshot(
      collection(db, 'withdrawalRequests'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WithdrawalRequest));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWithdrawals(list);
      },
      (error) => {
        console.error('Error fetching withdrawals:', error);
      }
    );

    // 4. Users Listener
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ ...d.data() } as UserProfile));
        setUsersList(list);
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );

    // 5. Settings Listener
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'global'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AdminSettings;
          if (data.upiId) {
            try {
              data.upiId = decodeURIComponent(data.upiId).replace(/%40/gi, '@').trim();
            } catch {
              data.upiId = data.upiId.replace(/%40/gi, '@').trim();
            }
          }
          setSettings(data);
        }
      },
      (error) => {
        console.warn('Settings document not yet initialized:', error);
      }
    );

    return () => {
      unsubTournaments();
      unsubMatches();
      unsubDeposits();
      unsubWithdrawals();
      unsubUsers();
      unsubSettings();
    };
  }, []);

  // ---------------- ACTION HANDLERS ---------------- //

  // Approve Deposit Request (Credits User's Deposit Balance)
  const handleApproveDeposit = async (dep: DepositRequest) => {
    if (!confirm(`Approve deposit of ₹${dep.amount} for ${dep.userIgn} (${dep.userEmail})? This will immediately credit their Deposit Balance.`)) {
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', dep.userId);
        const userSnap = await transaction.get(userRef);

        const currentDeposit = userSnap.exists() ? userSnap.data()?.depositBalance || 0 : 0;
        const newDeposit = currentDeposit + dep.amount;

        transaction.update(userRef, {
          depositBalance: newDeposit,
          updatedAt: new Date().toISOString(),
        });

        const depRef = doc(db, 'depositRequests', dep.id);
        transaction.update(depRef, {
          status: 'approved',
          reviewedAt: new Date().toISOString(),
        });
      });
    } catch (err: unknown) {
      alert(`Failed to approve deposit: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Reject Deposit Request
  const handleRejectDeposit = async (dep: DepositRequest) => {
    const reason = prompt('Enter rejection reason (optional):', 'Invalid UTR / Payment not received');
    if (reason === null) return;

    try {
      await updateDoc(doc(db, 'depositRequests', dep.id), {
        status: 'rejected',
        adminNote: reason,
        reviewedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      alert(`Failed to reject deposit: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Reject & Refund Withdrawal
  const handleRejectWithdrawal = async (w: WithdrawalRequest) => {
    const reason = prompt('Enter rejection reason. NOTE: Funds will be refunded back to player Winnings Balance:', 'Incorrect UPI ID / Inactive account');
    if (reason === null) return;

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', w.userId);
        const userSnap = await transaction.get(userRef);

        const currentWinnings = userSnap.exists() ? userSnap.data()?.winningsBalance || 0 : 0;
        const refundedWinnings = currentWinnings + w.amount;

        transaction.update(userRef, {
          winningsBalance: refundedWinnings,
          updatedAt: new Date().toISOString(),
        });

        const withRef = doc(db, 'withdrawalRequests', w.id);
        transaction.update(withRef, {
          status: 'rejected',
          adminNote: reason,
          processedAt: new Date().toISOString(),
        });
      });
    } catch (err: unknown) {
      alert(`Failed to refund withdrawal: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Ban / Unban User
  const handleToggleBanUser = async (targetUser: UserProfile) => {
    const newStatus = !targetUser.isBanned;
    if (!confirm(`${newStatus ? 'BAN' : 'UNBAN'} user ${targetUser.ign} (${targetUser.email})?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        isBanned: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      alert(`Failed to toggle ban: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Cancel and Delete Tournament with Automated Player Refunds
  const handleCancelAndDeleteTournament = async (t: Tournament) => {
    const currentJoined = t.joinedPlayers ? t.joinedPlayers.length : (t.registeredCount || 0);
    const confirmationText =
      `Are you sure you want to cancel and delete this tournament: "${t.title}"?\n\n` +
      (currentJoined > 0
        ? `AUTOMATED REFUND NOTICE: ${currentJoined} registered player(s) will immediately receive an automated refund of their ₹${t.entryFee} entry fee into their Deposit Wallet!`
        : `This match room will be permanently removed from the arena.`);

    if (!confirm(confirmationText)) {
      return;
    }

    try {
      // 1. Fetch all registered players from subcollection
      const regsRef = collection(db, `tournaments/${t.id}/registrations`);
      const regsSnap = await getDocs(regsRef);
      const registrations = regsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as { id: string; userId: string; userIgn?: string; entryFeePaid?: number }[];

      // Collect all user IDs to refund (from subcollection AND from joinedPlayers array)
      const userRefundMap = new Map<string, number>();
      registrations.forEach((r) => {
        if (r.userId) {
          userRefundMap.set(r.userId, r.entryFeePaid || t.entryFee || 0);
        }
      });
      if (Array.isArray(t.joinedPlayers)) {
        t.joinedPlayers.forEach((p) => {
          if (p.uid && !userRefundMap.has(p.uid)) {
            userRefundMap.set(p.uid, t.entryFee || 0);
          }
        });
      }

      let refundedUsersCount = 0;
      let totalRefundedAmount = 0;

      // 2. Perform atomic refund and tournament deletion in a Firestore transaction
      await runTransaction(db, async (transaction) => {
        // Refund each registered player
        for (const [userId, refundAmount] of userRefundMap.entries()) {
          if (refundAmount > 0) {
            const userRef = doc(db, 'users', userId);
            const userSnap = await transaction.get(userRef);

            if (userSnap.exists()) {
              const currentDeposit = userSnap.data()?.depositBalance || 0;
              transaction.update(userRef, {
                depositBalance: currentDeposit + refundAmount,
                updatedAt: new Date().toISOString(),
              });
              refundedUsersCount++;
              totalRefundedAmount += refundAmount;
            }
          }
        }

        // Delete subcollection registration docs
        for (const reg of registrations) {
          const regDocRef = doc(db, `tournaments/${t.id}/registrations`, reg.id);
          transaction.delete(regDocRef);
        }

        // Delete the tournament document from Firestore (tournaments and matches)
        const tourRef = doc(db, 'tournaments', t.id);
        transaction.delete(tourRef);
        const matchRef = doc(db, 'matches', t.id);
        transaction.delete(matchRef);
      });

      // Immediately update local UI state to remove deleted match without requiring refresh
      tourneysMapRef.current.delete(t.id);
      matchesMapRef.current.delete(t.id);
      setTournaments((prev) => prev.filter((m) => m.id !== t.id));

      showToast(
        refundedUsersCount > 0
          ? `Tournament "${t.title}" cancelled! Refunded ${refundedUsersCount} players (₹${totalRefundedAmount}).`
          : `Tournament "${t.title}" deleted and removed from screens.`,
        'success'
      );
    } catch (err: unknown) {
      console.error('Error cancelling and deleting tournament:', err);
      showToast(`Failed to cancel tournament: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  };

  // Robust Match Deletion Logic
  const handleDeleteMatch = async (matchId: string, skipPrompt = false) => {
    let confirmed = skipPrompt;
    if (!confirmed) {
      try {
        confirmed = window.confirm("Are you sure you want to permanently delete this tournament match?");
      } catch {
        // Fallback to in-app confirmation modal if window.confirm cannot be shown
        const target = tournaments.find((t) => t.id === matchId);
        setMatchToDelete({ id: matchId, title: target?.title || 'Tournament Match' });
        return;
      }
    }

    if (!confirmed) return;

    setDeleteLoading(true);

    // 1. Update local UI state immediately to remove the deleted match from the screen without requiring a hard refresh
    tourneysMapRef.current.delete(matchId);
    matchesMapRef.current.delete(matchId);
    setTournaments((prev) => prev.filter((m) => m.id !== matchId));

    try {
      // 2. Execute Firestore deleteDoc
      await deleteDoc(doc(db, "matches", matchId));
      try {
        await deleteDoc(doc(db, "tournaments", matchId));
      } catch {
        // tournaments doc might not exist
      }

      setMatchToDelete(null);
      showToast("Tournament match permanently deleted from database!", "success");
    } catch (err: unknown) {
      console.error("Delete match error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast("Failed to delete match: " + errMsg, "error");
      // Re-sync if deletion failed
      updateTournamentsState();
    } finally {
      setDeleteLoading(false);
    }
  };

  // Quick 1-Click Status Management
  const handleSetMatchStatus = async (matchId: string, newStatus: 'UPCOMING' | 'LIVE' | 'COMPLETED') => {
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      try {
        await updateDoc(doc(db, 'tournaments', matchId), {
          status: newStatus.toLowerCase() as TournamentStatus,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // tournaments doc might not exist
      }
    } catch (err: unknown) {
      console.error("Update match status error:", err);
      alert("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanUpiId = (settings.upiId || '').replace(/%40/gi, '@').trim();
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        upiId: cleanUpiId,
        updatedAt: new Date().toISOString(),
      });
      setSettings((prev) => ({ ...prev, upiId: cleanUpiId }));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: unknown) {
      alert(`Failed to save settings: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filtered deposits & withdrawals
  const filteredDeposits = deposits.filter((d) => depositFilter === 'all' || d.status === depositFilter);
  const filteredWithdrawals = withdrawals.filter((w) => withdrawalFilter === 'all' || w.status === withdrawalFilter);

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.ign?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.freeFireUid?.includes(q)
    );
  });

  const ADMIN_CATEGORIES = [
    'ALL',
    'FULL MAP',
    'FULL MAP 2',
    'CS HEAD',
    'LW 1V1',
    'LW 2V2',
    'CS 1V1',
    'CS 2V2',
    'LW HEAD',
    'LW LOSS',
    'LW ₹10',
    'NIGHT MODE',
    'FREE MATCH'
  ];

  const displayedTournaments = tournaments.filter((t) => {
    if (adminCategoryFilter === 'ALL' || adminCategoryFilter === 'all') return true;
    const cat = String(t.category || '').toUpperCase().trim();
    const target = adminCategoryFilter.toUpperCase().trim();
    return cat === target || cat.replace(/_/g, ' ') === target || cat.includes(target) || target.includes(cat);
  });

  const pendingDepositsCount = deposits.filter((d) => d.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 pb-16">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#06070a]/95 backdrop-blur-md border-b border-red-950/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 p-[2px] shadow-lg shadow-red-950/60 overflow-hidden border border-red-500/40">
              <img src="/logo.png" alt="Fire Arena Pro" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black font-heading text-white tracking-tight uppercase">
                  FIRE-ARENA-PRO <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-400">COMMAND CENTER</span>
                </h1>
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Operator: <span className="text-red-400 font-bold">{user?.email || profile?.freeFireUid || '15524834348'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="h-9 px-3 rounded-xl bg-[#090a14] hover:bg-red-950/40 text-slate-200 border border-red-950/80 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Flame className="w-4 h-4 text-red-500" />
              <span className="hidden sm:inline">Gamer Arena</span>
            </a>

            <button
              onClick={onLogout || logout}
              className="h-9 px-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out to Login Screen"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-red-950/80 no-scrollbar">
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tournaments'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/60 border border-red-500'
                : 'bg-[#090a12] border border-red-950/60 text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Tournaments Engine ({tournaments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className={`h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'deposits'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/60 border border-red-500'
                : 'bg-[#090a12] border border-red-950/60 text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Deposit Requests</span>
            {pendingDepositsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                {pendingDepositsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'withdrawals'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/60 border border-red-500'
                : 'bg-[#090a12] border border-red-950/60 text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Pending Withdrawals</span>
            {pendingWithdrawalsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-bold text-[10px] flex items-center justify-center font-mono">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/60 border border-red-500'
                : 'bg-[#090a12] border border-red-950/60 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Inspector ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`h-10 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950/60 border border-red-500'
                : 'bg-[#090a12] border border-red-950/60 text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Payment & QR Settings</span>
          </button>
        </div>

        {/* ================= TAB 1: TOURNAMENTS ENGINE ================= */}
        {activeTab === 'tournaments' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black font-heading text-white uppercase tracking-wide">
                  Fire Arena Pro Match Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Manage custom rooms, unlock real-time credentials, and auto-disburse kill & rank prizes across 12 game modes.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/50 transition-all cursor-pointer shrink-0 border border-red-500/40"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Create Match</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-red-950/50 no-scrollbar">
              {ADMIN_CATEGORIES.map((cat) => {
                const isActive = (adminCategoryFilter === 'all' && cat === 'ALL') || adminCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setAdminCategoryFilter(cat === 'ALL' ? 'all' : cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-500 shadow-md shadow-red-900/40'
                        : 'bg-[#090a12] text-slate-400 border-red-950/60 hover:text-white hover:border-red-900/50'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {displayedTournaments.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#090a12] border border-red-950/70 text-center">
                <Trophy className="w-10 h-10 text-red-700 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-200 uppercase tracking-wider">No Matches in this Category</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Launch a new Free Fire MAX match room or switch filters</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold uppercase tracking-wider"
                >
                  Create Match Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedTournaments.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[#0f0f1c] border border-slate-800 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                          {t.category.replace('_', ' ')} · {t.mode}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              t.status?.toLowerCase() === 'live'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : t.status?.toLowerCase() === 'completed'
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {t.status}
                          </span>
                          <button
                            onClick={() => handleCancelAndDeleteTournament(t)}
                            className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                            title="Delete / Cancel Match & Auto Refund"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-white font-heading">{t.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Map: <strong className="text-slate-300">{t.map || (t as any).mapName}</strong> · Slots: <strong className="text-amber-400 font-mono">{t.joinedPlayers ? t.joinedPlayers.length : 0} / {t.maxSlots} Joined</strong>
                      </p>

                      <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-xl bg-slate-900 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Fee</span>
                          <span className="font-mono font-bold text-white">₹{t.entryFee}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Pool</span>
                          <span className="font-mono font-bold text-emerald-400">₹{t.totalPrizePool || (t as any).totalPool || 0}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Kill</span>
                          <span className="font-mono font-bold text-amber-400">₹{t.perKillReward || (t as any).perKill || 0}</span>
                        </div>
                      </div>

                      {/* Room ID & Pass Status */}
                      <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-slate-800/80 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span>Room Details:</span>
                        </div>
                        <div className="font-mono">
                          {t.roomId ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>ID: {t.roomId} · Pass: {t.roomPassword}</span>
                            </span>
                          ) : (
                            <span className="text-amber-400/90 flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Credentials Not Set (Pending Admin)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions for Tournament */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      {/* Room & Results Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setEditingRoomTour(t)}
                          className={`h-9 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            t.roomId
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-amber-500 hover:bg-amber-400 text-black border-amber-500 font-bold shadow-md shadow-amber-500/20'
                          }`}
                          title="Manually enter Free Fire Custom Room ID and Password"
                        >
                          <Key className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.roomId ? 'Update Credentials' : 'Set Room Details'}</span>
                        </button>

                        {t.status?.toLowerCase() !== 'completed' ? (
                          <button
                            onClick={() => setDeclaringResultsTour(t)}
                            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Declare Results / Distribute Prize</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-semibold flex items-center justify-center gap-1 cursor-not-allowed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Prizes Distributed</span>
                          </button>
                        )}
                      </div>

                      {/* Status Control Buttons */}
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Match Status:</span>
                          </span>
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 uppercase">
                            {t.status || 'UPCOMING'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetMatchStatus(t.id, 'UPCOMING')}
                            className={`h-7 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              t.status?.toUpperCase() === 'UPCOMING'
                                ? 'bg-blue-500/25 text-blue-300 border-blue-500 shadow-sm'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                            }`}
                          >
                            [ Set UPCOMING ]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetMatchStatus(t.id, 'LIVE')}
                            className={`h-7 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              t.status?.toUpperCase() === 'LIVE'
                                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500 shadow-sm animate-pulse'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                            }`}
                          >
                            [ Set LIVE ]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetMatchStatus(t.id, 'COMPLETED')}
                            className={`h-7 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              t.status?.toUpperCase() === 'COMPLETED'
                                ? 'bg-purple-500/25 text-purple-300 border-purple-500 shadow-sm'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                            }`}
                          >
                            [ Set COMPLETED ]
                          </button>
                        </div>
                      </div>

                      {/* Match Deletion Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteMatch(t.id)}
                          className="flex-1 h-8 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Permanently delete this match from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>🗑️ Delete Match</span>
                        </button>
                        {Array.isArray(t.joinedPlayers) && t.joinedPlayers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCancelAndDeleteTournament(t)}
                            className="h-8 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Refund registered players and cancel match"
                          >
                            <span>Refund & Cancel ({t.joinedPlayers.length})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: DEPOSIT REQUESTS ================= */}
        {activeTab === 'deposits' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold font-heading text-white">Deposit Requests Queue</h2>
                <p className="text-xs text-slate-400">
                  Verify UPI Reference / UTR Number. Approving credits the user's Deposit Cash instantly.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDepositFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      depositFilter === filter
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredDeposits.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
                No deposit requests found in this view.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDeposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-4 rounded-2xl bg-[#0f0f1c] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-extrabold font-mono text-white">₹{dep.amount}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-amber-400">
                          UTR: {dep.utrNumber}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                            dep.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : dep.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                        <span>Gamer IGN: <strong className="text-white">{dep.userIgn}</strong></span>
                        <span>·</span>
                        <span>Email: <strong className="text-slate-300 font-mono">{dep.userEmail}</strong></span>
                        <span>·</span>
                        <span>Time: {new Date(dep.createdAt).toLocaleString()}</span>
                      </div>

                      {dep.proofUrl && dep.proofUrl.startsWith('data:image') && (
                        <div className="pt-2">
                          <img
                            src={dep.proofUrl}
                            alt="Payment screenshot proof"
                            className="max-h-36 rounded-lg border border-slate-700 shadow-md object-contain bg-black"
                          />
                        </div>
                      )}
                    </div>

                    {dep.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveDeposit(dep)}
                          className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Credit ₹{dep.amount}</span>
                        </button>

                        <button
                          onClick={() => handleRejectDeposit(dep)}
                          className="h-10 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: PENDING WITHDRAWALS ================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold font-heading text-white">Withdrawal Payouts Queue</h2>
                <p className="text-xs text-slate-400">
                  Fulfill payouts via UPI transfer (with UTR) or generate Google Play Redeem Codes.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setWithdrawalFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      withdrawalFilter === filter
                        ? 'bg-emerald-500 text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredWithdrawals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
                No withdrawal requests found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl bg-[#0f0f1c] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-extrabold font-mono text-emerald-400">₹{w.amount}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 uppercase">
                          {w.method === 'upi' ? 'Direct UPI' : 'Google Play Redeem Code'}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                            w.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : w.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 space-y-0.5">
                        <p>
                          Player: <strong className="text-white">{w.userIgn}</strong> ({w.userEmail})
                        </p>
                        {w.method === 'upi' && (
                          <p className="font-mono text-slate-300">
                            Destination UPI VPA: <strong className="text-amber-400">{w.upiId}</strong>
                          </p>
                        )}
                        {w.method === 'redeem_code' && (
                          <p className="font-mono text-slate-300">
                            Deliver To Email: <strong className="text-amber-400">{w.deliveryEmail}</strong>
                          </p>
                        )}
                        {w.redeemCode && (
                          <p className="font-mono text-emerald-400 font-bold pt-1">
                            Dispatched Code: {w.redeemCode}
                          </p>
                        )}
                        {w.payoutUtr && (
                          <p className="font-mono text-slate-300 pt-1">
                            Disbursed Bank UTR: <strong className="text-white">{w.payoutUtr}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {w.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setFulfillingWithdrawal(w)}
                          className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>{w.method === 'upi' ? 'Mark Paid (Enter UTR)' : 'Send Redeem Code'}</span>
                        </button>

                        <button
                          onClick={() => handleRejectWithdrawal(w)}
                          className="h-10 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Reject and refund winnings"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject & Refund</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: USER WALLET INSPECTOR ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold font-heading text-white">Registered Gamers & Wallet Inspector</h2>
                <p className="text-xs text-slate-400">
                  Inspect real-time balances, add/deduct funds manually, and enforce security bans.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search IGN, UID, or Email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0f0f1c]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121224] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Gamer IGN & UID</th>
                      <th className="py-3 px-4">Google Email</th>
                      <th className="py-3 px-4">Deposit Cash</th>
                      <th className="py-3 px-4">Winnings Cash</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white font-mono">{u.ign || 'Unnamed Gamer'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">UID: {u.freeFireUid || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white tabular-nums">
                          ₹{u.depositBalance ?? 0}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums">
                          ₹{u.winningsBalance ?? 0}
                        </td>
                        <td className="py-3 px-4">
                          {u.isBanned ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold">
                              Banned
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingWalletUser(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Modify Wallet Balance"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Adjust Cash</span>
                            </button>

                            <button
                              onClick={() => handleToggleBanUser(u)}
                              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                u.isBanned
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                              }`}
                              title={u.isBanned ? 'Unban Account' : 'Ban Suspicious Account'}
                            >
                              {u.isBanned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: ADMIN SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold font-heading text-white">Payment & QR Configuration</h2>
              <p className="text-xs text-slate-400">
                Update your official receiver UPI handle and tournament payout parameters.
              </p>
            </div>

            {settingsSaved && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Settings updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 p-5 rounded-2xl bg-[#0f0f1c] border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Official UPI ID (VPA) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={settings.upiId}
                  onChange={(e) => setSettings({ ...settings, upiId: e.target.value.replace(/%40/gi, '@').trim() })}
                  required
                  placeholder="e.g. 9005939633@ptyes"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Players will pay into this handle for deposits.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Merchant / Payee Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={settings.upiName}
                  onChange={(e) => setSettings({ ...settings, upiName: e.target.value })}
                  required
                  placeholder="e.g. Fire Arena Pro"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Min Deposit (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.minDeposit}
                    onChange={(e) => setSettings({ ...settings, minDeposit: parseInt(e.target.value) || 10 })}
                    min={5}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Min Withdrawal (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.minWithdrawal}
                    onChange={(e) => setSettings({ ...settings, minWithdrawal: parseInt(e.target.value) || 20 })}
                    min={10}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Support WhatsApp / Helpline
                </label>
                <input
                  type="text"
                  value={settings.supportWhatsapp}
                  onChange={(e) => setSettings({ ...settings, supportWhatsapp: e.target.value })}
                  placeholder="e.g. 919876543210"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tournament Platform Rules & Notes
                </label>
                <textarea
                  rows={3}
                  value={settings.rules}
                  onChange={(e) => setSettings({ ...settings, rules: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                Save Payment Settings
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ================= MODAL: CREATE TOURNAMENT ================= */}
      {showCreateModal && (
        <CreateTournamentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* ================= MODAL: EDIT ROOM ID & PASSWORD ================= */}
      {editingRoomTour && (
        <EditRoomModal
          tournament={editingRoomTour}
          isOpen={Boolean(editingRoomTour)}
          onClose={() => setEditingRoomTour(null)}
        />
      )}

      {/* ================= MODAL: DECLARE RESULTS & AUTO-PAYOUT ================= */}
      {declaringResultsTour && (
        <DeclareResultsModal
          tournament={declaringResultsTour}
          isOpen={Boolean(declaringResultsTour)}
          onClose={() => setDeclaringResultsTour(null)}
          onSuccess={(msg) => showToast(msg, 'success')}
        />
      )}

      {/* ================= MODAL: FULFILL WITHDRAWAL (UTR / REDEEM CODE) ================= */}
      {fulfillingWithdrawal && (
        <FulfillWithdrawalModal
          withdrawal={fulfillingWithdrawal}
          isOpen={Boolean(fulfillingWithdrawal)}
          onClose={() => setFulfillingWithdrawal(null)}
        />
      )}

      {/* ================= MODAL: ADJUST USER WALLET ================= */}
      {editingWalletUser && (
        <AdjustUserWalletModal
          targetUser={editingWalletUser}
          isOpen={Boolean(editingWalletUser)}
          onClose={() => setEditingWalletUser(null)}
        />
      )}

      {/* ================= MODAL: CONFIRM PERMANENT MATCH DELETION ================= */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0e0c18] border border-red-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-white font-heading">Delete Tournament Match</h3>
                <p className="text-xs text-slate-400 truncate">{matchToDelete.title || 'Selected Match'}</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-300 leading-relaxed">
              <strong className="block text-white mb-1">
                Are you sure you want to permanently delete this tournament match?
              </strong>
              <p className="text-slate-400 text-[11px]">
                This match will be permanently removed from all player screens in real-time and deleted from the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMatch(matchToDelete.id, true)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/80 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteLoading ? 'Deleting...' : 'Yes, Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING ADMIN TOAST ================= */}
      {adminToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md bg-[#0e0c18]/95 border-red-950/80 animate-in fade-in slide-in-from-top-2 duration-200">
          {adminToast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className={`text-xs font-semibold ${adminToast.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
            {adminToast.message}
          </span>
          <button
            onClick={() => setAdminToast(null)}
            className="text-slate-500 hover:text-white transition-colors cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------------- CREATE TOURNAMENT MODAL ---------------- */
const CreateTournamentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [matchTitle, setMatchTitle] = useState('');
  const [category, setCategory] = useState<TournamentCategory>('battle_royale');
  const [mode, setMode] = useState<TournamentMode>('Solo');
  const [mapName, setMapName] = useState('Bermuda');

  // React states initialized to empty string '' instead of default 0
  const [entryFee, setEntryFee] = useState('');
  const [perKill, setPerKill] = useState('');
  const [totalPool, setTotalPool] = useState('');
  const [rank1, setRank1] = useState('');
  const [rank2, setRank2] = useState('');
  const [maxSlots, setMaxSlots] = useState('48');
  const [startTime, setStartTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setMatchTitle('');
    setCategory('battle_royale');
    setMode('Solo');
    setMapName('Bermuda');
    setEntryFee('');
    setPerKill('');
    setTotalPool('');
    setRank1('');
    setRank2('');
    setMaxSlots('48');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      setCreating(true);

      const newMatch = {
        title: String(matchTitle || '').trim() || 'Free Fire CS Match',
        category: String(category || 'CS 1v1'),
        mode: String(mode || 'Solo'),
        map: String(mapName || 'Bermuda'),
        entryFee: Number(entryFee) || 0,
        perKill: Number(perKill) || 0,
        totalPool: Number(totalPool) || 0,
        rank1: Number(rank1) || 0,
        rank2: Number(rank2) || 0,
        maxSlots: Number(maxSlots) || 2,
        startTime: startTime ? String(startTime) : new Date().toISOString(),
        joinedPlayers: [] as Array<{ uid: string; ign: string; email?: string; joinedAt?: string }>,
        status: 'UPCOMING',
        roomId: '',
        roomPassword: '',
        createdAt: new Date().toISOString()
      };

      // 4-second safety timeout protection: NEVER stay stuck on "Creating..."
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Operation timed out (4s safety limit). Firestore did not respond in time.'));
        }, 4000);
      });

      // Write to collection 'matches'
      const matchDocRef = await Promise.race([
        addDoc(collection(db, 'matches'), newMatch),
        timeoutPromise
      ]);

      // Mirror to 'tournaments' collection for full backwards compatibility
      try {
        await setDoc(doc(db, 'tournaments', matchDocRef.id), {
          ...newMatch,
          id: matchDocRef.id,
          mapName: newMatch.map,
          perKillReward: newMatch.perKill,
          totalPrizePool: newMatch.totalPool,
          rank1Prize: newMatch.rank1,
          rank2Prize: newMatch.rank2,
          rank3Prize: 0,
          registeredCount: 0,
          joinedPlayers: [],
          status: 'upcoming' as TournamentStatus,
          updatedAt: newMatch.createdAt,
        });
      } catch (mirrorErr) {
        console.warn('Tournaments mirror sync note:', mirrorErr);
      }

      alert("Tournament created successfully!");
      resetForm();
      onClose();
    } catch (error: unknown) {
      console.error("Match creation error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      alert("Failed to create match: " + msg);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#090a14] border border-red-950/80 rounded-2xl p-5 sm:p-6 shadow-2xl relative my-auto">
        <h3 className="text-base font-black text-white font-heading uppercase tracking-wide mb-4">
          Create New Fire Arena Pro Match
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Match Title</label>
            <input
              type="text"
              value={matchTitle}
              onChange={(e) => setMatchTitle(e.target.value)}
              placeholder="e.g. Bermuda Mega Battle Royale"
              required
              className="w-full h-10 px-3 rounded-xl bg-[#06070a] border border-red-950/80 text-white placeholder-slate-500 focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as TournamentCategory;
                  setCategory(cat);
                  const str = String(cat).toUpperCase();
                  if (str.includes('1V1') || str.includes('1v1')) setMaxSlots('2');
                  else if (str.includes('2V2') || str.includes('2v2')) setMaxSlots('4');
                  else if (str.includes('CS')) setMaxSlots('8');
                  else setMaxSlots('48');
                }}
                className="w-full h-10 px-2 rounded-xl bg-[#06070a] border border-red-950/80 text-white font-bold"
              >
                <option value="FULL MAP">FULL MAP</option>
                <option value="FULL MAP 2">FULL MAP 2</option>
                <option value="CS HEAD">CS HEAD</option>
                <option value="LW 1V1">LW 1V1</option>
                <option value="LW 2V2">LW 2V2</option>
                <option value="CS 1V1">CS 1V1</option>
                <option value="CS 2V2">CS 2V2</option>
                <option value="LW HEAD">LW HEAD</option>
                <option value="LW LOSS">LW LOSS</option>
                <option value="LW ₹10">LW ₹10</option>
                <option value="NIGHT MODE">NIGHT MODE</option>
                <option value="FREE MATCH">FREE MATCH</option>
                <option value="battle_royale">Battle Royale</option>
                <option value="clash_squad_1v1">CS 1v1 (Classic)</option>
                <option value="clash_squad_4v4">CS 4v4 (Classic)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as TournamentMode)}
                className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
              >
                <option value="Solo">Solo</option>
                <option value="Duo">Duo</option>
                <option value="Squad">Squad</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Map</label>
              <select
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
              >
                <option value="Bermuda">Bermuda</option>
                <option value="Purgatory">Purgatory</option>
                <option value="Kalahari">Kalahari</option>
                <option value="Alpine">Alpine</option>
                <option value="NeXTerra">NeXTerra</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Entry Fee (₹)</label>
              <input
                type="number"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Per Kill (₹)</label>
              <input
                type="number"
                value={perKill}
                onChange={(e) => setPerKill(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Total Pool (₹)</label>
              <input
                type="number"
                value={totalPool}
                onChange={(e) => setTotalPool(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-emerald-400 font-bold placeholder-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">1st Rank (₹)</label>
              <input
                type="number"
                value={rank1}
                onChange={(e) => setRank1(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">2nd Rank (₹)</label>
              <input
                type="number"
                value={rank2}
                onChange={(e) => setRank2(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Max Slots</label>
              <input
                type="number"
                value={maxSlots}
                onChange={(e) => setMaxSlots(e.target.value)}
                placeholder="48"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Match Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-colors cursor-pointer shadow-lg shadow-red-950/60"
            >
              {creating ? 'Creating...' : 'Launch Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------------- EDIT ROOM ID & PASSWORD MODAL ---------------- */
const EditRoomModal: React.FC<{ tournament: Tournament; isOpen: boolean; onClose: () => void }> = ({
  tournament,
  isOpen,
  onClose,
}) => {
  const [roomId, setRoomId] = useState(tournament.roomId || '');
  const [roomPassword, setRoomPassword] = useState(tournament.roomPassword || '');
  const [status, setStatus] = useState(tournament.status || 'upcoming');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const trimmedId = roomId.trim();
    const trimmedPass = roomPassword.trim();

    try {
      // 1. Update tournaments collection
      try {
        await updateDoc(doc(db, 'tournaments', tournament.id), {
          roomId: trimmedId,
          roomPassword: trimmedPass,
          status,
          roomUnlockedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (tourErr) {
        console.warn('Update tournaments doc note:', tourErr);
      }

      // 2. Mirror update to matches collection
      try {
        const firestoreMatchStatus = status === 'live' ? 'LIVE' : status === 'completed' ? 'COMPLETED' : 'UPCOMING';
        await updateDoc(doc(db, 'matches', tournament.id), {
          roomId: trimmedId,
          roomPassword: trimmedPass,
          status: firestoreMatchStatus,
          roomUnlockedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (matchErr) {
        console.warn('Update matches doc note:', matchErr);
      }

      alert(`Room ID (${trimmedId}) & Password successfully published! Real-time credentials are now live on registered players' screens.`);
      onClose();
    } catch (err: unknown) {
      alert(`Error updating room details: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0f0f1c] border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Key className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">Set Room Details / Update Credentials</h3>
            <p className="text-[11px] text-amber-400/90 font-mono">Tournament: {tournament.title}</p>
          </div>
        </div>

        <div className="p-3 mb-4 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
          <p className="font-semibold text-white">Manual Custom Room Flow:</p>
          <p>1. Open Free Fire MAX on your device & create a Custom Room.</p>
          <p>2. Enter the generated Room ID & Room Password below.</p>
          <p>3. Tap <strong className="text-amber-400">"Publish Room ID"</strong> to reveal credentials to joined players only.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Free Fire Custom Room ID <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. 7489231"
              required
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Custom Room Password <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="e.g. 1234 or booyah"
              required
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Match Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="upcoming">Upcoming (Pre-Match / Waiting for Players)</option>
              <option value="live">Live Match In-Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Publishing...' : 'Publish Room ID'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------------- DECLARE RESULTS & AUTO-PAYOUT MODAL ---------------- */
const DeclareResultsModal: React.FC<{
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}> = ({
  tournament,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [playersList, setPlayersList] = useState<{ id: string; userId: string; userIgn: string; freeFireUid?: string }[]>([]);
  const [playerRanks, setPlayerRanks] = useState<Record<string, string>>({});
  const [playerKills, setPlayerKills] = useState<Record<string, number>>({});
  const [isDeclaring, setIsDeclaring] = useState(false);

  // Prize configuration values
  const perKillRate = Number(tournament.perKillReward || (tournament as any).perKill || 0);
  const rank1Reward = Number(tournament.rank1Prize || (tournament as any).rank1 || 0);
  const rank2Reward = Number(tournament.rank2Prize || (tournament as any).rank2 || 0);
  const rank3Reward = Number(tournament.rank3Prize || 0);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAllPlayers = async () => {
      const mergedMap = new Map<string, { id: string; userId: string; userIgn: string; freeFireUid?: string }>();

      // 1. Load from tournament.joinedPlayers array (Primary source of truth)
      if (Array.isArray(tournament.joinedPlayers)) {
        tournament.joinedPlayers.forEach((p) => {
          if (p.uid) {
            mergedMap.set(p.uid, {
              id: `${tournament.id}_${p.uid}`,
              userId: p.uid,
              userIgn: p.ign || 'Gamer',
              freeFireUid: (p as any).freeFireUid || '',
            });
          }
        });
      }

      // 2. Also check subcollection registrations
      try {
        const snap = await getDocs(collection(db, `tournaments/${tournament.id}/registrations`));
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.userId && !mergedMap.has(data.userId)) {
            mergedMap.set(data.userId, {
              id: d.id,
              userId: data.userId,
              userIgn: data.userIgn || 'Gamer',
              freeFireUid: data.freeFireUid || '',
            });
          }
        });
      } catch (err) {
        console.warn('Subcollection registration fetch note:', err);
      }

      const list = Array.from(mergedMap.values());
      setPlayersList(list);

      // Pre-populate default ranks and kills
      const initialRanks: Record<string, string> = {};
      const initialKills: Record<string, number> = {};
      list.forEach((p, index) => {
        initialRanks[p.userId] = index === 0 ? '1' : index === 1 ? '2' : '';
        initialKills[p.userId] = 0;
      });
      setPlayerRanks(initialRanks);
      setPlayerKills(initialKills);
    };

    fetchAllPlayers();
  }, [isOpen, tournament.id, tournament.joinedPlayers]);

  if (!isOpen) return null;

  // Calculate prize for a given player
  const calculatePlayerPrize = (userId: string) => {
    const kills = Number(playerKills[userId] || 0);
    const rank = playerRanks[userId] || '';
    let rankPrize = 0;
    if (rank === '1') rankPrize = rank1Reward;
    else if (rank === '2') rankPrize = rank2Reward;
    else if (rank === '3') rankPrize = rank3Reward;

    return (kills * perKillRate) + rankPrize;
  };

  // Total distributed prize calculation
  const totalPrizeDistributed = playersList.reduce((acc, p) => acc + calculatePlayerPrize(p.userId), 0);

  const handleDistributeWinnings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirm(`Are you sure you want to distribute ₹${totalPrizeDistributed} across ${playersList.length} players?\n\nThis will instantly credit each winner's withdrawable Winnings Balance in Firestore and set the match to COMPLETED.`)) {
      return;
    }

    setIsDeclaring(true);
    try {
      // Use Firestore writeBatch with FieldValue.increment() to eliminate interleaved read/write transaction errors
      const batch = writeBatch(db);
      const winnersSummary: any[] = [];

      // Update each evaluated player's winning balance directly with increment
      playersList.forEach((player) => {
        const kills = Number(playerKills[player.userId] || 0);
        const rankStr = playerRanks[player.userId] || '';
        const rankNum = rankStr ? parseInt(rankStr, 10) : 0;
        const prizeAmount = calculatePlayerPrize(player.userId);
        const isBooyah = rankNum === 1;

        if (prizeAmount > 0 || kills > 0 || isBooyah) {
          const userRef = doc(db, 'users', player.userId);
          batch.update(userRef, {
            winningBalance: increment(Number(prizeAmount)),
            winningsBalance: increment(Number(prizeAmount)),
            totalKills: increment(Number(kills || 0)),
            matchesWon: increment(isBooyah ? 1 : 0),
            tournamentsWon: increment(isBooyah ? 1 : 0),
            matchesPlayed: increment(1),
            totalEarnings: increment(Number(prizeAmount)),
            updatedAt: new Date().toISOString(),
          });

          // Create reward transaction history record
          if (prizeAmount > 0) {
            const historyRef = doc(collection(db, 'walletHistory'));
            batch.set(historyRef, {
              userId: player.userId,
              type: 'PRIZE_WINNING',
              amount: Number(prizeAmount),
              matchId: tournament.id,
              matchTitle: tournament.title || 'Custom Room',
              createdAt: new Date().toISOString(),
            });
          }

          winnersSummary.push({
            rank: rankNum || null,
            userId: player.userId,
            ign: player.userIgn,
            freeFireUid: player.freeFireUid || '',
            kills: kills,
            killReward: kills * perKillRate,
            rankReward: rankNum === 1 ? rank1Reward : rankNum === 2 ? rank2Reward : rankNum === 3 ? rank3Reward : 0,
            prizeWon: prizeAmount,
            isBooyah: isBooyah,
          });
        }
      });

      // Sort winners by rank (Rank 1 first)
      winnersSummary.sort((a, b) => (a.rank || 99) - (b.rank || 99));

      const resultsPayload = {
        declaredAt: new Date().toISOString(),
        totalDistributed: totalPrizeDistributed,
        winners: winnersSummary,
      };

      // Mark match as completed and distributed in both 'matches' and 'tournaments' collections
      const matchRef = doc(db, 'matches', tournament.id);
      batch.update(matchRef, {
        status: 'COMPLETED',
        prizesDistributed: true,
        completedAt: new Date().toISOString(),
        results: resultsPayload,
        updatedAt: new Date().toISOString(),
      });

      const tourRef = doc(db, 'tournaments', tournament.id);
      batch.update(tourRef, {
        status: 'completed',
        prizesDistributed: true,
        completedAt: new Date().toISOString(),
        results: resultsPayload,
        updatedAt: new Date().toISOString(),
      });

      // Commit all updates safely at once with writeBatch
      await batch.commit();

      if (onSuccess) {
        onSuccess('Prizes successfully distributed to all players!');
      } else {
        alert('Prizes successfully distributed to all players!');
      }

      onClose();
    } catch (err: unknown) {
      console.error('Error distributing winnings:', err);
      alert(`Failed to distribute winnings: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDeclaring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0a0a14] border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Award className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                Declare Match Result & Distribute Prizes
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Match: <span className="text-amber-400 font-semibold">{tournament.title}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prize Rates Overview Card */}
        <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Per Kill Reward</span>
            <span className="font-mono font-bold text-amber-400 text-sm">₹{perKillRate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Rank 1 (Booyah)</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">₹{rank1Reward}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Rank 2 Prize</span>
            <span className="font-mono font-bold text-teal-400 text-sm">₹{rank2Reward}</span>
          </div>
        </div>

        {/* Players List Form */}
        {playersList.length === 0 ? (
          <div className="p-6 text-center bg-slate-900/50 rounded-xl border border-slate-800 my-4">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-amber-400 font-semibold">No registered players found in this tournament.</p>
            <p className="text-[11px] text-slate-500 mt-1">Cannot declare results without registered players.</p>
          </div>
        ) : (
          <form onSubmit={handleDistributeWinnings} className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider font-semibold px-2">
                <span>Player</span>
                <div className="flex items-center gap-4 sm:gap-6">
                  <span>Rank</span>
                  <span>Kills</span>
                  <span className="w-20 text-right">Prize (₹)</span>
                </div>
              </div>

              {playersList.map((player) => {
                const prize = calculatePlayerPrize(player.userId);
                return (
                  <div
                    key={player.userId}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    {/* Player Info */}
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-white block truncate">{player.userIgn}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        UID: {player.freeFireUid || player.userId.slice(0, 10)}
                      </span>
                    </div>

                    {/* Rank Dropdown */}
                    <select
                      value={playerRanks[player.userId] || ''}
                      onChange={(e) =>
                        setPlayerRanks({
                          ...playerRanks,
                          [player.userId]: e.target.value,
                        })
                      }
                      className="h-8 px-2 rounded-lg bg-black border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">No Rank</option>
                      <option value="1">🥇 1st (Booyah)</option>
                      <option value="2">🥈 2nd Place</option>
                      <option value="3">🥉 3rd Place</option>
                    </select>

                    {/* Kills Input */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={playerKills[player.userId] ?? 0}
                        onChange={(e) =>
                          setPlayerKills({
                            ...playerKills,
                            [player.userId]: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-14 h-8 px-1 text-center rounded-lg bg-black border border-slate-700 text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                        title="Enter total kills confirmed for this player"
                      />
                    </div>

                    {/* Live Calculated Total Prize */}
                    <div className="w-20 text-right font-mono font-bold text-emerald-400 text-xs">
                      {prize > 0 ? `+₹${prize}` : '₹0'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Prize Pool Summary */}
            <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 flex items-center justify-between text-xs mt-3">
              <div>
                <span className="text-slate-400 block text-[11px]">Total Distribution Summary</span>
                <span className="text-slate-300 font-semibold">{playersList.length} Players Evaluated</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Total Payout</span>
                <span className="text-base font-bold font-mono text-emerald-400">₹{totalPrizeDistributed}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeclaring}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Award className="w-4 h-4 stroke-[2.5]" />
                <span>{isDeclaring ? 'Distributing Winnings...' : 'Distribute Winnings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ---------------- FULFILL WITHDRAWAL MODAL ---------------- */
const FulfillWithdrawalModal: React.FC<{ withdrawal: WithdrawalRequest; isOpen: boolean; onClose: () => void }> = ({
  withdrawal,
  isOpen,
  onClose,
}) => {
  const [payoutUtr, setPayoutUtr] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFulfill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const trimmedCode = redeemCode.trim().toUpperCase();

      // 1. Update Firestore withdrawal request with safe non-undefined fields
      const updateData: Record<string, any> = {
        status: 'approved',
        processedAt: new Date().toISOString(),
      };
      if (withdrawal.method === 'upi') {
        updateData.payoutUtr = payoutUtr.trim();
      }
      if (withdrawal.method === 'redeem_code') {
        updateData.redeemCode = trimmedCode;
      }

      await updateDoc(doc(db, 'withdrawalRequests', withdrawal.id), updateData);

      // 2. Dispatch automated email via Nodemailer if method is redeem_code
      if (withdrawal.method === 'redeem_code') {
        try {
          await fetch('/api/send-redeem-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toEmail: withdrawal.deliveryEmail || withdrawal.userEmail,
              ign: withdrawal.userIgn,
              amount: withdrawal.amount,
              redeemCode: trimmedCode,
            }),
          });
        } catch (mailErr) {
          console.warn('Nodemailer dispatch warning (code saved to profile):', mailErr);
        }
      }

      alert(
        withdrawal.method === 'redeem_code'
          ? `Google Play Code (${trimmedCode}) activated and dispatched via Nodemailer to ${withdrawal.userEmail}!`
          : `UPI withdrawal of ₹${withdrawal.amount} marked as paid with UTR ${payoutUtr.trim()}!`
      );
      onClose();
    } catch (err: unknown) {
      alert(`Error updating withdrawal: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0f0f1c] border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white font-heading mb-1">Fulfill Payout Request</h3>
        <p className="text-xs text-slate-400 mb-4">
          Amount: <strong className="text-emerald-400 font-mono">₹{withdrawal.amount}</strong> to{' '}
          <strong className="text-white">{withdrawal.userIgn}</strong> ({withdrawal.userEmail})
        </p>

        <form onSubmit={handleFulfill} className="space-y-4 text-xs">
          {withdrawal.method === 'upi' ? (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Bank Payout UTR / Ref Number <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={payoutUtr}
                onChange={(e) => setPayoutUtr(e.target.value)}
                placeholder="e.g. 430129849201"
                required
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">Paid to VPA: {withdrawal.upiId}</p>
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Google Play Redeem Code <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD-1234-EFGH-5678"
                required
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm uppercase"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Delivers to user profile and email: {withdrawal.deliveryEmail}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-500 font-bold text-black"
            >
              {isSubmitting ? 'Updating...' : 'Confirm Payout Completed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------------- ADJUST USER WALLET MODAL ---------------- */
const AdjustUserWalletModal: React.FC<{ targetUser: UserProfile; isOpen: boolean; onClose: () => void }> = ({
  targetUser,
  isOpen,
  onClose,
}) => {
  const [walletType, setWalletType] = useState<'deposit' | 'winnings'>('deposit');
  const [action, setAction] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<number>(50);
  const [reason, setReason] = useState<string>('Tournament adjustment / Bonus');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const field = walletType === 'deposit' ? 'depositBalance' : 'winningsBalance';
      const currentVal = targetUser[field] || 0;
      const change = action === 'add' ? amount : -amount;
      const finalVal = Math.max(0, currentVal + change);

      await updateDoc(doc(db, 'users', targetUser.uid), {
        [field]: finalVal,
        updatedAt: new Date().toISOString(),
      });

      alert(`Successfully ${action === 'add' ? 'credited' : 'deducted'} ₹${amount} in ${targetUser.ign}'s ${walletType} wallet.`);
      onClose();
    } catch (err: unknown) {
      alert(`Error adjusting wallet: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0f0f1c] border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white font-heading mb-1">Adjust Gamer Wallet</h3>
        <p className="text-xs text-slate-400 mb-4">
          Target: <strong className="text-white">{targetUser.ign}</strong> ({targetUser.email})
        </p>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Wallet Target</label>
              <select
                value={walletType}
                onChange={(e) => setWalletType(e.target.value as any)}
                className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
              >
                <option value="deposit">Deposit Cash (Current: ₹{targetUser.depositBalance || 0})</option>
                <option value="winnings">Winnings Cash (Current: ₹{targetUser.winningsBalance || 0})</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
                className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
              >
                <option value="add">+ Add / Credit</option>
                <option value="deduct">- Deduct / Debit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Amount (₹)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
              required
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Adjustment Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-500 font-bold text-black"
            >
              {isSaving ? 'Updating...' : 'Save Wallet Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
