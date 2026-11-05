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
      <div className="w-full max-w-md bg-[#090a14] border border-red-950/80 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-red-950/60 bg-[#0e0c18]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 p-[2px] shadow-[0_0_12px_rgba(234,179,8,0.4)] overflow-hidden">
              <img src="/logo.png" alt="Fire Arena Pro" className="w-full h-full rounded-lg object-cover" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Fire Arena Pro Gamer Profile</h2>
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
          <div className="p-3.5 rounded-xl bg-black/50 border border-red-950/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Free Fire UID</span>
              <div className="text-sm font-mono text-red-400 font-bold tracking-wider">
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
            <div className="p-2.5 rounded-xl bg-[#0d0e1a] border border-red-950/50 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Total Kills</span>
              <span className="text-base font-bold font-mono text-red-400">{profile.totalKills || 0}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0d0e1a] border border-red-950/50 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Matches</span>
              <span className="text-base font-bold font-mono text-amber-400">{profile.matchesPlayed || 0}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0d0e1a] border border-red-950/50 text-center">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Booyah</span>
              <span className="text-base font-bold font-mono text-emerald-400">{profile.tournamentsWon || 0}</span>
            </div>
          </div>

          {/* Referral & Invite Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/20 via-[#130f1d] to-[#0e0c1a] border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider block">
                  My Referral Code
                </span>
                <span className="text-base font-black font-mono text-white tracking-widest">
                  {profile.referralCode || 'FIRE8492'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-mono block">Referrals / Earned</span>
                <span className="text-xs font-bold font-mono text-emerald-400">
                  {profile.totalReferrals || 0} Joined · ₹{(profile.totalReferrals || 0) * 10}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const code = profile.referralCode || 'FIRE8492';
                  navigator.clipboard.writeText(code);
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 2500);
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy Code</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Join Fire Arena Pro using my referral code *${profile.referralCode || 'FIRE8492'}* and get ₹10 instant signup bonus! Download & Play: ${window.location.origin}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>WhatsApp Share</span>
              </a>
            </div>
          </div>

          {/* Fire Arena Pro Account Wallet Summary */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/30 to-[#120a1e] border border-red-900/40 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-red-400 uppercase font-mono font-bold tracking-wider block">
                Total Wallet Coins
              </span>
              <div className="text-xl font-black font-mono text-white mt-0.5">
                🪙 {((profile?.depositBalance || 0) + (profile?.winningsBalance || 0)).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Deposit: 🪙 {profile?.depositBalance || 0} · Winning: 🪙 {profile?.winningsBalance || 0}
              </div>
            </div>
            {onOpenWallet && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWallet();
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-colors whitespace-nowrap shadow-md shadow-red-600/30"
              >
                Manage Wallet
              </button>
            )}
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Copied / Saved successfully!</span>
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
              className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
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
