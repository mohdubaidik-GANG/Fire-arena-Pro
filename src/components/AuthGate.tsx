import React, { useState } from 'react';
import { Shield, Flame, Trophy, Coins, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthGate: React.FC = () => {
  const { loginWithGoogle, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const handleSignIn = async () => {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMsg(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06060a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))] overflow-y-auto">
      <div className="w-full max-w-md relative">
        {/* Cyberpunk Neon Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-xl opacity-70 pointer-events-none" />

        <div className="relative bg-[#0d0d16] border border-amber-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Logo Brand Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 border border-amber-400/40">
              <Flame className="w-9 h-9 text-black fill-black stroke-[2.5]" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-semibold">
                Esports Battle Arena
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-heading">
              FIRE<span className="text-amber-400">ARENA</span> <span className="text-orange-500">MAX</span>
            </h1>

            <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">
              Play Free Fire MAX Custom Rooms, win instant cash rewards, and withdraw via UPI or Google Play codes.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200">Daily Rooms</p>
                <p className="text-[11px] text-slate-400">Solo, Duo & Squad</p>
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200">Instant Payouts</p>
                <p className="text-[11px] text-slate-400">UPI & Redeem Codes</p>
              </div>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mandatory Google Sign-In Action */}
          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              disabled={isSigningIn || loading}
              className="w-full h-13 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 shadow-lg shadow-white/5 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSigningIn ? 'Connecting with Google...' : 'Continue with Google Account'}</span>
              <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Verified Gmail Login Required to Access Arena</span>
            </div>
          </div>

          {/* Unified Platform Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Official Free Fire MAX Esports Engine · 24/7 Live Customs</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
