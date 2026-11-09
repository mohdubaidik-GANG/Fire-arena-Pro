import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  Trash2, 
  Key, 
  Megaphone, 
  Coins, 
  Trophy, 
  ShieldAlert, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { AppNotification, NotificationCategory } from '../types';
import { sound } from '../utils/audio';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTournament?: (tournamentId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectTournament,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('firearena_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync readIds to localStorage
  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem('firearena_read_notifications', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const markAllAsRead = () => {
    sound.playClick();
    const allIds = notifications.map((n) => n.id);
    const next = new Set([...readIds, ...allIds]);
    setReadIds(next);
    try {
      localStorage.setItem('firearena_read_notifications', JSON.stringify(Array.from(next)));
    } catch {}
  };

  // Listen to root notifications, broadcast_notifications and users/{uid}/notifications
  useEffect(() => {
    let rootNotifs: AppNotification[] = [];
    let broadcasts: AppNotification[] = [];
    let userNotifs: AppNotification[] = [];

    const getTimestampMs = (val: any) => {
      if (!val) return 0;
      if (val?.toMillis && typeof val.toMillis === 'function') return val.toMillis();
      if (val?.toDate && typeof val.toDate === 'function') return val.toDate().getTime();
      if (val instanceof Date) return val.getTime();
      const parsed = new Date(val).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    const updateCombined = () => {
      const combined = [...rootNotifs, ...broadcasts, ...userNotifs];
      // Sort newest first
      combined.sort((a, b) => {
        return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
      });
      // Deduplicate by ID
      const seen = new Set<string>();
      const unique = combined.filter((item) => {
        if (!item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setNotifications(unique);
    };

    // 1. Root notifications collection (Room ID, Password, Broadcasts, Match updates)
    const rootQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubRoot = onSnapshot(
      rootQuery,
      (snap) => {
        rootNotifs = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              category: data.category || (data.type === 'ROOM_CREDENTIALS' ? 'ROOM_ALERT' : 'ANNOUNCEMENT'),
            } as AppNotification;
          })
          .filter((item) => item.userId === 'ALL' || !item.userId || item.userId === user?.uid);
        updateCombined();
      },
      (err) => {
        console.warn('Root notifications listener warning:', err.message);
      }
    );

    // 2. Broadcast notifications
    const bcastQuery = query(
      collection(db, 'broadcast_notifications'),
      orderBy('createdAt', 'desc'),
      limit(40)
    );
    const unsubBroadcast = onSnapshot(
      bcastQuery,
      (snap) => {
        broadcasts = snap.docs.map((d) => ({
          id: d.id,
          category: 'ANNOUNCEMENT',
          ...(d.data() as Omit<AppNotification, 'id'>),
        }));
        updateCombined();
      },
      (err) => {
        console.warn('Broadcast notifications listener error:', err.message);
      }
    );

    // 3. User-specific notifications
    let unsubUser = () => {};
    if (user?.uid) {
      const userNotifQuery = query(
        collection(db, 'users', user.uid, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(40)
      );
      unsubUser = onSnapshot(
        userNotifQuery,
        (snap) => {
          userNotifs = snap.docs.map((d) => ({
            id: d.id,
            userId: user.uid,
            ...(d.data() as Omit<AppNotification, 'id'>),
          }));
          updateCombined();
        },
        (err) => {
          console.warn('User notifications listener error:', err.message);
        }
      );
    }

    return () => {
      unsubRoot();
      unsubBroadcast();
      unsubUser();
    };
  }, [user?.uid]);

  const handleDelete = async (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    sound.playClick();
    if (user?.uid && notif.userId === user.uid) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'notifications', notif.id));
      } catch (err) {
        console.warn('Could not delete notification:', err);
      }
      try {
        await deleteDoc(doc(db, 'notifications', notif.id));
      } catch {}
    } else {
      // For broadcast notifications, hide locally
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }
  };

  const handleCopy = (text: string, id: string) => {
    sound.playCopy();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimestamp = (dateVal?: any) => {
    if (!dateVal) return '';
    try {
      let d: Date;
      if (dateVal?.toDate && typeof dateVal.toDate === 'function') {
        d = dateVal.toDate();
      } else if (dateVal instanceof Date) {
        d = dateVal;
      } else {
        d = new Date(dateVal);
      }
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getCategoryDetails = (cat?: NotificationCategory | string) => {
    switch (cat) {
      case 'ROOM_ALERT':
      case 'ROOM_CREDENTIALS':
        return {
          label: 'ROOM ALERT',
          badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
          icon: <Key className="w-4 h-4 text-red-400 shrink-0" />,
        };
      case 'WALLET':
        return {
          label: 'WALLET',
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          icon: <Coins className="w-4 h-4 text-emerald-400 shrink-0" />,
        };
      case 'TOURNAMENT':
        return {
          label: 'MATCH',
          badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          icon: <Trophy className="w-4 h-4 text-amber-400 shrink-0" />,
        };
      case 'ANNOUNCEMENT':
      default:
        return {
          label: 'ANNOUNCEMENT',
          badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          icon: <Megaphone className="w-4 h-4 text-blue-400 shrink-0" />,
        };
    }
  };

  const filtered = notifications.filter((n) => {
    if (selectedFilter === 'ALL') return true;
    return n.category === selectedFilter;
  });

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#0c0d14] border border-red-900/60 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-4 sm:p-5 border-b border-red-950/60 bg-gradient-to-r from-red-950/40 via-[#0e0f19] to-red-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-heading font-black text-white uppercase tracking-wider">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Live alerts, room IDs & tournament updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Mark Read</span>
              </button>
            )}
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="p-2.5 px-4 bg-[#08090f] border-b border-red-950/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ROOM_ALERT', label: '🚨 Room Alerts' },
            { id: 'ANNOUNCEMENT', label: '📢 News' },
            { id: 'WALLET', label: '🪙 Wallet' },
            { id: 'TOURNAMENT', label: '🏆 Matches' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setSelectedFilter(tab.id);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                selectedFilter === tab.id
                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-transparent">
          {filtered.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-red-950/30 border border-red-900/40 flex items-center justify-center text-red-400/60 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <Bell className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">No Notifications Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Room IDs, password deliveries and official tournament announcements will appear right here.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isUnread = !readIds.has(item.id);
              const cat = getCategoryDetails(item.category || item.type);
              const hasRoomCreds = !!(item.roomId && item.roomPassword);

              return (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`relative p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                    isUnread
                      ? 'bg-gradient-to-r from-red-950/30 via-[#10121d] to-[#0d0e17] border-red-600/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'bg-[#0f101a]/70 hover:bg-[#121422] border-slate-800/80'
                  }`}
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-md border flex items-center gap-1 ${cat.badgeClass}`}>
                        {cat.icon}
                        {cat.label}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatTimestamp(item.createdAt)}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, item)}
                        className="text-slate-600 hover:text-red-400 p-1 rounded transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Message */}
                  <h4 className="text-sm font-bold text-white mb-1 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-300 font-normal leading-relaxed whitespace-pre-line">
                    {item.message}
                  </p>

                  {/* Room ID & Password 1-Tap Copy Box */}
                  {hasRoomCreds && (
                    <div className="mt-3 p-3 rounded-lg bg-black/60 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-amber-500/20">
                        <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1 tracking-wider">
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          Custom Room Credentials
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Join in Free Fire now
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Room ID */}
                        <div className="flex items-center justify-between bg-[#151724] px-3 py-2 rounded-md border border-slate-700">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Room ID</span>
                            <span className="font-mono font-black text-sm text-amber-300 tracking-wider">
                              {item.roomId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.roomId!, `room-${item.id}`);
                            }}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            {copiedId === `room-${item.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Room Password */}
                        <div className="flex items-center justify-between bg-[#151724] px-3 py-2 rounded-md border border-slate-700">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Password</span>
                            <span className="font-mono font-black text-sm text-red-300 tracking-wider">
                              {item.roomPassword}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.roomPassword!, `pass-${item.id}`);
                            }}
                            className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            {copiedId === `pass-${item.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 1-Click Copy Both ID & Password Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(`Room ID: ${item.roomId} | Password: ${item.roomPassword}`, `both-${item.id}`);
                        }}
                        className="w-full mt-2.5 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 hover:from-amber-400 hover:to-red-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        {copiedId === `both-${item.id}` ? (
                          <>
                            <Check className="w-4 h-4 text-black stroke-[3]" />
                            <span className="font-bold">Copied ID & Pass!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-black stroke-[2.5]" />
                            <span>1-Click Copy ID & Pass</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Tournament action link if provided */}
                  {item.tournamentId && onSelectTournament && (
                    <div className="mt-2.5 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.playClick();
                          onClose();
                          onSelectTournament(item.tournamentId!);
                        }}
                        className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>View Tournament Details</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#08090f] border-t border-red-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Never share custom room passwords with non-joined players.</span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg font-bold border border-slate-700/80 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
