import React, { useState, useEffect, useRef } from 'react';
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
import { collection, query, where, limit, orderBy, onSnapshot, getDocs, getDoc, setDoc, doc, addDoc, updateDoc, increment } from 'firebase/firestore';
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
import { WinnersTab } from './components/WinnersTab';
import { LeaderboardTab } from './components/LeaderboardTab';

// Lazy loaded modals for fast initial bundle and zero lag
const JoinMatchModal = React.lazy(() => import('./components/JoinMatchModal').then(m => ({ default: m.JoinMatchModal })));
const WalletModal = React.lazy(() => import('./components/WalletModal').then(m => ({ default: m.WalletModal })));
const ProfileModal = React.lazy(() => import('./components/ProfileModal').then(m => ({ default: m.ProfileModal })));
const MatchRulesModal = React.lazy(() => import('./components/MatchRulesModal').then(m => ({ default: m.MatchRulesModal })));
const ProofSubmissionModal = React.lazy(() => import('./components/ProofSubmissionModal').then(m => ({ default: m.ProofSubmissionModal })));
const NotificationCenterModal = React.lazy(() => import('./components/NotificationCenterModal').then(m => ({ default: m.NotificationCenterModal })));
const SupportModal = React.lazy(() => import('./components/SupportModal').then(m => ({ default: m.SupportModal })));

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

  // Navigation Tab System: 'play' | 'winners' | 'ranking' | 'earn' | 'wallet' | 'account'
  const [activeTab, setActiveTab] = useState<'play' | 'winners' | 'ranking' | 'earn' | 'wallet' | 'account'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/wallet' || path.startsWith('/wallet/')) {
        return 'wallet';
      }
      if (path === '/winners') return 'winners';
      if (path === '/leaderboard') return 'ranking';
    }
    return 'play';
  });

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
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Settings & Menu Modals
  const [tutorialModalOpen, setTutorialModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [pushNotificationActive, setPushNotificationActive] = useState(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [liveBroadcastAlert, setLiveBroadcastAlert] = useState<{ id: string; title: string; message: string } | null>(null);

  // References to prevent duplicate audio alerts
  const alertedRoomMatchesRef = useRef<Set<string>>(new Set());
  const initialNotifsLoadedRef = useRef(false);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());

  // Web Push Notification Permission Request
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
          .then((perm) => {
            setPushNotificationActive(perm === 'granted');
          })
          .catch(() => {});
      } else {
        setPushNotificationActive(Notification.permission === 'granted');
      }
    }
  }, [user]);

  // Promo Banner Carousel
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Tournaments & Registrations Data (Strictly initial empty array [])
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<Record<string, TournamentRegistration>>({});
  const [fetchingTournaments, setFetchingTournaments] = useState(true);
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

  // Real-time unread notifications counter & audio/vibration/Web Push trigger
  useEffect(() => {
    let rootNotifItems: { id: string; userId?: string; type?: string; title?: string; message?: string; roomId?: string; roomPassword?: string; matchId?: string }[] = [];
    let bcastItems: { id: string; title?: string; message?: string; roomId?: string; roomPassword?: string }[] = [];
    let userNotifItems: { id: string; title?: string; message?: string; roomId?: string; roomPassword?: string }[] = [];

    const handleNewIncomingNotification = (notif: { id: string; title?: string; message?: string; roomId?: string; roomPassword?: string; type?: string; matchId?: string; userId?: string }) => {
      // Audio Ping & Vibration & Web Push
      if (notif.type === 'ROOM_CREDENTIALS' || (notif.roomId && notif.roomPassword)) {
        sound.playVictory();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch {}
        }
        // Native Web Push Alert
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🚨 ROOM DETAILS OUT!', {
              body: `Room ID: ${notif.roomId} | Pass: ${notif.roomPassword}. Join Free Fire now!`,
              icon: '/logo.png',
            });
          } catch {}
        }
      } else {
        sound.playNotification();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(150);
          } catch {}
        }
        // Show live broadcast alert banner
        if (notif.title && notif.message) {
          setLiveBroadcastAlert({ id: notif.id, title: notif.title, message: notif.message });
        }
        // Native Web Push Alert if tab minimized or hidden
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
          try {
            new Notification(notif.title || 'Fire Arena Alert', {
              body: notif.message || '',
              icon: '/logo.png',
            });
          } catch {}
        }
      }
    };

    const updateAllUnread = () => {
      try {
        const saved = localStorage.getItem('firearena_read_notifications');
        const readSet = saved ? new Set(JSON.parse(saved)) : new Set();

        const allIds = new Set<string>();
        rootNotifItems.forEach((n) => {
          if (n.userId === 'ALL' || !n.userId || n.userId === user?.uid) allIds.add(n.id);
        });
        bcastItems.forEach((n) => allIds.add(n.id));
        userNotifItems.forEach((n) => allIds.add(n.id));

        const unread = Array.from(allIds).filter((id) => !readSet.has(id)).length;
        setUnreadNotifCount(unread);
      } catch {
        setUnreadNotifCount(0);
      }
    };

    // 1. Root notifications collection (Room IDs, match reminders, broadcasts)
    const unsubRoot = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const id = change.doc.id;
            if (initialNotifsLoadedRef.current && !knownNotifIdsRef.current.has(id)) {
              if (data.userId === 'ALL' || !data.userId || data.userId === user?.uid) {
                handleNewIncomingNotification({ id, ...data });
              }
            }
            knownNotifIdsRef.current.add(id);
          }
        });
        rootNotifItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        snap.docs.forEach((d) => knownNotifIdsRef.current.add(d.id));
        initialNotifsLoadedRef.current = true;
        updateAllUnread();
      },
      (err) => console.warn('Root notifications listener note:', err.message)
    );

    // 2. Broadcast notifications collection
    const unsubBcast = onSnapshot(
      query(collection(db, 'broadcast_notifications'), orderBy('createdAt', 'desc'), limit(30)),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const id = change.doc.id;
            if (initialNotifsLoadedRef.current && !knownNotifIdsRef.current.has(id)) {
              handleNewIncomingNotification({ id, ...data, type: 'BROADCAST' });
            }
            knownNotifIdsRef.current.add(id);
          }
        });
        bcastItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        updateAllUnread();
      },
      () => {}
    );

    // 3. User notifications collection
    let unsubUser = () => {};
    if (user?.uid) {
      unsubUser = onSnapshot(
        query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(30)),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const id = change.doc.id;
              if (initialNotifsLoadedRef.current && !knownNotifIdsRef.current.has(id)) {
                handleNewIncomingNotification({ id, ...data });
              }
              knownNotifIdsRef.current.add(id);
            }
          });
          userNotifItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          updateAllUnread();
        },
        () => {}
      );
    }

    return () => {
      unsubRoot();
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
            joinedSlots: typeof data.joinedSlots === 'number' ? data.joinedSlots : (joinedList.length || Number(data.registeredCount) || 0),
            registeredCount: typeof data.joinedSlots === 'number' ? data.joinedSlots : (joinedList.length || Number(data.registeredCount) || 0),
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

  // Trigger prominent audio ping and vibration when user's joined match releases Room ID & Password
  useEffect(() => {
    if (activeRoomMatch && activeRoomMatch.roomId && activeRoomMatch.roomPassword) {
      const key = `${activeRoomMatch.id}-${activeRoomMatch.roomId}-${activeRoomMatch.roomPassword}`;
      if (!alertedRoomMatchesRef.current.has(key)) {
        alertedRoomMatchesRef.current.add(key);
        sound.playVictory();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch {}
        }
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🚨 ROOM DETAILS OUT!', {
              body: `Room ID: ${activeRoomMatch.roomId} | Pass: ${activeRoomMatch.roomPassword}. Join Free Fire now!`,
              icon: '/logo.png',
            });
          } catch {}
        }
      }
    }
  }, [activeRoomMatch?.id, activeRoomMatch?.roomId, activeRoomMatch?.roomPassword]);

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

      {/* Live Global Broadcast Alert Banner */}
      {liveBroadcastAlert && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 shadow-xl border-b border-white/20 flex items-center justify-between gap-3 text-xs z-50 sticky top-0 backdrop-blur-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
              <Megaphone className="w-3.5 h-3.5 text-white animate-pulse" />
            </span>
            <div className="truncate">
              <span className="font-black uppercase tracking-wider mr-2">{liveBroadcastAlert.title}:</span>
              <span className="text-white/90 font-medium">{liveBroadcastAlert.message}</span>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              setLiveBroadcastAlert(null);
            }}
            className="px-2.5 py-1 bg-black/40 hover:bg-black/60 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header - Conditionally rendered only when user is authenticated */}
      {user && (
        <Header
          onOpenWallet={handleOpenWallet}
          onOpenProfile={() => setActiveTab('account')}
          onOpenNotifications={() => setNotificationCenterOpen(true)}
          onOpenSupport={() => setSupportModalOpen(true)}
          unreadNotificationsCount={unreadNotifCount}
          onLogout={onLogout}
        />
      )}

      {/* Floating Auto Room ID & Password Delivery Card for Joined Players */}
      {activeRoomMatch && !dismissedRoomAlerts.has(activeRoomMatch.id) && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 max-w-md w-[calc(100%-24px)] bg-[#0d0e19]/95 backdrop-blur-md border-2 border-amber-500 rounded-2xl p-4 shadow-[0_0_35px_rgba(245,158,11,0.35)] animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <div>
                <span className="text-xs font-black font-heading uppercase text-amber-400 tracking-wider block">
                  🚨 ROOM DETAILS OUT
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

          {/* Urgent Notification Card Text */}
          <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 mb-2.5 text-xs text-red-200 font-bold leading-relaxed flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
            <span>
              🚨 ROOM DETAILS OUT: Room ID: <strong className="text-amber-300 font-mono font-black">{activeRoomMatch.roomId}</strong> | Pass: <strong className="text-red-300 font-mono font-black">{activeRoomMatch.roomPassword}</strong>. Join Free Fire now!
            </span>
          </div>

          {/* 1-Click Copy ID & Pass Button */}
          <button
            type="button"
            onClick={() => handleCopyCredential(`Room ID: ${activeRoomMatch.roomId} | Pass: ${activeRoomMatch.roomPassword}`, 'Room ID & Pass')}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all cursor-pointer mb-2.5"
          >
            <Copy className="w-4 h-4 text-black stroke-[3]" />
            <span>1-Click Copy ID & Pass</span>
          </button>

          {/* Separate Individual Copy Chips */}
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

            {/* Quick Feature Navigation Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('play');
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer group ${
                  activeTab === 'play'
                    ? 'bg-red-950/40 border-red-500/60 shadow-md shadow-red-950/50'
                    : 'bg-[#0e0f1d] hover:bg-[#16182c] border-red-500/20'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate font-heading">Upcoming Rooms</span>
                  <span className="text-[10px] text-slate-400 block truncate">Live countdowns</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('winners');
                }}
                className="p-2.5 rounded-xl bg-[#0e0f1d] hover:bg-[#16182c] border border-amber-500/30 text-left flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate font-heading">Past Winners</span>
                  <span className="text-[10px] text-emerald-400 block truncate font-semibold">● Payment Verified</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('ranking');
                }}
                className="p-2.5 rounded-xl bg-[#0e0f1d] hover:bg-[#16182c] border border-purple-500/30 text-left flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Crosshair className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate font-heading">Leaderboard</span>
                  <span className="text-[10px] text-slate-400 block truncate">Top Fraggers & Pts</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setGeneralRulesOpen(true);
                }}
                className="p-2.5 rounded-xl bg-[#0e0f1d] hover:bg-[#16182c] border border-slate-700 text-left flex items-center gap-2.5 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate font-heading">Fair-Play Rules</span>
                  <span className="text-[10px] text-slate-400 block truncate">Mobile Only Policy</span>
                </div>
              </button>
            </div>

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
                  <h3 className="text-base font-bold text-white font-heading">
                    No active matches found. Click 'CREATE MATCH' to add a new tournament.
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No matches are currently active. Host a match in the Admin Panel or refresh to check for upcoming rooms.
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
                    Refresh All Rooms
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
            2. WINNERS / PAST RESULTS SCREEN
           ========================================================================= */}
        {activeTab === 'winners' && (
          <WinnersTab
            tournaments={tournaments}
            onOpenRules={() => setGeneralRulesOpen(true)}
            onOpenSupport={() => setSupportModalOpen(true)}
          />
        )}

        {/* =========================================================================
            3. LIVE LEADERBOARD & STANDINGS SCREEN
           ========================================================================= */}
        {activeTab === 'ranking' && (
          <LeaderboardTab
            tournaments={tournaments}
            profile={profile}
          />
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
              <button
                onClick={() => {
                  sound.playClick();
                  setSupportModalOpen(true);
                }}
                className="w-full p-3 rounded-xl bg-black/40 hover:bg-emerald-950/30 border border-slate-900 hover:border-emerald-500/30 text-left flex items-center justify-between text-xs text-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Headphones className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-white block">24/7 Customer Support & Helpdesk</span>
                    <span className="text-[10px] text-slate-400">WhatsApp, Telegram, FAQ & Email Support</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500" />
              </button>

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

      {/* Floating 24/7 Support & Helpdesk Button */}
      <button
        onClick={() => {
          sound.playClick();
          setSupportModalOpen(true);
        }}
        className="fixed bottom-18 right-3 sm:bottom-20 sm:right-6 z-30 px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/70 border border-emerald-400/40 flex items-center gap-2 cursor-pointer active:scale-95 transition-all group"
        title="24/7 Support & Helpdesk"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300"></span>
        </span>
        <Headphones className="w-4 h-4 text-emerald-200 group-hover:rotate-12 transition-transform" />
        <span className="font-bold">24/7 Support</span>
      </button>

      {/* =========================================================================
          GLOBAL 6-TAB BOTTOM NAVIGATION BAR (PURE BLACK & GLOWING HIGHLIGHT)
         ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-red-950/80 px-1 py-1.5 flex items-center justify-around shadow-[0_-5px_25px_rgba(0,0,0,0.9)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* 1. 🎮 Play (Upcoming Tournaments Arena) */}
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('play');
          }}
          className={`relative flex flex-col items-center gap-1 px-2 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'play'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'play' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <Gamepad2 className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'play' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[0.5px] text-[10px]">Play</span>
        </button>

        {/* 2. 🏆 Winners (Past Results & Winner Proof Showcase) */}
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('winners');
          }}
          className={`relative flex flex-col items-center gap-1 px-2 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'winners'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'winners' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <Trophy className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'winners' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[0.5px] text-[10px]">Winners</span>
        </button>

        {/* 3. 👑 Leaderboard (Live Standings & Top Killers) */}
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('ranking');
          }}
          className={`relative flex flex-col items-center gap-1 px-2 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'ranking'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'ranking' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <Crown className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'ranking' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[0.5px] text-[10px]">Leaderboard</span>
        </button>

        {/* 4. 🪙 Earn (Refer & Earn ₹10 Bonus) */}
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('earn');
          }}
          className={`relative flex flex-col items-center gap-1 px-2 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'earn'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'earn' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <Coins className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'earn' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[0.5px] text-[10px]">Earn</span>
        </button>

        {/* 5. 💳 Wallet (Instant Deposit & Withdrawal) */}
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('wallet');
          }}
          className={`relative flex flex-col items-center gap-1 px-2 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'wallet'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'wallet' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <CreditCard className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'wallet' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[0.5px] text-[10px]">Wallet</span>
        </button>

        {/* 6. 👤 Account (Profile & Settings) */}
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('account');
          }}
          className={`relative flex flex-col items-center gap-1 px-2 py-1 transition-all duration-200 cursor-pointer ${
            activeTab === 'account'
              ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'account' && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          )}
          <User className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'account' ? 'scale-110 text-amber-400 stroke-[2.5]' : 'opacity-70'}`} />
          <span className="font-heading uppercase font-bold tracking-[0.5px] text-[10px]">Account</span>
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

        {/* 24/7 Official Customer Support Modal */}
        {supportModalOpen && (
          <SupportModal
            isOpen={supportModalOpen}
            onClose={() => setSupportModalOpen(false)}
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
