import React, { useState } from 'react';
import { Globe, Headphones, Plus, User, LogOut, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenWallet: (tab?: 'overview' | 'deposit' | 'withdraw' | 'history') => void;
  onOpenProfile: () => void;
  onLogout?: () => void;
  isAdminRoute?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenWallet, onOpenProfile, onLogout, isAdminRoute = false }) => {
  const { user, profile, isAdmin, logout } = useAuth();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'EN' | 'HI'>('EN');

  const totalBalance = ((profile?.depositBalance || 0) + (profile?.winningsBalance || 0)).toFixed(2);
  const username = profile?.ign || user?.displayName || 'Gamer';

  return (
    <header className="sticky top-0 z-30 bg-[#06070a]/95 backdrop-blur-md border-b border-red-950/60 px-3 sm:px-6 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: User Profile Avatar & "Welcome Back, [Username/IGN]" in bright red/white */}
        <div 
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
        >
          <div className="relative shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 p-[2px] shadow-[0_0_14px_rgba(234,179,8,0.5)] overflow-hidden">
              <img src="/logo.png" alt="Fire Arena Pro" className="w-full h-full rounded-full object-cover" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#06070a]" />
          </div>

          <div className="min-w-0 text-left">
            <span className="block text-[10px] font-heading font-black tracking-wider uppercase text-red-500 leading-none">
              Welcome Back,
            </span>
            <span className="text-xs sm:text-sm font-heading font-bold text-white truncate block max-w-[120px] sm:max-w-[200px] leading-tight">
              {username}
            </span>
          </div>
        </div>

        {/* Right: Language Icon (🌐), Customer Support (🎧), and Red Wallet Pill Capsule "🪙 [0.00] | +" */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Language Selector (🌐) */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="w-8 h-8 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Change Language"
              aria-label="Change Language"
            >
              <Globe className="w-4 h-4 text-slate-300" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 top-10 w-32 bg-[#0d0e18] border border-red-950/80 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setCurrentLang('EN');
                    setLangMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-white hover:bg-red-950/40 flex items-center justify-between cursor-pointer"
                >
                  <span>English</span>
                  {currentLang === 'EN' && <Check className="w-3.5 h-3.5 text-red-400" />}
                </button>
                <button
                  onClick={() => {
                    setCurrentLang('HI');
                    setLangMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-white hover:bg-red-950/40 flex items-center justify-between cursor-pointer"
                >
                  <span>हिंदी (Hindi)</span>
                  {currentLang === 'HI' && <Check className="w-3.5 h-3.5 text-red-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Customer Support Icon (🎧) */}
          <a
            href="https://wa.me/919876543210?text=Hi%20Fire%20Arena%20Pro%20Support,%20I%20need%20help%20with%20tournaments"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
            title="Customer Support (10 AM - 10 PM)"
            aria-label="Customer Support"
          >
            <Headphones className="w-4 h-4 text-slate-300 hover:text-red-400" />
          </a>

          {/* Red Wallet Pill Capsule showing Balance: "🪙 [0.00] | +" */}
          <div className="flex items-center rounded-full bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30 border border-red-500/50 p-0.5">
            <button
              onClick={() => onOpenWallet('overview')}
              className="flex items-center gap-1.5 px-2.5 py-1 cursor-pointer hover:opacity-95 transition-opacity"
              title="View Wallet Balance"
            >
              <span className="text-amber-300 text-xs">🪙</span>
              <span className="font-mono font-black text-xs text-white tracking-tight">
                {totalBalance}
              </span>
            </button>
            <span className="text-red-300/60 font-light text-xs select-none">|</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenWallet('deposit');
              }}
              className="w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center ml-1 cursor-pointer transition-colors"
              title="Add Coins"
              aria-label="Add Coins"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          {/* PWA Install Button (Compact) */}
          <div className="hidden md:block">
            <PWAInstallButton />
          </div>
        </div>
      </div>
    </header>
  );
};
