import React, { useState } from 'react';
import { X, User, Crosshair, Shield, Check, AlertCircle, Save, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWallet?: () => void;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenWallet, onLogout }) => {
  const { user, profile, updateProfileDetails, logout } = useAuth();
  const [ign, setIgn] = useState(profile?.ign || '');
  const [ffUid, setFfUid] = useState(profile?.freeFireUid || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedSuccess(false);

    if (ign.trim().length < 3) {
      setError('Free Fire IGN must be at least 3 characters.');
      return;
    }

    if (!/^\d{6,15}$/.test(ffUid.trim())) {
      setError('Free Fire UID must be a 6 to 15 digit number.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileDetails(ign.trim(), ffUid.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update credentials';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0f0f1a] border border-amber-500/20 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#121222]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Gamer Profile</h2>
              <p className="text-xs text-slate-400">Free Fire MAX Identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Gamer Identity Card */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Free Fire UID</span>
              <div className="text-sm font-mono text-[#00f2fe] font-bold tracking-wider">
                {profile.freeFireUid || user?.uid || 'Not Set'}
              </div>
              <div className="text-xs text-white font-semibold">
                IGN: <span className="text-amber-400">{profile.ign || 'Gamer'}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                ● Active Pro
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {profile.role === 'admin' ? 'Super Admin' : 'Verified Gamer'}
              </span>
            </div>
          </div>

          {/* Quick Career Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Total Kills</span>
              <span className="text-base font-bold font-mono text-[#00f2fe]">{profile.totalKills || 0}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Matches</span>
              <span className="text-base font-bold font-mono text-amber-400">{profile.matchesPlayed || 0}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Booyah</span>
              <span className="text-base font-bold font-mono text-emerald-400">{profile.tournamentsWon || 0}</span>
            </div>
          </div>

          {/* Zest Account Wallet Summary */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-[#121222] border border-amber-500/30 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-mono font-bold tracking-wider block">
                Zest Account Total Balance
              </span>
              <div className="text-xl font-black font-mono text-white mt-0.5">
                ₹{((profile?.depositBalance || 0) + (profile?.winningsBalance || 0)).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Deposit: ₹{profile?.depositBalance || 0} · Winnings: ₹{profile?.winningsBalance || 0}
              </div>
            </div>
            {onOpenWallet && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWallet();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                Manage Wallet
              </button>
            )}
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Gamer credentials updated successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Free Fire In-Game Name (IGN)
              </label>
              <input
                type="text"
                value={ign}
                onChange={(e) => setIgn(e.target.value)}
                required
                maxLength={30}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Free Fire UID (Numeric)
              </label>
              <input
                type="text"
                value={ffUid}
                onChange={(e) => setFfUid(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={15}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Update In-Game Details'}</span>
            </button>
          </form>

          {/* Logout Action */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={async () => {
                onClose();
                if (onLogout) {
                  onLogout();
                } else {
                  await logout();
                }
              }}
              className="w-full h-10 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-400 hover:text-red-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out from FireArena</span>
            </button>
          </div>

          {profile.isBanned && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300">
              <span className="font-bold block">Account Status: Suspended</span>
              <span>Your account has been temporarily restricted by the administration.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
