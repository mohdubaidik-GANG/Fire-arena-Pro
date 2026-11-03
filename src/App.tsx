import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Wallet,
  Shield,
  HelpCircle,
  Crosshair,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Zap,
  Sword,
  Target,
  Coins
} from 'lucide-react';
import { collection, query, onSnapshot, getDocs, setDoc, doc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGate } from './components/AuthGate';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { Header } from './components/Header';
import { TournamentCard } from './components/TournamentCard';
import { JoinMatchModal } from './components/JoinMatchModal';
import { WalletModal } from './components/WalletModal';
import { ProfileModal } from './components/ProfileModal';
import { WalletAndCareerStats } from './components/WalletAndCareerStats';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { UnauthorizedScreen } from './components/Admin/UnauthorizedScreen';
import { Tournament, TournamentRegistration, TournamentCategory } from './types';

// Root App Component
export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}

// Router and Main Content Controller
function MainRouter() {
  const { user, profile, loading, isAdmin, needsProfileSetup, logout } = useAuth();

  // URL Path detection for /admin route
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  // Sync browser path on popstate
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Dynamic Role-Based Auto Redirection on Google Sign-In & on page reload:
  useEffect(() => {
    if (!user || loading) return;

    if (isAdmin) {
      // Super Admin (ubedmo650@gmail.com): auto-switch route to /admin if not already on /admin
      if (window.location.pathname !== '/admin') {
        window.history.replaceState(null, '', '/admin');
        setCurrentPath('/admin');
      }
    }
  }, [user, isAdmin, loading]);

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  const handleLogout = async () => {
    await logout();
    window.history.replaceState(null, '', '/');
    setCurrentPath('/');
  };

  // 1. Mandatory Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07070b] text-white">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse mb-3">
          <Flame className="w-6 h-6 text-amber-400 stroke-[2.5]" />
        </div>
        <div className="text-xs font-mono uppercase tracking-widest text-slate-400">
          Loading FireArena MAX...
        </div>
      </div>
    );
  }

  // 2. Unified Google Sign-In Entry:
  // "App ke starting me sirf ek hi 'Sign in with Google' screen rahe."
  if (!user) {
    return <AuthGate />;
  }

  // 3. Dynamic Auto-Route for Super Admin (ubedmo650@gmail.com):
  // "Agar logged-in email EXACT 'ubedmo650@gmail.com' hai: App turant Admin Command Dashboard open karegi."
  if (isAdmin) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  // 4. Normal Gamer Route Protection:
  // If a normal user manually navigates to /admin, show Unauthorized Access Denied
  const isAdminPath = currentPath === '/admin' || currentPath.startsWith('/admin/');
  if (isAdminPath) {
    return <UnauthorizedScreen onLogout={handleLogout} onBackToArena={() => navigateTo('/')} />;
  }

  // 5. First-time profile setup for normal gamers (IGN & Free Fire UID)
  if (needsProfileSetup) {
    return <ProfileSetupModal />;
  }

  // 6. Gamer Tournament Arena (no admin links/options exposed)
  return <PlayerArena onNavigate={navigateTo} onLogout={handleLogout} />;
}

// ---------------- PLAYER ARENA SCREEN ---------------- //
interface PlayerArenaProps {
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

function PlayerArena({ onNavigate, onLogout }: PlayerArenaProps) {
  const { user, profile } = useAuth();

  // Navigation Filter & Tabs
  const [activeCategory, setActiveCategory] = useState<'all' | TournamentCategory>('all');
  const [activeTab, setActiveTab] = useState<'tournaments' | 'my_matches' | 'wallet_stats' | 'rules'>('tournaments');

  // Modals State
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletInitialTab, setWalletInitialTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedTournamentToJoin, setSelectedTournamentToJoin] = useState<Tournament | null>(null);

  // Tournaments & Registrations Data
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<Record<string, TournamentRegistration>>({});
  const [fetchingTournaments, setFetchingTournaments] = useState(true);

  // Realtime Tournaments & Matches Listener & Auto-Seeding
  useEffect(() => {
    const tourneyMap = new Map<string, Tournament>();

    const updateState = () => {
      const list = Array.from(tourneyMap.values());
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setTournaments(list);
      setFetchingTournaments(false);
    };

    const unsubTournaments = onSnapshot(
      collection(db, 'tournaments'),
      async (snapshot) => {
        if (snapshot.empty && tourneyMap.size === 0) {
          await seedDefaultTournaments();
          setFetchingTournaments(false);
        } else {
          snapshot.docs.forEach((docSnap) => {
            tourneyMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Tournament);
          });
          updateState();
        }
      },
      (error) => {
        console.error('Error fetching tournaments:', error);
        setFetchingTournaments(false);
      }
    );

    const unsubMatches = onSnapshot(
      collection(db, 'matches'),
      (snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          tourneyMap.set(docSnap.id, {
            id: docSnap.id,
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
            registeredCount: Array.isArray(data.joinedPlayers) ? data.joinedPlayers.length : (data.registeredCount || 0),
            startTime: data.startTime || new Date().toISOString(),
            status: ((data.status || 'UPCOMING').toLowerCase() === 'upcoming' ? 'upcoming' : data.status) as any,
            roomId: data.roomId || '',
            roomPassword: data.roomPassword || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
            ...data,
          } as unknown as Tournament);
        });
        updateState();
      },
      (error) => {
        console.warn('Matches query note:', error);
      }
    );

    return () => {
      unsubTournaments();
      unsubMatches();
    };
  }, []);

  // Listen to user's registered tournaments
  useEffect(() => {
    if (!user || tournaments.length === 0) return;

    const unsubs: (() => void)[] = [];

    tournaments.forEach((t) => {
      const regRef = doc(db, `tournaments/${t.id}/registrations`, `${t.id}_${user.uid}`);
      const unsub = onSnapshot(
        regRef,
        (snap) => {
          if (snap.exists()) {
            setMyRegistrations((prev) => ({
              ...prev,
              [t.id]: snap.data() as TournamentRegistration,
            }));
          } else {
            setMyRegistrations((prev) => {
              const updated = { ...prev };
              delete updated[t.id];
              return updated;
            });
          }
        },
        () => {
          // Silent catch
        }
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user, tournaments]);

  // Seed 3 tournaments if database has no tournaments
  const seedDefaultTournaments = async () => {
    const defaultList: Omit<Tournament, 'id'>[] = [
      {
        title: 'Bermuda Mega Battle Royale (Solo)',
        category: 'battle_royale',
        mode: 'Solo',
        map: 'Bermuda',
        entryFee: 30,
        totalPrizePool: 1200,
        perKillReward: 15,
        rank1Prize: 400,
        rank2Prize: 200,
        rank3Prize: 100,
        maxSlots: 48,
        registeredCount: 36,
        startTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        status: 'upcoming',
        roomId: '',
        roomPassword: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        title: 'Clash Squad 1v1 Sniper & Desert Eagle',
        category: 'clash_squad_1v1',
        mode: 'Solo',
        map: 'Bermuda Remastered',
        entryFee: 50,
        totalPrizePool: 90,
        perKillReward: 0,
        rank1Prize: 90,
        rank2Prize: 0,
        rank3Prize: 0,
        maxSlots: 2,
        registeredCount: 1,
        startTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        status: 'upcoming',
        roomId: '',
        roomPassword: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        title: 'Clash Squad 4v4 High Stakes Pro Wars',
        category: 'clash_squad_4v4',
        mode: 'Squad',
        map: 'Alpine',
        entryFee: 40,
        totalPrizePool: 300,
        perKillReward: 20,
        rank1Prize: 220,
        rank2Prize: 80,
        rank3Prize: 0,
        maxSlots: 8,
        registeredCount: 6,
        startTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
        status: 'upcoming',
        roomId: '',
        roomPassword: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    try {
      for (const t of defaultList) {
        await addDoc(collection(db, 'tournaments'), t);
      }
    } catch (e) {
      console.warn('Auto-seed completed or skipped');
    }
  };

  const handleOpenWallet = (tab: 'overview' | 'deposit' | 'withdraw' | 'history' = 'overview') => {
    setWalletInitialTab(tab);
    setWalletModalOpen(true);
  };

  // Filter tournaments (automatically exclude any cancelled matches)
  const filteredTournaments = tournaments.filter((t) => {
    if (t.status === 'cancelled') return false;
    if (activeTab === 'my_matches') {
      return Boolean(myRegistrations[t.id]);
    }
    if (activeCategory === 'all') return true;
    return t.category === activeCategory;
  });

  const myRegisteredCount = Object.keys(myRegistrations).length;

  return (
    <div className="min-h-screen bg-[#07070b] text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        onOpenWallet={handleOpenWallet}
        onOpenProfile={() => setProfileModalOpen(true)}
        onLogout={onLogout}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* Hero Banner / Quick Announcements */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#131322] to-orange-500/10 border border-amber-500/30 p-5 sm:p-6 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-mono font-bold uppercase tracking-wider">
                  Booyah Guaranteed
                </span>
                <span className="text-xs text-amber-400 font-mono">Daily Free Fire MAX Rooms</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading tracking-tight">
                Play Customs. Win Real Cash. Withdraw Instantly.
              </h2>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Deposit via PhonePe/GPay QR code. Room ID & Password unlock 15 minutes before match start. Fast payouts via direct UPI & Google Play Redeem Codes.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => handleOpenWallet('deposit')}
                className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4 stroke-[2.5]" />
                <span>Deposit via UPI</span>
              </button>

              <button
                onClick={() => handleOpenWallet('withdraw')}
                className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Payouts</span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          {/* Main View Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 self-start overflow-x-auto">
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tournaments'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>All Tournaments</span>
            </button>

            <button
              onClick={() => setActiveTab('my_matches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'my_matches'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>My Matches</span>
              {myRegisteredCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-black font-mono text-[10px] font-bold flex items-center justify-center">
                  {myRegisteredCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('wallet_stats')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'wallet_stats'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Wallet & Career Stats</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Rules & Help</span>
            </button>
          </div>

          {/* Sub-Category Filter (Only visible on All Tournaments) */}
          {activeTab === 'tournaments' && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Modes
              </button>
              <button
                onClick={() => setActiveCategory('battle_royale')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === 'battle_royale'
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Classic BR
              </button>
              <button
                onClick={() => setActiveCategory('clash_squad_1v1')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === 'clash_squad_1v1'
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CS 1v1
              </button>
              <button
                onClick={() => setActiveCategory('clash_squad_4v4')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === 'clash_squad_4v4'
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CS 4v4
              </button>
            </div>
          )}
        </div>

        {/* ================= TAB 1 & 2: TOURNAMENTS GRID ================= */}
        {(activeTab === 'tournaments' || activeTab === 'my_matches') && (
          <div>
            {fetchingTournaments ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Synchronizing live match rooms...
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">
                  {activeTab === 'my_matches'
                    ? "You haven't joined any tournaments yet"
                    : 'No tournaments match this filter'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {activeTab === 'my_matches'
                    ? 'Browse upcoming Free Fire MAX matches, join a slot, and your Room ID & Password will unlock here!'
                    : 'Check back shortly or explore other categories.'}
                </p>
                {activeTab === 'my_matches' && (
                  <button
                    onClick={() => setActiveTab('tournaments')}
                    className="px-4 py-2 rounded-xl bg-amber-500 font-bold text-black text-xs cursor-pointer"
                  >
                    Browse Open Matches
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    userRegistration={myRegistrations[tournament.id]}
                    onJoinClick={(tour) => setSelectedTournamentToJoin(tour)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: WALLET & CAREER STATS ================= */}
        {activeTab === 'wallet_stats' && (
          <div className="space-y-6">
            <WalletAndCareerStats
              onOpenDeposit={() => handleOpenWallet('deposit')}
              onOpenWithdraw={() => handleOpenWallet('withdraw')}
            />
          </div>
        )}

        {/* ================= TAB 3: RULES & SUPPORT ================= */}
        {activeTab === 'rules' && (
          <div className="max-w-3xl space-y-6">
            <div className="p-6 rounded-2xl bg-[#0e0e18] border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>Tournament Fair Play & Arena Rules</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400 block">1. Free Fire IGN & UID Verification</span>
                  <p className="text-slate-400">
                    Your In-Game Name (IGN) and numeric Free Fire UID in FireArena MAX MUST match your in-game profile. If your name differs, you will be kicked from the custom room without a refund.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400 block">2. Custom Room ID & Password</span>
                  <p className="text-slate-400">
                    Room credentials unlock exclusively on registered players' screens 15 minutes before match start. Sharing credentials with unregistered players leads to permanent account ban.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400 block">3. Dual Wallet Accounting</span>
                  <p className="text-slate-400">
                    Deposit Cash: Used solely for match entry fees.
                    <br />
                    Winnings Cash: 100% withdrawable via direct UPI transfer or official Google Play Redeem Code voucher.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400 block">4. Zero Tolerance for Hacks & Teaming</span>
                  <p className="text-slate-400">
                    Hacking, config scripts, teaming in Solo matches, or emulator bypass results in instant forfeiture of balance and device hardware ban.
                  </p>
                </div>
              </div>
            </div>

            {/* Helpline / Support Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-teal-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-bold text-white font-heading">Need Help with Deposits or Match Rooms?</h4>
                <p className="text-xs text-slate-400">Our esports tournament operations team is online 24/7.</p>
              </div>

              <a
                href="https://wa.me/919876543210?text=Hi%20FireArena%20Support,%20I%20need%20help%20with%20my%20tournament%20wallet"
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition-colors shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Helpline</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Join Match Modal */}
      {selectedTournamentToJoin && (
        <JoinMatchModal
          tournament={selectedTournamentToJoin}
          isOpen={Boolean(selectedTournamentToJoin)}
          onClose={() => setSelectedTournamentToJoin(null)}
          onSuccess={() => {
            alert('Slot registered! Check your "My Matches" tab for room credentials.');
          }}
          onOpenDeposit={() => handleOpenWallet('deposit')}
        />
      )}

      {/* Wallet Modal (Deposit & Withdraw) */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        initialTab={walletInitialTab}
      />

      {/* Gamer Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenWallet={() => handleOpenWallet('overview')}
      />
    </div>
  );
}
