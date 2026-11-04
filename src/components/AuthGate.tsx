import React, { useState } from 'react';
import {
  Shield,
  Flame,
  Trophy,
  Coins,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Lock,
  User,
  Phone,
  Key,
  CheckCircle2,
  Eye,
  EyeOff,
  Link as LinkIcon,
  X,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

export const AuthGate: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithCredentials,
    linkExistingAccountPassword,
    registerWithCredentials,
    loading
  } = useAuth();

  // Tab State: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form States
  const [regIgn, setRegIgn] = useState('');
  const [regFreeFireUid, setRegFreeFireUid] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Migration / Password Link Modal State
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [profileToLink, setProfileToLink] = useState<UserProfile | null>(null);
  const [newLinkPassword, setNewLinkPassword] = useState('');
  const [confirmLinkPassword, setConfirmLinkPassword] = useState('');

  // UI States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await loginWithCredentials(loginIdentifier, loginPassword);
      if (res.needsPasswordLink && res.existingProfile) {
        setProfileToLink(res.existingProfile);
        setLinkModalOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check credentials.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      await registerWithCredentials(regIgn, regFreeFireUid, regPhone, regPassword);
      setSuccessMsg('Account registered successfully! Welcome to FireArena MAX.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please verify details.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Link Existing Account Password Submit
  const handleLinkPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!profileToLink) return;

    if (newLinkPassword.trim().length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    if (newLinkPassword !== confirmLinkPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      await linkExistingAccountPassword(profileToLink.uid, newLinkPassword);
      setLinkModalOpen(false);
      setSuccessMsg('Existing account linked successfully! Balance and history restored.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to link password.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06060a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))] overflow-y-auto">
      <div className="w-full max-w-md relative my-8">
        {/* Cyberpunk Neon Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-xl opacity-70 pointer-events-none" />

        <div className="relative bg-[#0d0d16] border border-amber-500/20 rounded-2xl p-6 sm:p-7 shadow-2xl">
          {/* Logo Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 border border-amber-400/40">
              <Flame className="w-8 h-8 text-black fill-black stroke-[2.5]" />
            </div>

            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-semibold">
                Esports Battle Arena
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              FIRE<span className="text-amber-400">ARENA</span> <span className="text-orange-500">MAX</span>
            </h1>

            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Play Free Fire MAX Custom Rooms · Win Cash Rewards · Fast UPI Payouts
            </p>
          </div>

          {/* Navigation Tabs: [ Login ] and [ Register ] */}
          <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Gamer Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Register (New Gamer)</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= TAB 1: LOGIN ================= */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Identifier (Free Fire UID or Email) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. 74892314 or user@gmail.com (or admin)"
                    required
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">
                    Account Password <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Purana user? Leave empty to link!
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70 mt-1"
              >
                <Key className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Authenticating...' : 'Enter FireArena MAX'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ================= TAB 2: REGISTER ================= */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Free Fire In-Game Name (IGN) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={regIgn}
                    onChange={(e) => setRegIgn(e.target.value)}
                    placeholder="e.g. TotalGamer_99"
                    required
                    maxLength={25}
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Free Fire Numeric UID (8-11 Digits) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={regFreeFireUid}
                    onChange={(e) => setRegFreeFireUid(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="e.g. 74892314"
                    required
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Found in your Free Fire profile under your avatar.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Mobile Number (For UPI Payouts)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit PhonePe / GPay number"
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Set Password <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    required
                    minLength={4}
                    className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70 mt-1"
              >
                <User className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Creating Profile...' : 'Create Account & Join Arena'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Divider: OR CONTINUE WITH GOOGLE */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-[#0d0d16] px-2 text-slate-500">Or Continue With</span>
            </div>
          </div>

          {/* Google 1-Tap Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || loading}
            className="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>Sign in with Google (1-Tap Account Picker)</span>
          </button>

          {/* Unified Platform Footer */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Official Free Fire MAX Esports Engine · 100% Data Preserved</span>
            </span>
          </div>
        </div>
      </div>

      {/* ================= EXISTING USER MIGRATION MODAL ================= */}
      {linkModalOpen && profileToLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f0f1c] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setLinkModalOpen(false)}
              className="absolute right-4 top-4 w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <LinkIcon className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Link Existing Gamer Account
                </h3>
                <p className="text-xs text-slate-400">Account verified in FireArena database!</p>
              </div>
            </div>

            {/* Found Account Preview Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs mb-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">In-Game Name:</span>
                <strong className="text-amber-400 font-mono">{profileToLink.ign || 'Gamer'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Free Fire UID:</span>
                <strong className="text-white font-mono">{profileToLink.freeFireUid || 'N/A'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Wallet Balance:</span>
                <strong className="text-emerald-400 font-mono">
                  ₹{(profileToLink.depositBalance || 0) + (profileToLink.winningsBalance || 0)}
                </strong>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Set a password to link your existing account. Your current wallet balance and match registrations will be immediately restored!
            </p>

            <form onSubmit={handleLinkPasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Choose New Password <span className="text-amber-400">*</span>
                </label>
                <input
                  type="password"
                  value={newLinkPassword}
                  onChange={(e) => setNewLinkPassword(e.target.value)}
                  placeholder="Min 4 characters"
                  required
                  minLength={4}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Confirm Password <span className="text-amber-400">*</span>
                </label>
                <input
                  type="password"
                  value={confirmLinkPassword}
                  onChange={(e) => setConfirmLinkPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={4}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Linking...' : 'Set Password & Enter Arena'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
