import React, { useState, useEffect } from 'react';
import {
  Shield,
  Trophy,
  Wallet,
  Users,
  Settings,
  PlusCircle,
  CheckCircle2,
  XCircle,
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
  runTransaction
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
  TournamentMode
} from '../../types';

interface AdminDashboardProps {
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { user, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tournaments' | 'deposits' | 'withdrawals' | 'users' | 'settings'>('tournaments');

  // Tournaments State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
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
    upiId: 'firearenapay@okaxis',
    upiName: 'FireArena MAX Esports',
    qrCodeUrl: '',
    supportWhatsapp: '919876543210',
    minDeposit: 20,
    minWithdrawal: 50,
    rules: 'Entry fee is deducted from Deposit balance. Winnings can be withdrawn via UPI or Redeem codes.',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Real-time Listeners for all collections
  useEffect(() => {
    // 1. Tournaments Listener
    const unsubTournaments = onSnapshot(
      collection(db, 'tournaments'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setTournaments(list);
      },
      (error) => {
        console.error('Error fetching tournaments:', error);
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
          setSettings(docSnap.data() as AdminSettings);
        }
      },
      (error) => {
        console.warn('Settings document not yet initialized:', error);
      }
    );

    return () => {
      unsubTournaments();
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

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
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

  const pendingDepositsCount = deposits.filter((d) => d.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#07070b] text-slate-100 pb-16">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#0c0c16]/95 backdrop-blur-md border-b border-amber-500/30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold font-heading text-white tracking-tight">
                  FireArena Command Center
                </h1>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Operator: <span className="text-amber-400">{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="hidden sm:inline">Gamer Arena</span>
            </a>

            <button
              onClick={onLogout || logout}
              className="h-9 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tournaments'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Tournaments Engine ({tournaments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'deposits'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Deposit Requests</span>
            {pendingDepositsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-mono">
                {pendingDepositsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'withdrawals'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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
            className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Inspector ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
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
                <h2 className="text-xl font-bold font-heading text-white">Tournament Match Engine</h2>
                <p className="text-xs text-slate-400">
                  Manage custom rooms, unlock real-time credentials, and auto-disburse kill & rank prizes.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Create New Tournament</span>
              </button>
            </div>

            {tournaments.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Tournaments Created Yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Launch your first Free Fire MAX match room</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold"
                >
                  Create Tournament Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[#0f0f1c] border border-slate-800 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                          {t.category.replace('_', ' ')} · {t.mode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            t.status === 'live'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : t.status === 'completed'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white font-heading">{t.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Map: <strong className="text-slate-300">{t.map}</strong> · Slots: <strong className="text-amber-400 font-mono">{t.registeredCount}/{t.maxSlots}</strong>
                      </p>

                      <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-xl bg-slate-900 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Fee</span>
                          <span className="font-mono font-bold text-white">₹{t.entryFee}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Pool</span>
                          <span className="font-mono font-bold text-emerald-400">₹{t.totalPrizePool}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Kill</span>
                          <span className="font-mono font-bold text-amber-400">₹{t.perKillReward}</span>
                        </div>
                      </div>

                      {/* Room ID & Pass Status */}
                      <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-slate-800/80 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span>Room:</span>
                        </div>
                        <div className="font-mono">
                          {t.roomId ? (
                            <span className="text-amber-400 font-bold">{t.roomId} / {t.roomPassword}</span>
                          ) : (
                            <span className="text-slate-500">Not Set</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions for Tournament */}
                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setEditingRoomTour(t)}
                        className="h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Room ID & Pass</span>
                      </button>

                      {t.status !== 'completed' ? (
                        <button
                          onClick={() => setDeclaringResultsTour(t)}
                          className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Declare Results</span>
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
                  onChange={(e) => setSettings({ ...settings, upiId: e.target.value.trim() })}
                  required
                  placeholder="e.g. firearenapay@okaxis"
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
                  placeholder="e.g. FireArena MAX Esports"
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
    </div>
  );
};

/* ---------------- CREATE TOURNAMENT MODAL ---------------- */
const CreateTournamentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('Free Fire MAX Bermuda Clash');
  const [category, setCategory] = useState<TournamentCategory>('battle_royale');
  const [mode, setMode] = useState<TournamentMode>('Solo');
  const [map, setMap] = useState('Bermuda');
  const [entryFee, setEntryFee] = useState<number>(30);
  const [perKillReward, setPerKillReward] = useState<number>(15);
  const [totalPrizePool, setTotalPrizePool] = useState<number>(1200);
  const [rank1Prize, setRank1Prize] = useState<number>(400);
  const [rank2Prize, setRank2Prize] = useState<number>(200);
  const [rank3Prize, setRank3Prize] = useState<number>(100);
  const [maxSlots, setMaxSlots] = useState<number>(48);
  const [startTime, setStartTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newTour: Omit<Tournament, 'id'> = {
        title,
        category,
        mode,
        map,
        entryFee,
        perKillReward,
        totalPrizePool,
        rank1Prize,
        rank2Prize,
        rank3Prize,
        maxSlots,
        registeredCount: 0,
        startTime: new Date(startTime).toISOString(),
        status: 'upcoming',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'tournaments'), newTour);
      onClose();
    } catch (err: unknown) {
      alert(`Error creating tournament: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0f0f1c] border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl relative my-auto">
        <h3 className="text-base font-bold text-white font-heading mb-4">Create New Tournament Match</h3>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Match Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as TournamentCategory;
                  setCategory(cat);
                  if (cat === 'clash_squad_1v1') setMaxSlots(2);
                  else if (cat === 'clash_squad_4v4') setMaxSlots(8);
                  else setMaxSlots(48);
                }}
                className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
              >
                <option value="battle_royale">Battle Royale</option>
                <option value="clash_squad_1v1">CS 1v1</option>
                <option value="clash_squad_4v4">CS 4v4</option>
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
                value={map}
                onChange={(e) => setMap(e.target.value)}
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
                onChange={(e) => setEntryFee(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Per Kill (₹)</label>
              <input
                type="number"
                value={perKillReward}
                onChange={(e) => setPerKillReward(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Total Pool (₹)</label>
              <input
                type="number"
                value={totalPrizePool}
                onChange={(e) => setTotalPrizePool(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-emerald-400 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">1st Rank (₹)</label>
              <input
                type="number"
                value={rank1Prize}
                onChange={(e) => setRank1Prize(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">2nd Rank (₹)</label>
              <input
                type="number"
                value={rank2Prize}
                onChange={(e) => setRank2Prize(parseInt(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Max Slots</label>
              <input
                type="number"
                value={maxSlots}
                onChange={(e) => setMaxSlots(parseInt(e.target.value) || 12)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
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
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 font-bold text-black"
            >
              {isSubmitting ? 'Creating...' : 'Launch Tournament'}
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
  const [status, setStatus] = useState(tournament.status);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        roomId: roomId.trim(),
        roomPassword: roomPassword.trim(),
        status,
        roomUnlockedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
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
        <h3 className="text-base font-bold text-white font-heading mb-1">Update Custom Room Credentials</h3>
        <p className="text-xs text-slate-400 mb-4">
          Credentials unlock instantly on the phones of registered players only.
        </p>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Free Fire Custom Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. 9812401"
              required
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Custom Room Password</label>
            <input
              type="text"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="e.g. 1234 or booyah"
              required
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Match Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
            >
              <option value="upcoming">Upcoming (Pre-Match)</option>
              <option value="live">Live Match In-Progress</option>
              <option value="completed">Completed</option>
            </select>
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
              {isSaving ? 'Broadcasting...' : 'Broadcast to Registered Players'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------------- DECLARE RESULTS & AUTO-PAYOUT MODAL ---------------- */
const DeclareResultsModal: React.FC<{ tournament: Tournament; isOpen: boolean; onClose: () => void }> = ({
  tournament,
  isOpen,
  onClose,
}) => {
  const [registrations, setRegistrations] = useState<{ id: string; userId: string; userIgn: string; kills: number }[]>([]);
  const [rank1UserId, setRank1UserId] = useState<string>('');
  const [rank2UserId, setRank2UserId] = useState<string>('');
  const [rank3UserId, setRank3UserId] = useState<string>('');
  const [killsMap, setKillsMap] = useState<Record<string, number>>({});
  const [isDeclaring, setIsDeclaring] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchRegs = async () => {
      const snap = await getDocs(collection(db, `tournaments/${tournament.id}/registrations`));
      const list = snap.docs.map((d) => ({
        id: d.id,
        userId: d.data().userId,
        userIgn: d.data().userIgn,
        kills: 0,
      }));
      setRegistrations(list);
      if (list[0]) setRank1UserId(list[0].userId);
      if (list[1]) setRank2UserId(list[1].userId);
      if (list[2]) setRank3UserId(list[2].userId);
    };
    fetchRegs();
  }, [isOpen, tournament.id]);

  if (!isOpen) return null;

  const handleDeclare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('This will immediately credit the prize money (Rank splits + Kill rewards) directly into the winners\' Winnings Wallets. Confirm distribution?')) {
      return;
    }

    setIsDeclaring(true);
    try {
      await runTransaction(db, async (transaction) => {
        const winnersSummary: any[] = [];

        // 1. Calculate each registered player's prize and credit their Winnings Balance
        for (const reg of registrations) {
          const kills = killsMap[reg.userId] || 0;
          let rank = 0;
          let prize = kills * (tournament.perKillReward || 0);

          if (reg.userId === rank1UserId) {
            rank = 1;
            prize += tournament.rank1Prize || 0;
          } else if (reg.userId === rank2UserId) {
            rank = 2;
            prize += tournament.rank2Prize || 0;
          } else if (reg.userId === rank3UserId) {
            rank = 3;
            prize += tournament.rank3Prize || 0;
          }

          if (prize > 0) {
            const userRef = doc(db, 'users', reg.userId);
            const userSnap = await transaction.get(userRef);
            if (userSnap.exists()) {
              const currentWinnings = userSnap.data()?.winningsBalance || 0;
              transaction.update(userRef, {
                winningsBalance: currentWinnings + prize,
                updatedAt: new Date().toISOString(),
              });
            }
          }

          if (rank > 0 || kills > 0) {
            winnersSummary.push({
              rank,
              userId: reg.userId,
              ign: reg.userIgn,
              kills,
              prizeWon: prize,
            });
          }
        }

        // Sort winners by rank
        winnersSummary.sort((a, b) => (a.rank || 99) - (b.rank || 99));

        // 2. Update Tournament status to 'completed' and record results
        const tourRef = doc(db, 'tournaments', tournament.id);
        transaction.update(tourRef, {
          status: 'completed',
          results: {
            declaredAt: new Date().toISOString(),
            winners: winnersSummary,
          },
          updatedAt: new Date().toISOString(),
        });
      });

      alert('Booyah! Tournament results declared and winnings credited to participants.');
      onClose();
    } catch (err: unknown) {
      alert(`Failed to declare results: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDeclaring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0f0f1c] border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl relative my-auto">
        <h3 className="text-base font-bold text-white font-heading mb-1">Declare Match Results & Distribute Cash</h3>
        <p className="text-xs text-slate-400 mb-4">
          Select Booyah winner, ranks, and kill counts. Payouts credit immediately to Winnings Wallets.
        </p>

        {registrations.length === 0 ? (
          <p className="text-xs text-amber-400 p-4 bg-amber-500/10 rounded-xl">
            No registered players found in this tournament. Cannot declare results.
          </p>
        ) : (
          <form onSubmit={handleDeclare} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-amber-400 mb-1">#1 Booyah (Rank 1)</label>
                <select
                  value={rank1UserId}
                  onChange={(e) => setRank1UserId(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                >
                  {registrations.map((r) => (
                    <option key={r.userId} value={r.userId}>
                      {r.userIgn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Rank 2</label>
                <select
                  value={rank2UserId}
                  onChange={(e) => setRank2UserId(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                >
                  <option value="">None</option>
                  {registrations.map((r) => (
                    <option key={r.userId} value={r.userId}>
                      {r.userIgn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Rank 3</label>
                <select
                  value={rank3UserId}
                  onChange={(e) => setRank3UserId(e.target.value)}
                  className="w-full h-10 px-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                >
                  <option value="">None</option>
                  {registrations.map((r) => (
                    <option key={r.userId} value={r.userId}>
                      {r.userIgn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Enter Kills Per Player (₹{tournament.perKillReward}/Kill)</label>
              <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
                {registrations.map((r) => (
                  <div key={r.userId} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-mono text-white truncate">{r.userIgn}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-slate-500 font-mono">Kills:</span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={killsMap[r.userId] ?? 0}
                        onChange={(e) =>
                          setKillsMap({
                            ...killsMap,
                            [r.userId]: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-14 h-8 px-2 rounded bg-black border border-slate-700 text-center text-amber-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
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
                disabled={isDeclaring}
                className="px-5 py-2 rounded-xl bg-emerald-500 font-bold text-black"
              >
                {isDeclaring ? 'Distributing Winnings...' : 'Credit Prizes & Complete Match'}
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

      // 1. Update Firestore withdrawal request
      await updateDoc(doc(db, 'withdrawalRequests', withdrawal.id), {
        status: 'approved',
        payoutUtr: withdrawal.method === 'upi' ? payoutUtr.trim() : undefined,
        redeemCode: withdrawal.method === 'redeem_code' ? trimmedCode : undefined,
        processedAt: new Date().toISOString(),
      });

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
