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
  Target,
  Coins,
  User,
  Gamepad2,
  CreditCard,
  LogOut,
  Settings,
  Edit3,
  Megaphone,
  Headphones,
  Bell,
  Share2,
  Gift,
  FileQuestion,
  Users2,
  Smartphone,
  Info,
  Check,
  Copy,
  ArrowRight,
  Crown,
  Receipt,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { collection, query, where, limit, onSnapshot, getDocs, getDoc, setDoc, doc, addDoc, updateDoc, increment } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { db } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGate } from './components/AuthGate';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { Header } from './components/Header';
import { TournamentCard } from './components/TournamentCard';
import { WalletAndCareerStats } from './components/WalletAndCareerStats';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { UnauthorizedScreen } from './components/Admin/UnauthorizedScreen';
import { Tournament, TournamentRegistration, TournamentCategory } from './types';
import { sound } from './utils/audio';

// Lazy loaded modals for fast initial bundle and zero lag
const JoinMatchModal = React.lazy(() => import('./components/JoinMatchModal').then(m => ({ default: m.JoinMatchModal })));
const WalletModal = React.lazy(() => import('./components/WalletModal').then(m => ({ default: m.WalletModal })));
const ProfileModal = React.lazy(() => import('./components/ProfileModal').then(m => ({ default: m.ProfileModal })));
const MatchRulesModal = React.lazy(() => import('./components/MatchRulesModal').then(m => ({ default: m.MatchRulesModal })));
const ProofSubmissionModal = React.lazy(() => import('./components/ProofSubmissionModal').then(m => ({ default: m.ProofSubmissionModal })));
const NotificationCenterModal = React.lazy(() => import('./components/NotificationCenterModal').then(m => ({ default: m.NotificationCenterModal })));

// React Error Boundary Component to prevent white/black screen freeze
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Fire Arena Pro ErrorBoundary]:', error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.removeItem('cached_tournaments');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07080f] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-600/20">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-heading font-black uppercase tracking-wider mb-2 text-white">
            Connection or Display Interrupted
          </h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            {this.state.error?.message ||
              'A temporary network or rendering error occurred. Tap below to reload the esports arena.'}
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950/60 cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Arena</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Root App Component
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Router and Main Content Controller
function MainRouter() {
  const { user, profile, loading, isAdmin, needsProfileSetup, logout } = useAuth();
  const [loadingExceeded, setLoadingExceeded] = useState(false);

  // URL Path detection for /admin route
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  // Safety timer so loading state never freezes indefinitely
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingExceeded(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setLoadingExceeded(false);
    }
  }, [loading]);

  // Sync browser path on popstate
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Dynamic Role-Based Auto Redirection for Admin
  useEffect(() => {
    if (!user || loading) return;

    if (isAdmin) {
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

  // 1. Mandatory Loading State (with automatic timeout fallback)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#06070a] text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.5)] animate-pulse mb-3">
          <Gamepad2 className="w-8 h-8 text-white stroke-[2.5]" />
        </div>
        <div className="text-xs font-heading font-black uppercase tracking-widest text-red-500 mb-1">
          FIRE-ARENA-PRO ESPORTS ARENA
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Connecting to secure gaming server...
        </div>

        {loadingExceeded && (
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="mt-6 px-4 py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Taking too long? Tap to Reload</span>
          </button>
        )}
      </div>
    );
  }

  // 2. Custom Login / Register Entry
  if (!user) {
    return <AuthGate />;
  }

  // 3. Super Admin Route
  if (isAdmin) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  // 4. Normal Gamer Route Protection
  const isAdminPath = currentPath === '/admin' || currentPath.startsWith('/admin/');
  if (isAdminPath) {
    return <UnauthorizedScreen onLogout={handleLogout} onBackToArena={() => navigateTo('/')} />;
  }

  // 5. First-time profile setup
  if (needsProfileSetup) {
    return <ProfileSetupModal />;
  }

  // 6. Gamer Esports Arena
  return <PlayerArena onNavigate={navigateTo} onLogout={handleLogout} />;
}

// ---------------- 12 FIRE-ARENA-PRO GAME MODES ---------------- //
const ELITEX_GAME_MODES = [
  { id: 'FULL MAP', label: 'FULL MAP', badge: 'BR' },
  { id: 'FULL MAP 2', label: 'FULL MAP 2', badge: 'BR 2' },
  { id: 'CS HEAD', label: 'CS HEAD', badge: 'HEADSHOT' },
  { id: 'LW 1V1', label: 'LW 1V1', badge: '1V1' },
  { id: 'LW 2V2', label: 'LW 2V2', badge: '2V2' },
  { id: 'CS 1V1', label: 'CS 1V1', badge: 'CS 1V1' },
  { id: 'CS 2V2', label: 'CS 2V2', badge: 'CS 2V2' },
  { id: 'LW HEAD', label: 'LW HEAD', badge: 'LW HEAD' },
  { id: 'LW LOSS', label: 'LW LOSS', badge: 'SURVIVAL' },
  { id: 'LW ₹10', label: 'LW ₹10', badge: '₹10 ENTRY' },
  { id: 'NIGHT MODE', label: 'NIGHT MODE', badge: 'NIGHT' },
  { id: 'FREE MATCH', label: 'FREE MATCH', badge: '100% FREE' },
];

// ---------------- PLAYER ARENA SCREEN (5-TAB SYSTEM) ---------------- //
interface PlayerArenaProps {
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

function PlayerArena({ onNavigate, onLogout }: PlayerArenaProps) {
  const { user, profile } = useAuth();

  // 5-Tab System: 'earn' | 'ranking' | 'play' | 'wallet' | 'account'
  const [activeTab, setActiveTab] = useState<'earn' | 'ranking' | 'play' | 'wallet' | 'account'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/wallet' || path.startsWith('/wallet/') || search.includes('payment=success')) {
        return 'wallet';
      }
    }
    return 'play';
  });

  // Rupayex Payment Success Banner & Popup States
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState<{
    amount: number;
    orderId: string;
  } | null>(null);
  const [paymentSuccessPopup, setPaymentSuccessPopup] = useState<{
    amount: number;
    orderId: string;
  } | null>(null);

  // Category and Mode Type Switcher on Play Screen
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [modeType, setModeType] = useState<'TOURNAMENT' | 'SOLO'>('TOURNAMENT');
  const [myMatchesFilter, setMyMatchesFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [matchFilterPill, setMatchFilterPill] = useState<'all' | 'Solo' | 'Squad' | 'cs' | 'daily20' | 'Duo' | 'free'>('all');

  // Modals State
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletInitialTab, setWalletInitialTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [dismissedRoomAlerts, setDismissedRoomAlerts] = useState<Set<string>>(new Set());
  const [selectedTournamentToJoin, setSelectedTournamentToJoin] = useState<Tournament | null>(null);
  const [selectedTournamentForRules, setSelectedTournamentForRules] = useState<Tournament | null>(null);
  const [selectedTournamentForProof, setSelectedTournamentForProof] = useState<Tournament | null>(null);
  const [generalRulesOpen, setGeneralRulesOpen] = useState(false);

  // Settings & Menu Modals
  const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [pushNotificationActive, setPushNotificationActive] = useState(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Promo Banner Carousel
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Tournaments & Registrations Data with LocalStorage Caching for zero-lag instant display
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const cached = localStorage.getItem('cached_tournaments');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [myRegistrations, setMyRegistrations] = useState<Record<string, TournamentRegistration>>({});
  const [fetchingTournaments, setFetchingTournaments] = useState(() => {
    try {
      return !localStorage.getItem('cached_tournaments');
    } catch {
      return true;
    }
  });
  const [tournamentsError, setTournamentsError] = useState<string | null>(null);

  const handleRetryMatches = () => {
    sound.playClick();
    setFetchingTournaments(true);
    setTournamentsError(null);
    try {
      localStorage.removeItem('cached_tournaments');
    } catch {}
    window.location.reload();
  };

  // Ranking Tab Controls
  const [rankingCategory, setRankingCategory] = useState('ALL');
  const [leaderboardType, setLeaderboardType] = useState<'winnings' | 'kills'>('winnings');

  // Real-time unread notifications counter
  useEffect(() => {
    let broadcastIds: string[] = [];
    let userIds: string[] = [];

    const updateUnread = () => {
      try {
        const saved = localStorage.getItem('firearena_read_notifications');
        const readSet = saved ? new Set(JSON.parse(saved)) : new Set();
        const allIds = [...broadcastIds, ...userIds];
        const unread = allIds.filter((id) => !readSet.has(id)).length;
        setUnreadNotifCount(unread);
      } catch {
        setUnreadNotifCount(0);
      }
    };

    const unsubBcast = onSnapshot(
      collection(db, 'broadcast_notifications'),
      (snap) => {
        broadcastIds = snap.docs.map((d) => d.id);
        updateUnread();
      },
      () => {}
    );

    let unsubUser = () => {};
    if (user?.uid) {
      unsubUser = onSnapshot(
        collection(db, 'users', user.uid, 'notifications'),
        (snap) => {
          userIds = snap.docs.map((d) => d.id);
          updateUnread();
        },
        () => {}
      );
    }

    return () => {
      unsubBcast();
      unsubUser();
    };
  }, [user?.uid]);

  // Promo Banners Definition
  const PROMO_BANNERS = [
    {
      id: 0,
      tag: '0% CHARGES ON REDEEM',
      title: 'Get your payouts within 30 minutes, max 6 hours',
      subtitle: 'Fast UPI & Play Redeem Codes verified by Fire Arena Pro staff',
      icon: Zap,
      badgeColor: 'bg-red-600',
      action: () => handleOpenWallet('withdraw'),
      btnLabel: 'Redeem Now'
    },
    {
      id: 1,
      tag: 'DAILY FREE ROOMS',
      title: 'JOIN OFFICIAL WHATSAPP GROUP / SUPPORT',
      subtitle: 'Daily custom giveaway schedules, instant room IDs & direct help',
      icon: MessageCircle,
      badgeColor: 'bg-emerald-600',
      action: () => window.open('https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC', '_blank'),
      btnLabel: 'Join Official WhatsApp Group / Support'
    },
    {
      id: 2,
      tag: '24/7 HELPLINE',
      title: 'CONTACT CUSTOMER SUPPORT - Fastest reply 10AM to 10PM',
      subtitle: 'Official WhatsApp operations desk online for coin & match help',
      icon: Headphones,
      badgeColor: 'bg-indigo-600',
      action: () => window.open('https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC', '_blank'),
      btnLabel: 'Join Official WhatsApp Group / Support'
    }
  ];

  // Auto-rotate promo banners
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Auto-Credit Rupayex Payment Gateway Return (/wallet?payment=success&order_id={id}&amount={amt})
  useEffect(() => {
    if (!user) return;

    const handleRupayexReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get('payment') === 'success' || urlParams.get('status') === 'success';

      if (!isSuccess) return;

      const pendingOrderRaw = localStorage.getItem('pending_rupayex_order');
      let pendingOrder: any = null;
      try {
        pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : null;
      } catch {}

      const urlOrderId = urlParams.get('order_id') || urlParams.get('orderId');
      const urlAmount = urlParams.get('amount');

      const orderId = String(urlOrderId || pendingOrder?.orderId || `TXN_${Date.now()}_${user.uid}`).trim();
      const amount = Number(urlAmount || pendingOrder?.amount || 0);

      if (amount <= 0) {
        console.warn('[Rupayex] Arrived with payment=success but no valid amount found.');
        return;
      }

      const alreadyCreditedKey = `rupayex_credited_${orderId}`;

      try {
        // 1. Check Firestore to ensure this order_id hasn't been credited already (prevent duplicate credits)
        const txnRef = doc(db, 'transactions', orderId);
        const txnSnap = await getDoc(txnRef);

        if (txnSnap.exists() && txnSnap.data()?.status === 'COMPLETED') {
          console.log(`[Rupayex Auto-Credit] Order ${orderId} already credited in Firestore.`);
          setActiveTab('wallet');
          setPaymentSuccessBanner({ amount, orderId });
          setPaymentSuccessPopup({ amount, orderId });
          localStorage.removeItem('pending_rupayex_order');
          window.history.replaceState(null, '', '/wallet');
          return;
        }

        // Prevent concurrent run within same browser session
        if (localStorage.getItem(alreadyCreditedKey)) {
          setActiveTab('wallet');
          setPaymentSuccessBanner({ amount, orderId });
          setPaymentSuccessPopup({ amount, orderId });
          window.history.replaceState(null, '', '/wallet');
          return;
        }
        localStorage.setItem(alreadyCreditedKey, 'true');

        console.log(`[Rupayex Auto-Credit] Crediting ₹${amount} to user ${user.uid} for order ${orderId}`);

        // 2. Update Firestore user document: increment depositBalance and wallet_balance
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          depositBalance: increment(Number(amount)),
          wallet_balance: increment(Number(amount)),
          updatedAt: new Date().toISOString()
        });

        // 3. Mark transaction record in 'transactions' collection & 'deposit_orders'
        await setDoc(doc(db, 'transactions', orderId), {
          userId: user.uid,
          amount: Number(amount),
          orderId: orderId,
          status: 'COMPLETED',
          type: 'DEPOSIT',
          gateway: 'RUPAYEX',
          createdAt: new Date().toISOString()
        });

        // Also record in users/{uid}/transactions
        await setDoc(doc(db, 'users', user.uid, 'transactions', orderId), {
          userId: user.uid,
          amount: Number(amount),
          orderId: orderId,
          status: 'COMPLETED',
          type: 'DEPOSIT',
          gateway: 'RUPAYEX',
          createdAt: new Date().toISOString()
        });

        // 4. Record in 'depositRequests' & 'walletHistory' for user UI transaction feed
        const txnRecord = {
          userId: user.uid,
          userFfUid: profile?.freeFireUid || pendingOrder?.userFfUid || '10000000',
          amount: Number(amount),
          orderId: orderId,
          status: 'COMPLETED',
          type: 'DEPOSIT',
          gateway: 'RUPAYEX',
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'depositRequests'), {
          ...txnRecord,
          userEmail: user.email || '',
          userIgn: profile?.ign || 'Player',
          utrNumber: orderId,
          reviewedAt: new Date().toISOString()
        });

        await addDoc(collection(db, 'walletHistory'), txnRecord);

        // 5. Update UI states, open wallet, and celebrate with coin sound & confetti
        setActiveTab('wallet');
        setPaymentSuccessBanner({ amount, orderId });
        setPaymentSuccessPopup({ amount, orderId });
        localStorage.removeItem('pending_rupayex_order');

        try {
          sound.playCoin();
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch {}

        // 6. Clean URL query parameters immediately using window.history.replaceState
        window.history.replaceState(null, '', '/wallet');
      } catch (err) {
        console.error('[Rupayex Auto-Credit Error]:', err);
        localStorage.removeItem(alreadyCreditedKey);
      }
    };

    handleRupayexReturn();
  }, [user, profile]);

  // Realtime Matches Listener (Single Source of Truth: 'matches')
  useEffect(() => {
    const activeMatchesQuery = query(
      collection(db, 'matches'),
      where('status', 'in', ['UPCOMING', 'OPEN', 'upcoming', 'open', 'live', 'LIVE']),
      limit(50)
    );

    const unsubMatches = onSnapshot(
      activeMatchesQuery,
      (snapshot) => {
        const list: Tournament[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const joinedList = Array.isArray(data.joinedPlayers) ? data.joinedPlayers : [];

          list.push({
            id: docSnap.id,
            title: data.title || 'Free Fire Elite Match',
            category: data.category || 'FULL MAP',
            mode: data.mode || 'Solo',
            map: data.map || data.mapName || 'Bermuda',
            entryFee: Number(data.entryFee) || 0,
            perKillReward: Number(data.perKill) || Number(data.perKillReward) || 0,
            totalPrizePool: Number(data.totalPool) || Number(data.totalPrizePool) || 0,
            rank1Prize: Number(data.rank1) || Number(data.rank1Prize) || 0,
            rank2Prize: Number(data.rank2) || Number(data.rank2Prize) || 0,
            rank3Prize: Number(data.rank3) || 0,
            maxSlots: Number(data.maxSlots) || 2,
            startTime: data.startTime || new Date().toISOString(),
            status: ((data.status || 'UPCOMING').toLowerCase() === 'upcoming' ? 'upcoming' : data.status) as any,
            roomId: data.roomId || '',
            roomPassword: data.roomPassword || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
            ...data,
            joinedPlayers: joinedList,
            registeredCount: joinedList.length || Number(data.registeredCount) || 0,
          } as unknown as Tournament);
        });

        list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setTournaments(list);
        try {
          localStorage.setItem('cached_tournaments', JSON.stringify(list));
        } catch {}
        setFetchingTournaments(false);
      },
      (error) => {
        console.warn('Matches query error:', error);
        setTournamentsError(error?.message || 'Temporary network connection issue.');
        setFetchingTournaments(false);
      }
    );

    return () => {
      unsubMatches();
    };
  }, []);

  // Listen to user's registered tournaments
  useEffect(() => {
    if (!user || tournaments.length === 0) return;

    const unsubs: (() => void)[] = [];

    tournaments.forEach((t) => {
      const playerIdx = t.joinedPlayers?.findIndex((p) => p.uid === user.uid) ?? -1;
      if (playerIdx !== -1) {
        setMyRegistrations((prev) => ({
          ...prev,
          [t.id]: {
            id: `${t.id}_${user.uid}`,
            tournamentId: t.id,
            userId: user.uid,
            userEmail: user.email || '',
            userIgn: profile?.ign || user.displayName || 'Gamer',
            userFreeFireUid: profile?.freeFireUid || '',
            slotNumber: playerIdx + 1,
            entryFeePaid: t.entryFee,
            registeredAt: t.joinedPlayers![playerIdx]?.joinedAt || new Date().toISOString(),
          },
        }));
      }

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
            if (!t.joinedPlayers?.some((p) => p.uid === user.uid)) {
              setMyRegistrations((prev) => {
                const updated = { ...prev };
                delete updated[t.id];
                return updated;
              });
            }
          }
        },
        () => {}
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user, tournaments, profile]);

  const handleOpenWallet = (tab: 'overview' | 'deposit' | 'withdraw' | 'history' = 'overview') => {
    setWalletInitialTab(tab);
    setWalletModalOpen(true);
  };

  const showToast = (msg: string) => {
    setCopyToast(msg);
    setTimeout(() => setCopyToast(null), 2500);
  };

  // Filter tournaments
  const filteredTournaments = tournaments.filter((t) => {
    if (t.status === 'cancelled') return false;

    // Filter by Dynamic Match Filter Tabs: [ALL], [SOLO], [SQUAD], [CLASH SQUAD], [DAILY ₹20]
    if (matchFilterPill === 'Solo') {
      if (t.mode?.toLowerCase() !== 'solo') return false;
    } else if (matchFilterPill === 'Squad') {
      if (t.mode?.toLowerCase() !== 'squad') return false;
    } else if (matchFilterPill === 'cs') {
      const cat = (t.category || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      if (!cat.includes('cs') && !title.includes('cs') && !cat.includes('clash') && !title.includes('clash')) return false;
    } else if (matchFilterPill === 'daily20') {
      const fee = Number(t.entryFee);
      const title = (t.title || '').toLowerCase();
      const isDaily20 = fee === 20 || title.includes('20') || title.includes('daily');
      if (!isDaily20) return false;
    } else if (matchFilterPill === 'Duo') {
      if (t.mode?.toLowerCase() !== 'duo') return false;
    } else if (matchFilterPill === 'free') {
      const isFree = t.entryFee === 0 || (t.category || '').toLowerCase().includes('free') || (t.title || '').toLowerCase().includes('free');
      if (!isFree) return false;
    }

    // Filter by category if specific category selected
    if (activeCategory !== 'all') {
      const matchCat = (t.category || '').toUpperCase().trim();
      const targetCat = activeCategory.toUpperCase().trim();
      if (matchCat !== targetCat) {
        return false;
      }
    }

    // Filter by solo vs tournament mode
    if (modeType === 'SOLO' && t.mode !== 'Solo') {
      return false;
    }

    // Filter by My Matches Quick Tracker if active
    if (myMatchesFilter === 'ongoing') {
      return Boolean(myRegistrations[t.id]) && t.status?.toLowerCase() === 'live';
    }
    if (myMatchesFilter === 'upcoming') {
      return Boolean(myRegistrations[t.id]) && t.status?.toLowerCase() === 'upcoming';
    }
    if (myMatchesFilter === 'completed') {
      return Boolean(myRegistrations[t.id]) && t.status?.toLowerCase() === 'completed';
    }

    return true;
  });

  // Calculate counts for My Matches Quick Tracker
  const ongoingCount = tournaments.filter((t) => Boolean(myRegistrations[t.id]) && t.status?.toLowerCase() === 'live').length;
  const upcomingCount = tournaments.filter((t) => Boolean(myRegistrations[t.id]) && t.status?.toLowerCase() === 'upcoming').length;
  const completedCount = tournaments.filter((t) => Boolean(myRegistrations[t.id]) && t.status?.toLowerCase() === 'completed').length;
  const totalMyRegistered = Object.keys(myRegistrations).length;

  // Active joined tournament with released Room ID & Password
  const activeRoomMatch = tournaments.find(
    (t) =>
      Boolean(myRegistrations[t.id]) &&
      Boolean(t.roomId && t.roomPassword) &&
      t.status?.toLowerCase() !== 'completed' &&
      t.status?.toLowerCase() !== 'cancelled'
  );

  const handleCopyCredential = (val: string, label: string) => {
    sound.playCopy();
    navigator.clipboard.writeText(val);
    setCopyToast(`${label} Copied: ${val}`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl bg-red-600 text-white font-heading font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        onOpenWallet={handleOpenWallet}
        onOpenProfile={() => setActiveTab('account')}
        onOpenNotifications={() => setNotificationCenterOpen(true)}
        unreadNotificationsCount={unreadNotifCount}
        onLogout={onLogout}
      />

      {/* Floating Auto Room ID & Password Delivery Card for Joined Players */}
      {activeRoomMatch && !dismissedRoomAlerts.has(activeRoomMatch.id) && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 max-w-md w-[calc(100%-24px)] bg-[#0d0e19]/95 backdrop-blur-md border-2 border-amber-500 rounded-2xl p-4 shadow-[0_0_35px_rgba(245,158,11,0.35)] animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <div>
                <span className="text-xs font-black font-heading uppercase text-amber-400 tracking-wider block">
                  🚨 ROOM ID & PASS RELEASED!
                </span>
                <span className="text-[11px] font-bold text-white truncate block max-w-[220px]">
                  {activeRoomMatch.title}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                setDismissedRoomAlerts((prev) => new Set(prev).add(activeRoomMatch.id));
              }}
              className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
              title="Dismiss Alert"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {/* Room ID with 1-tap copy */}
            <div className="bg-black/60 p-2.5 rounded-xl border border-slate-700/80">
              <span className="block text-[9px] font-bold text-slate-400 uppercase">Room ID</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-mono font-black text-xs text-amber-300 tracking-wider">
                  {activeRoomMatch.roomId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCredential(activeRoomMatch.roomId!, 'Room ID')}
                  className="p-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 cursor-pointer transition-colors"
                  title="Copy Room ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Password with 1-tap copy */}
            <div className="bg-black/60 p-2.5 rounded-xl border border-slate-700/80">
              <span className="block text-[9px] font-bold text-slate-400 uppercase">Password</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-mono font-black text-xs text-red-300 tracking-wider">
                  {activeRoomMatch.roomPassword}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCredential(activeRoomMatch.roomPassword!, 'Password')}
                  className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 cursor-pointer transition-colors"
                  title="Copy Password"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Open Free Fire MAX custom room</span>
            <button
              onClick={() => {
                sound.playClick();
                setSelectedTournamentForRules(activeRoomMatch);
              }}
              className="font-bold text-red-400 hover:underline cursor-pointer"
            >
              Match Details →
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 pb-28 sm:pb-16 flex-1 space-y-5">

        {/* =========================================================================
            1. PLAY SCREEN (MAIN ARENA DASHBOARD)
           ========================================================================= */}
        {activeTab === 'play' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Notice Megaphone Banner: "[ FIRE-ARENA-PRO RULES — CLICK HERE ]" */}
            <button
              onClick={() => setGeneralRulesOpen(true)}
              className="w-full p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-between gap-2 shadow-lg shadow-red-600/25 active:scale-[0.99] transition-all cursor-pointer overflow-hidden border border-red-500/50"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-amber-300 animate-pulse" />
                </div>
                <div className="text-left truncate">
                  <span className="font-heading font-black text-xs sm:text-sm tracking-wider uppercase block">
                    [ FIRE-ARENA-PRO RULES — CLICK HERE ]
                  </span>
                  <span className="text-[10px] text-red-100/80 truncate block font-mono">
                    Fair play guidelines, room ID sharing rules & prize release terms
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-200 shrink-0" />
            </button>

            {/* Carousel / Promo Banners */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#160918] via-[#0f0915] to-[#120817] border border-red-950/70 p-4 sm:p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black text-white uppercase tracking-wider ${PROMO_BANNERS[activeBannerIdx].badgeColor}`}>
                      {PROMO_BANNERS[activeBannerIdx].tag}
                    </span>
                    <span className="text-[10px] text-red-400 font-mono">Fire Arena Pro Official</span>
                  </div>
                  <h3 className="text-sm sm:text-lg font-heading font-extrabold text-white tracking-tight">
                    {PROMO_BANNERS[activeBannerIdx].title}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xl">
                    {PROMO_BANNERS[activeBannerIdx].subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={PROMO_BANNERS[activeBannerIdx].action}
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-red-600/30 cursor-pointer transition-all"
                  >
                    {PROMO_BANNERS[activeBannerIdx].btnLabel}
                  </button>
                </div>
              </div>

              {/* Carousel Indicators */}
              <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-red-950/40">
                {PROMO_BANNERS.map((b, idx) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBannerIdx(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeBannerIdx === idx ? 'w-6 bg-red-500' : 'w-2 bg-slate-800'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* My Matches Quick Tracker (3 Equal Cards: Ongoing, Upcoming, Completed) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-red-500" />
                  <span>My Matches Quick Tracker</span>
                </span>
                {myMatchesFilter !== 'all' && (
                  <button
                    onClick={() => setMyMatchesFilter('all')}
                    className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer underline underline-offset-2"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* 1. Ongoing */}
                <button
                  onClick={() => setMyMatchesFilter(myMatchesFilter === 'ongoing' ? 'all' : 'ongoing')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    myMatchesFilter === 'ongoing'
                      ? 'bg-red-600/20 border-red-500 text-white shadow-md shadow-red-600/20'
                      : 'bg-[#0a0a14] border-red-950/60 hover:border-red-900/60 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold block text-red-400 uppercase tracking-wider flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                    ((●)) Ongoing
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5 block">
                    {ongoingCount}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">Live Rooms</span>
                </button>

                {/* 2. Upcoming */}
                <button
                  onClick={() => setMyMatchesFilter(myMatchesFilter === 'upcoming' ? 'all' : 'upcoming')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    myMatchesFilter === 'upcoming'
                      ? 'bg-red-600/20 border-red-500 text-white shadow-md shadow-red-600/20'
                      : 'bg-[#0a0a14] border-red-950/60 hover:border-red-900/60 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold block text-amber-400 uppercase tracking-wider">
                    🕒 Upcoming
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5 block">
                    {upcomingCount}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">Joined Slots</span>
                </button>

                {/* 3. Completed */}
                <button
                  onClick={() => setMyMatchesFilter(myMatchesFilter === 'completed' ? 'all' : 'completed')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    myMatchesFilter === 'completed'
                      ? 'bg-red-600/20 border-red-500 text-white shadow-md shadow-red-600/20'
                      : 'bg-[#0a0a14] border-red-950/60 hover:border-red-900/60 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold block text-emerald-400 uppercase tracking-wider">
                    ✅ Completed
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5 block">
                    {completedCount}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">Finished</span>
                </button>
              </div>
            </div>

            {/* Esports Game Modes (Category Switcher) */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-heading font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-red-500" />
                  <span>Esports Game Modes</span>
                </span>

                {/* Toggle Pills: [ TOURNAMENT (Red Active) ] | [ SOLO (Dark) ] */}
                <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-red-950/70 self-start">
                  <button
                    onClick={() => setModeType('TOURNAMENT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer ${
                      modeType === 'TOURNAMENT'
                        ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    TOURNAMENT
                  </button>
                  <button
                    onClick={() => setModeType('SOLO')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer ${
                      modeType === 'SOLO'
                        ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SOLO
                  </button>
                </div>
              </div>

              {/* 3-Column Gaming Grid with bold crimson badges (12 modes + ALL) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    activeCategory === 'all'
                      ? 'bg-gradient-to-b from-red-600 to-rose-800 text-white border-red-400 shadow-md shadow-red-600/30 scale-[1.02]'
                      : 'bg-[#0c0d18] border-red-950/60 hover:border-red-900/60 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold tracking-widest text-red-300 block">ALL</span>
                  <span className="font-heading font-black text-xs uppercase block">ALL MODES</span>
                </button>

                {ELITEX_GAME_MODES.map((mode) => {
                  const isSelected = activeCategory.toUpperCase() === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setActiveCategory(isSelected ? 'all' : mode.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-b from-red-600 to-rose-800 text-white border-red-400 shadow-md shadow-red-600/30 scale-[1.02]'
                          : 'bg-[#0c0d18] border-red-950/60 hover:border-red-900/60 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="text-[9px] font-mono font-bold tracking-widest text-red-300 block">
                        {mode.badge}
                      </span>
                      <span className="font-heading font-black text-xs uppercase block leading-tight truncate w-full">
                        {mode.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tournaments Match Feed */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-heading font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span>
                    {activeCategory === 'all' ? 'All Live & Upcoming Matches' : `${activeCategory} Matches`} ({filteredTournaments.length})
                  </span>
                </span>
                {activeCategory !== 'all' && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setActiveCategory('all');
                      setMatchFilterPill('all');
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer underline underline-offset-2 self-start sm:self-auto"
                  >
                    View All Matches →
                  </button>
                )}
              </div>

              {/* Dynamic Match Filters Pills: [ALL], [SOLO], [SQUAD], [CLASH SQUAD], [DAILY ₹20] */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'Solo', label: 'SOLO' },
                  { id: 'Squad', label: 'SQUAD' },
                  { id: 'cs', label: 'CLASH SQUAD' },
                  { id: 'daily20', label: 'DAILY ₹20' },
                ].map((pill) => {
                  const isSelected = matchFilterPill === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setMatchFilterPill(pill.id as any);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-heading font-black tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-md shadow-red-600/30 ring-1 ring-amber-400/40'
                          : 'bg-[#0e0f18] border border-red-950/60 text-slate-400 hover:text-white hover:border-red-900/60'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              {tournamentsError && filteredTournaments.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0e0a14] border border-red-950/80 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white font-heading">
                    Unable to Load Live Match Rooms
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {tournamentsError || 'A temporary network interruption occurred while loading tournaments.'}
                  </p>
                  <button
                    onClick={handleRetryMatches}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-heading font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-red-600/30 inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Loading Matches</span>
                  </button>
                </div>
              ) : fetchingTournaments && filteredTournaments.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="rounded-2xl bg-[#090a14] border border-red-950/60 p-4 space-y-3 animate-pulse"
                    >
                      <div className="h-32 rounded-xl bg-slate-900/90 border border-slate-800/60"></div>
                      <div className="h-4 w-3/4 rounded bg-slate-800/80"></div>
                      <div className="h-3 w-1/2 rounded bg-slate-800/50"></div>
                      <div className="flex justify-between items-center pt-2 border-t border-red-950/30">
                        <div className="h-5 w-16 rounded bg-slate-800/80"></div>
                        <div className="h-8 w-24 rounded-lg bg-red-950/50"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTournaments.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#090a14] border border-red-950/60 text-center space-y-3">
                  <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white font-heading">
                    No Tournaments Found
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    New custom rooms launch every 30 minutes. Check other categories or view all open tournaments.
                  </p>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setActiveCategory('all');
                      setMyMatchesFilter('all');
                      setMatchFilterPill('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-heading font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-red-600/30"
                  >
                    Browse All Open Rooms
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTournaments.map((tournament) => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      userRegistration={myRegistrations[tournament.id]}
                      onJoinClick={(tour) => {
                        sound.playClick();
                        setSelectedTournamentToJoin(tour);
                      }}
                      onViewDetails={(tour) => {
                        sound.playClick();
                        setSelectedTournamentForRules(tour);
                      }}
                      onSubmitProof={(tour) => {
                        sound.playClick();
                        setSelectedTournamentForProof(tour);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            2. RANKING / LEADERBOARD SCREEN
           ========================================================================= */}
        {activeTab === 'ranking' && (
          <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
            {/* Header Title & Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-heading font-black text-white tracking-wide flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>FIRE ARENA PRO LEADERBOARD</span>
                </h2>
                <p className="text-xs text-slate-400">Official tournament rankings & top tier esports performers</p>
              </div>

              {/* Toggle: Top Tournament Winners vs Top Killers */}
              <div className="flex items-center gap-1 p-1 bg-black/60 rounded-xl border border-red-950/70 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setLeaderboardType('winnings');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    leaderboardType === 'winnings'
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Top Winners</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setLeaderboardType('kills');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-heading font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    leaderboardType === 'kills'
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5 text-red-400" />
                  <span>Top Killers</span>
                </button>
              </div>
            </div>

            {/* Top Horizontal Category Scroller */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['ALL', 'FULL MAP', 'LW 10₹', 'CS HEAD', 'LW 1V1', 'LW 2V2', 'CS 1V1'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    sound.playClick();
                    setRankingCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    rankingCategory === cat
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                      : 'bg-[#090a14] border border-red-950/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Top 3 Podium Cards with Gold, Silver, Bronze Medals */}
            <div className="grid grid-cols-3 gap-2.5 pt-3">
              {/* Rank 2 (Silver Medal 🥈) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-600/10 via-[#0e101d] to-[#080911] border border-slate-400/30 text-center flex flex-col items-center justify-between space-y-2 shadow-lg shadow-slate-900/40 relative">
                <span className="text-xl">🥈</span>
                <div className="w-8 h-8 rounded-full bg-slate-300 text-black font-mono font-black text-xs flex items-center justify-center shadow-md">
                  #2
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block truncate w-full">
                    {leaderboardType === 'winnings' ? 'ViperKill FF' : 'White444_Head'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {leaderboardType === 'winnings' ? '142 Matches' : '98 Matches'}
                  </span>
                </div>
                <span className="text-xs font-black font-mono text-slate-200">
                  {leaderboardType === 'winnings' ? '🪙 8,450' : '🎯 956 Kills'}
                </span>
              </div>

              {/* Rank 1 (Gold Medal 🥇) */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 via-[#18121f] to-[#0c0d18] border-2 border-amber-500/60 text-center flex flex-col items-center justify-between space-y-2 -translate-y-2.5 shadow-xl shadow-amber-500/20 relative">
                <span className="text-2xl animate-bounce">🥇</span>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-black font-mono font-black text-sm flex items-center justify-center shadow-lg shadow-amber-500/40">
                  <Crown className="w-5 h-5 fill-black" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-sm font-black text-amber-300 block truncate w-full">
                    Raistar_Pro99
                  </span>
                  <span className="text-[10px] text-amber-400/90 font-mono block">
                    {leaderboardType === 'winnings' ? '210 Matches Won' : '1,284 Frags'}
                  </span>
                </div>
                <span className="text-sm font-black font-mono text-amber-300">
                  {leaderboardType === 'winnings' ? '🪙 16,920' : '🎯 1,284 Kills'}
                </span>
              </div>

              {/* Rank 3 (Bronze Medal 🥉) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-900/15 via-[#0e0c15] to-[#080911] border border-amber-800/30 text-center flex flex-col items-center justify-between space-y-2 shadow-lg shadow-amber-950/40 relative">
                <span className="text-xl">🥉</span>
                <div className="w-8 h-8 rounded-full bg-amber-700 text-black font-mono font-black text-xs flex items-center justify-center shadow-md">
                  #3
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block truncate w-full">
                    {leaderboardType === 'winnings' ? 'ShadowOP' : 'ViperKill FF'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {leaderboardType === 'winnings' ? '98 Matches' : '142 Matches'}
                  </span>
                </div>
                <span className="text-xs font-black font-mono text-amber-500">
                  {leaderboardType === 'winnings' ? '🪙 6,180' : '🎯 840 Kills'}
                </span>
              </div>
            </div>

            {/* Clean Leaderboard Table with Medals & Real User Stats */}
            <div className="rounded-2xl bg-[#090a14] border border-red-950/70 overflow-hidden shadow-xl">
              <div className="p-3.5 border-b border-red-950/60 bg-[#0d0e1c] flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center">Rank</span>
                  <span>User Name / Player</span>
                </div>
                <span>{leaderboardType === 'winnings' ? 'Total Won' : 'Kills'}</span>
              </div>

              <div className="divide-y divide-red-950/40">
                {(leaderboardType === 'winnings'
                  ? [
                      { rank: 1, name: 'Raistar_Pro99', score: '🪙 16,920', badge: '🥇 Gold' },
                      { rank: 2, name: 'ViperKill FF', score: '🪙 8,450', badge: '🥈 Silver' },
                      { rank: 3, name: 'ShadowOP', score: '🪙 6,180', badge: '🥉 Bronze' },
                      { rank: 4, name: 'White444_Head', score: '🪙 4,900', badge: '#4' },
                      { rank: 5, name: 'SniperKing7', score: '🪙 3,750', badge: '#5' },
                      { rank: 6, name: 'DesiGamer_T1', score: '🪙 2,890', badge: '#6' },
                      { rank: 7, name: 'Total_Gaming_9', score: '🪙 2,240', badge: '#7' },
                      { rank: 8, name: 'KillerClash', score: '🪙 1,980', badge: '#8' },
                      { rank: 9, name: 'LoneWolf_Pro', score: '🪙 1,560', badge: '#9' },
                      { rank: 10, name: profile?.ign || 'You (Gamer)', score: `🪙 ${((profile?.winningsBalance || 0) + (profile?.depositBalance || 0)).toLocaleString('en-IN')}`, badge: '#10' },
                    ]
                  : [
                      { rank: 1, name: 'Raistar_Pro99', score: '🎯 1,284 Kills', badge: '🥇 Gold' },
                      { rank: 2, name: 'White444_Head', score: '🎯 956 Kills', badge: '🥈 Silver' },
                      { rank: 3, name: 'ViperKill FF', score: '🎯 840 Kills', badge: '🥉 Bronze' },
                      { rank: 4, name: 'SniperKing7', score: '🎯 712 Kills', badge: '#4' },
                      { rank: 5, name: 'ShadowOP', score: '🎯 624 Kills', badge: '#5' },
                      { rank: 6, name: 'KillerClash', score: '🎯 510 Kills', badge: '#6' },
                      { rank: 7, name: 'DesiGamer_T1', score: '🎯 480 Kills', badge: '#7' },
                      { rank: 8, name: 'Total_Gaming_9', score: '🎯 390 Kills', badge: '#8' },
                      { rank: 9, name: 'LoneWolf_Pro', score: '🎯 310 Kills', badge: '#9' },
                      { rank: 10, name: profile?.ign || 'You (Gamer)', score: `🎯 ${profile?.totalKills || 0} Kills`, badge: '#10' },
                    ]
                ).map((player) => (
                  <div
                    key={player.rank}
                    className="p-3.5 flex items-center justify-between text-xs hover:bg-red-950/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-14 text-center font-mono font-bold text-slate-400">
                        {player.badge}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{player.name}</span>
                        {player.rank <= 3 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-mono">
                            CHAMPION
                          </span>
                        )}
                        {player.name === profile?.ign && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-black font-mono text-amber-400 flex items-center gap-1">
                      {player.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. EARN SCREEN
           ========================================================================= */}
        {activeTab === 'earn' && (
          <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-black text-white tracking-wide flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>REFER & EARN COINS</span>
              </h2>
              <p className="text-xs text-slate-400">Earn coins by inviting friends & following our community</p>
            </div>

            {/* WhatsApp Group & Support Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-slate-900 to-teal-600/20 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1 text-center sm:text-left">
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-mono font-black uppercase tracking-wider">
                  Official Community
                </span>
                <h3 className="text-base font-bold text-white font-heading">
                  Join Official WhatsApp Group / Support
                </h3>
                <p className="text-xs text-slate-300 max-w-sm">
                  Get daily free custom room passwords, giveaway schedules, and platform notices.
                </p>
              </div>

              <a
                href="https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC"
                target="_blank"
                rel="noreferrer"
                className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-500/20"
              >
                <MessageCircle className="w-4 h-4 fill-black" />
                <span>Join Official WhatsApp Group / Support</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Customer Support Banner (10 AM to 10 PM) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-600/20 via-slate-900 to-purple-600/20 border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1 text-center sm:text-left">
                <span className="px-2 py-0.5 rounded bg-indigo-500 text-white text-[9px] font-mono font-black uppercase tracking-wider">
                  Support Desk
                </span>
                <h3 className="text-base font-bold text-white font-heading">
                  Customer Support (10 AM to 10 PM)
                </h3>
                <p className="text-xs text-slate-300 max-w-sm">
                  Instant resolution on deposits, withdrawals, and Free Fire room credentials.
                </p>
              </div>

              <a
                href="https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC"
                target="_blank"
                rel="noreferrer"
                className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-md shadow-indigo-600/30"
              >
                <Headphones className="w-4 h-4" />
                <span>Join Official WhatsApp Group / Support</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Refer & Earn Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#090a14] border border-red-950/80 space-y-4 shadow-xl">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  Squad Referral Program
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                  Invite Friends & Earn ₹10 Cash Bonus Each
                </h3>
                <p className="text-xs text-slate-400">
                  Apne Free Fire squad members ko invite karein. Wo register karte hi ₹10 welcome bonus paayenge, aur unke judte hi aapko bhi instant ₹10 deposit balance milega!
                </p>
              </div>

              {/* Referral Statistics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/60 border border-red-950/60">
                  <span className="text-[10px] text-slate-400 font-mono block">Total Referrals</span>
                  <span className="text-xl font-black font-mono text-white">
                    {profile?.totalReferrals || 0} <span className="text-xs text-slate-500 font-normal">Friends</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/60 border border-red-950/60">
                  <span className="text-[10px] text-slate-400 font-mono block">Total Bonus Earned</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    ₹{(profile?.totalReferrals || 0) * 10}
                  </span>
                </div>
              </div>

              {/* Referral Code Box with Copy Code & Share on WhatsApp */}
              <div className="p-4 rounded-xl bg-black/70 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-amber-400/90 font-mono uppercase tracking-wider block">
                    Your Official Referral Code:
                  </span>
                  <span className="text-xl font-black font-mono text-amber-400 tracking-widest select-all">
                    {profile?.referralCode || 'FIRE8492'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const code = profile?.referralCode || 'FIRE8492';
                      navigator.clipboard.writeText(code);
                      showToast(`Referral code ${code} copied!`);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Join Fire Arena Pro using my referral code *${profile?.referralCode || 'FIRE8492'}* and get ₹10 instant signup bonus! Play Free Fire MAX tournaments & win cash: ${window.location.origin}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Share on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Referral Steps */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-red-950/50">
                <div className="p-2.5 rounded-xl bg-[#0c0d18] border border-red-950/40">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center mx-auto mb-1">
                    1
                  </span>
                  <span className="font-bold text-white block">Share Code</span>
                  <span className="text-[10px] text-slate-500">Send on WhatsApp</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0c0d18] border border-red-950/40">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center mx-auto mb-1">
                    2
                  </span>
                  <span className="font-bold text-white block">Friend Signs Up</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Gets ₹10 Bonus</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0c0d18] border border-red-950/40">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center mx-auto mb-1">
                    3
                  </span>
                  <span className="font-bold text-white block">You Earn</span>
                  <span className="text-[10px] text-amber-400 font-bold">₹10 Instant</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. WALLET SCREEN
           ========================================================================= */}
        {activeTab === 'wallet' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {paymentSuccessBanner && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-[#0d281e] to-emerald-900/70 border-2 border-emerald-500 shadow-2xl shadow-emerald-950/80 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black font-heading text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Payment Successful!</span>
                      <span className="px-2 py-0.2 rounded-full bg-emerald-500 text-black text-[9px] font-mono font-black">
                        AUTO-CREDITED
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-300 font-medium mt-0.5">
                      🪙 <strong className="text-white font-bold">{paymentSuccessBanner.amount} Coins</strong> have been credited to your wallet.
                      <span className="text-[10px] text-slate-400 font-mono block sm:inline sm:ml-2">
                        Order ID: {paymentSuccessBanner.orderId}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentSuccessBanner(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  title="Dismiss Banner"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            )}

            <WalletAndCareerStats
              onOpenDeposit={() => handleOpenWallet('deposit')}
              onOpenWithdraw={() => handleOpenWallet('withdraw')}
            />
          </div>
        )}

        {/* =========================================================================
            5. ACCOUNT / PROFILE SCREEN
           ========================================================================= */}
        {activeTab === 'account' && (
          <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-200">
            {/* Top: Fire Arena Pro Badge Gaming Logo, Username & Green Verified Tag */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#090a14] border border-red-950/80 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 p-[3px] shadow-[0_0_24px_rgba(234,179,8,0.5)] overflow-hidden">
                    <img src="/logo.png" alt="Fire Arena Pro" className="w-full h-full rounded-full object-cover" />
                  </div>
                  <span className="absolute bottom-0 right-0 px-2 py-0.2 rounded-full bg-emerald-500 text-black text-[9px] font-mono font-black border-2 border-[#090a14]">
                    VERIFIED
                  </span>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-heading font-black text-white tracking-wide truncate">
                      {profile?.ign || user?.displayName || 'Gamer'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span>UID:</span>
                    <span className="text-red-400 font-bold tracking-wider">{profile?.freeFireUid || user?.uid || 'Not Set'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Stats Card (3 Columns: Matches Played | Total Killed | 🪙 Coins Won) */}
            <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-[#090a14] border border-red-950/80 shadow-xl text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block mb-0.5">Matches Played</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                  {profile?.matchesPlayed || 0}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block">Esports Rooms</span>
              </div>

              <div className="border-x border-red-950/60">
                <span className="text-[10px] text-slate-400 uppercase font-mono block mb-0.5">Total Killed</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-red-500">
                  {profile?.totalKills || 0}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block">Enemy Frags</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block mb-0.5">Coins Won</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  🪙 {((profile?.winningsBalance || 0) + (profile?.depositBalance || 0)).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block">Total Coins</span>
              </div>
            </div>

            {/* Settings & Menu List (Clean Rounded Rows with Chevron >) */}
            <div className="rounded-2xl bg-[#090a14] border border-red-950/80 p-3 space-y-1 shadow-xl">
              {/* 1. Push Notification (Toggle Switch) */}
              <div className="p-3 rounded-xl bg-black/40 border border-slate-900 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">Push Notification</span>
                </div>
                <button
                  onClick={() => setPushNotificationActive(!pushNotificationActive)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    pushNotificationActive ? 'bg-red-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                      pushNotificationActive ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* 2. My Profile */}
              <button
                onClick={() => setProfileModalOpen(true)}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-red-400" />
                  <span className="font-semibold text-white">My Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 3. My Wallet */}
              <button
                onClick={() => setActiveTab('wallet')}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">My Wallet</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 4. My Matches */}
              <button
                onClick={() => {
                  setActiveTab('play');
                  setMyMatchesFilter('upcoming');
                }}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-white">My Matches</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 5. My Order */}
              <button
                onClick={() => {
                  setActiveTab('wallet');
                }}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white">My Order & Redeems</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 6. My Statistics */}
              <button
                onClick={() => setProfileModalOpen(true)}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">My Statistics</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 7. My Rewards */}
              <button
                onClick={() => {
                  showToast('Daily check-in reward claimed: +🪙 2 Coins!');
                }}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Gift className="w-4 h-4 text-rose-400" />
                  <span className="font-semibold text-white">My Rewards</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 8. My Referrals */}
              <button
                onClick={() => setActiveTab('earn')}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Users2 className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-white">My Referrals</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 9. Announcement */}
              <button
                onClick={() => setGeneralRulesOpen(true)}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Megaphone className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-white">Announcement</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 10. Top Players */}
              <button
                onClick={() => setActiveTab('ranking')}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">Top Players</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 11. App Tutorial */}
              <button
                onClick={() => setTutorialModalOpen(true)}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileQuestion className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white">App Tutorial</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 12. About us */}
              <button
                onClick={() => setAboutModalOpen(true)}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Info className="w-4 h-4 text-teal-400" />
                  <span className="font-semibold text-white">About us</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 13. Customer Support */}
              <a
                href="https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC"
                target="_blank"
                rel="noreferrer"
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-emerald-950/30 border border-slate-900 hover:border-emerald-500/30 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
                title="Join Official WhatsApp Group / Support"
              >
                <div className="flex items-center gap-3">
                  <Headphones className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">Join Official WhatsApp Group / Support</span>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500" />
              </a>

              {/* 14. Share App */}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Fire Arena Pro Esports Arena',
                      text: 'Join Free Fire MAX tournaments & win real cash coins on Fire Arena Pro!',
                      url: window.location.origin,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.origin);
                    showToast('App link copied to clipboard!');
                  }
                }}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-white">Share App</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 15. Terms & Conditions */}
              <button
                onClick={() => setGeneralRulesOpen(true)}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">Terms & Conditions</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 16. Change Language */}
              <button
                onClick={() => showToast('Language switched to English')}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-red-950/30 border border-slate-900 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-white">Change Language</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">English</span>
              </button>

              {/* 17. Logout (Prominent Red Power Icon) */}
              <button
                onClick={onLogout}
                className="w-full p-3.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-500/40 text-left flex items-center justify-between text-xs text-red-400 hover:text-red-300 font-bold transition-all cursor-pointer shadow-md shadow-red-950/50"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-red-500" />
                  <span className="font-heading tracking-wide uppercase">Logout</span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-500" />
              </button>
            </div>

            {/* Bottom Footer: "Version : 1" */}
            <div className="text-center py-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest block">
                Version : 1
              </span>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          GLOBAL 5-TAB BOTTOM NAVIGATION BAR (PURE BLACK & GLOWING HIGHLIGHT)
         ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-red-950/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-5px_25px_rgba(0,0,0,0.9)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* 1. 🪙 Earn */}
        <button
          onClick={() => setActiveTab('earn')}
          className={`relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'earn'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'earn' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <Coins className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'earn' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[1px] text-[10px]">Earn</span>
        </button>

        {/* 2. 🏆 Ranking */}
        <button
          onClick={() => setActiveTab('ranking')}
          className={`relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'ranking'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'ranking' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <Trophy className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'ranking' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[1px] text-[10px]">Ranking</span>
        </button>

        {/* 3. 🎮 Play (Main Arena Dashboard) */}
        <button
          onClick={() => setActiveTab('play')}
          className={`relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'play'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'play' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <Gamepad2 className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'play' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[1px] text-[10px]">Play</span>
        </button>

        {/* 4. 💳 Wallet */}
        <button
          onClick={() => setActiveTab('wallet')}
          className={`relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'wallet'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'wallet' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <CreditCard className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'wallet' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[1px] text-[10px]">Wallet</span>
        </button>

        {/* 5. 👤 Account */}
        <button
          onClick={() => setActiveTab('account')}
          className={`relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'account'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'account' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <User className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'account' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[1px] text-[10px]">Account</span>
        </button>
      </nav>

      <React.Suspense fallback={null}>
        {/* Join Match Modal */}
        {selectedTournamentToJoin && (
          <JoinMatchModal
            tournament={selectedTournamentToJoin}
            isOpen={Boolean(selectedTournamentToJoin)}
            onClose={() => setSelectedTournamentToJoin(null)}
            onSuccess={() => {
              showToast('Slot registered! Check your upcoming matches for room credentials.');
            }}
            onOpenDeposit={() => handleOpenWallet('deposit')}
          />
        )}

        {/* Wallet Modal (Deposit & Withdraw) */}
        {walletModalOpen && (
          <WalletModal
            isOpen={walletModalOpen}
            onClose={() => setWalletModalOpen(false)}
            initialTab={walletInitialTab}
          />
        )}
      </React.Suspense>

      {/* Rupayex Instant Auto-Credit Success Popup */}
      {paymentSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#0c0d18] border-2 border-emerald-500/70 p-6 shadow-2xl text-center relative animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-black uppercase tracking-wider">
              Deposit Successful
            </span>

            <h3 className="text-xl font-black text-white font-heading mt-3">
              Payment Auto-Credited!
            </h3>

            <div className="my-4 p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30">
              <span className="text-xs text-slate-400 font-mono block">Coins Added:</span>
              <span className="text-3xl font-black font-mono text-emerald-400 tracking-wider">
                +🪙 {paymentSuccessPopup.amount}
              </span>
            </div>

            <p className="text-xs text-emerald-300 font-semibold leading-relaxed mb-4">
              ₹{paymentSuccessPopup.amount} aapke wallet mein successfully credit ho gaye hain!
            </p>

            <span className="text-[10px] text-slate-500 font-mono block mb-5">
              Order ID: {paymentSuccessPopup.orderId}
            </span>

            <button
              onClick={() => setPaymentSuccessPopup(null)}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-heading font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95"
            >
              Continue to Play
            </button>
          </div>
        </div>
      )}

      {/* Suspense Container for Lazy Loaded Modals */}
      <React.Suspense fallback={null}>
        {/* Gamer Profile Modal */}
        {profileModalOpen && (
          <ProfileModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            onOpenWallet={() => handleOpenWallet('overview')}
            onLogout={onLogout}
          />
        )}

        {/* Match Rules & Description Modal */}
        {selectedTournamentForRules && (
          <MatchRulesModal
            tournament={selectedTournamentForRules}
            isOpen={Boolean(selectedTournamentForRules)}
            onClose={() => setSelectedTournamentForRules(null)}
            onJoinClick={(tour) => setSelectedTournamentToJoin(tour)}
          />
        )}

        {/* General Fire Arena Pro Rules Modal */}
        {generalRulesOpen && (
          <MatchRulesModal
            tournament={null}
            isOpen={generalRulesOpen}
            onClose={() => setGeneralRulesOpen(false)}
          />
        )}

        {/* Proof Submission Modal */}
        {selectedTournamentForProof && (
          <ProofSubmissionModal
            tournament={selectedTournamentForProof}
            isOpen={Boolean(selectedTournamentForProof)}
            onClose={() => setSelectedTournamentForProof(null)}
            onSuccess={() => {
              showToast('Scorecard proof submitted! Admin will verify and disburse prizes.');
            }}
          />
        )}

        {/* In-App Notification Center Modal */}
        {notificationCenterOpen && (
          <NotificationCenterModal
            isOpen={notificationCenterOpen}
            onClose={() => setNotificationCenterOpen(false)}
            onSelectTournament={(tourId) => {
              const tour = tournaments.find((t) => t.id === tourId);
              if (tour) setSelectedTournamentForRules(tour);
            }}
          />
        )}
      </React.Suspense>

      {/* App Tutorial Modal */}
      {tutorialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#090a14] border border-red-950/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-red-950/60 pb-3">
              <h3 className="text-base font-bold text-white font-heading">Fire Arena Pro App Tutorial</h3>
              <button onClick={() => setTutorialModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-black/50 border border-red-950/50 space-y-1">
                <span className="font-bold text-red-400 block">1. Add Coins</span>
                <p className="text-slate-400">Open Wallet → Add Coins → Pay via PhonePe/GPay QR → Enter 12-digit UTR.</p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-red-950/50 space-y-1">
                <span className="font-bold text-red-400 block">2. Join Your Favorite Match</span>
                <p className="text-slate-400">Select any mode from FULL MAP, CS HEAD, or LW 1V1 and pick your slot number.</p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-red-950/50 space-y-1">
                <span className="font-bold text-red-400 block">3. Get Room Credentials</span>
                <p className="text-slate-400">15 minutes before match start, Room ID & Password unlock with a 1-tap copy button.</p>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-red-950/50 space-y-1">
                <span className="font-bold text-red-400 block">4. Submit Scorecard & Win</span>
                <p className="text-slate-400">Submit match proof screenshot. Admin disburses kill coins & rank prizes directly to your wallet.</p>
              </div>
            </div>
            <button
              onClick={() => setTutorialModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs cursor-pointer uppercase"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* About Us Modal */}
      {aboutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#090a14] border border-red-950/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-red-950/60 pb-3">
              <h3 className="text-base font-bold text-white font-heading">About Fire Arena Pro Esports</h3>
              <button onClick={() => setAboutModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong className="text-red-400">Fire Arena Pro</strong> is India's premier Free Fire MAX competitive tournament ecosystem offering zero-lag room management, slot reservations, automated prize distribution, and zero-fee withdrawals.
              </p>
              <p>
                Our vision is to empower mobile gamers with daily competitive scrims, professional esports anti-cheat enforcement, and instant real cash payouts.
              </p>
              <div className="p-3 rounded-xl bg-black/50 border border-red-950/50 text-[11px] font-mono text-slate-400">
                Official Support: <span className="text-red-400">support@firearenapro.com</span>
                <br />
                Helpline Timing: 10:00 AM - 10:00 PM IST
              </div>
            </div>
            <button
              onClick={() => setAboutModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs cursor-pointer uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
