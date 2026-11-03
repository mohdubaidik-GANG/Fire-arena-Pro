import React from 'react';
import { Flame, Wallet, PlusCircle, ArrowUpRight, LogOut, ShieldAlert, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenWallet: (tab?: 'overview' | 'deposit' | 'withdraw' | 'history') => void;
  onOpenProfile: () => void;
  onLogout?: () => void;
  isAdminRoute?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenWallet, onOpenProfile, onLogout, isAdminRoute = false }) => {
  const { user, profile, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#08080f]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Zone */}
        <a href="/" className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 border border-amber-400/40">
            <Flame className="w-5 h-5 text-black fill-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-white leading-none">
                FIRE<span className="text-amber-400">ARENA</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                MAX
              </span>
            </div>
            {profile && (
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-[140px] sm:max-w-none">
                IGN: <span className="text-amber-400 font-semibold">{profile.ign}</span>
              </p>
            )}
          </div>
        </a>

        {/* Dual Wallet Display (Interactive Click to Open Wallet) */}
        {profile && !isAdminRoute && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dual Wallet Summary Card */}
            <div
              onClick={() => onOpenWallet('overview')}
              className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all shadow-sm"
              title="Click to view full Zest Account Balance & Career Stats"
            >
              {/* Deposit Cash */}
              <div className="text-left">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Deposit</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-white tabular-nums">
                  ₹{profile.depositBalance ?? 0}
                </span>
              </div>

              <div className="w-px h-6 bg-slate-800" />

              {/* Winnings Cash */}
              <div className="text-left">
                <span className="block text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Winnings</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400 tabular-nums">
                  ₹{profile.winningsBalance ?? 0}
                </span>
              </div>
            </div>

            {/* Deposit Quick Action */}
            <button
              onClick={() => onOpenWallet('deposit')}
              className="h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Cash</span>
            </button>

            {/* Withdraw Quick Action */}
            <button
              onClick={() => onOpenWallet('withdraw')}
              className="h-9 px-2.5 sm:px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Withdraw</span>
            </button>
          </div>
        )}

        {/* Right Nav Links & Actions */}
        <div className="flex items-center gap-2">
          {profile && (
            <button
              onClick={onOpenProfile}
              className="h-9 px-2.5 sm:px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Gamer Profile & Settings"
            >
              <User className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}

          <button
            onClick={onLogout || logout}
            className="h-9 px-3 rounded-lg bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 flex items-center gap-1.5 text-slate-300 hover:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
            title="Sign Out to Login Screen"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile-only Wallet Strip */}
      {profile && !isAdminRoute && (
        <div className="sm:hidden mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Deposit: <strong className="text-white font-mono font-bold">₹{profile.depositBalance ?? 0}</strong>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              Winnings: <strong className="text-emerald-400 font-mono font-bold">₹{profile.winningsBalance ?? 0}</strong>
            </span>
          </div>

          <button
            onClick={() => onOpenWallet('overview')}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
          >
            Manage Wallet →
          </button>
        </div>
      )}
    </header>
  );
};
