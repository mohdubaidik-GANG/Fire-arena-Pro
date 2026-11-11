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
  Key,
  CheckCircle2,
  Eye,
  EyeOff,
  Link as LinkIcon,
  X,
  ArrowRight,
  BookOpen,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Gift,
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

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

  // Help Guide Modal State
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<'register' | 'login'>('register');

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form States (Free Fire IGN, UID, WhatsApp Phone, Password, Referral Code)
  const [regIgn, setRegIgn] = useState('');
  const [regFreeFireUid, setRegFreeFireUid] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regReferralCode, setRegReferralCode] = useState('');

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

  // 1b. Handle 1-Click Google Sign In
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      setSuccessMsg('Signed in with Google successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
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
      await registerWithCredentials(regIgn, regFreeFireUid, regPassword, regReferralCode, regPhone);
      if (regReferralCode.trim().toUpperCase() === 'NAWA3773') {
        setSuccessMsg('Account registered! ₹10 Welcome Bonus has been credited to your wallet via code NAWA3773.');
      } else {
        setSuccessMsg('Account registered successfully! Welcome to Fire Arena Pro.');
      }
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-4 sm:pt-6 px-4 pb-12 bg-[#06060a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.18),rgba(255,255,255,0))] overflow-y-auto">
      <div className="w-full max-w-md relative my-0 sm:my-2">
        {/* Cyberpunk Neon Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-xl opacity-70 pointer-events-none" />

        <div className="relative bg-[#0d0d16] border border-amber-500/20 rounded-2xl p-5 sm:p-7 shadow-2xl">
          {/* Quick Action Top Controls (PWA Install & Guide) */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="h-7 px-2.5 rounded-full bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-orange-500/10 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-[11px] font-semibold flex items-center gap-1.5 shadow-sm shadow-amber-500/20 active:scale-95 transition-all cursor-pointer ml-auto"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Login Guide</span>
            </button>
          </div>

          {/* Central Glowing Fire Arena Pro Emblem - Main Visual Anchor */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl p-1.5 bg-gradient-to-br from-amber-500/25 via-orange-500/20 to-red-600/30 flex items-center justify-center shadow-[0_0_28px_rgba(245,158,11,0.5)] mb-3 border border-amber-400/50 overflow-hidden">
              <img src="/logo.png" alt="Fire Arena Pro" className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(234,179,8,0.7)]" />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                Official Esports Tournament Platform
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              FIRE<span className="text-amber-400">ARENA</span> <span className="text-orange-500">PRO</span>
            </h1>

            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Play Free Fire MAX Custom Rooms · Win Cash Rewards · Fast UPI Payouts
            </p>
          </div>

          {/* 1-Click Google Sign-In */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || loading}
              className="w-full h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md shadow-white/5 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-70"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.18 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                />
              </svg>
              <span>1-Click Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                Or With Gamer Account
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
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
                  Free Fire UID <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter your Free Fire UID (e.g. 74892314)"
                    required
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-slate-500">Free Fire profile se numeric UID daalein.</span>
                  <span className="text-amber-400/90 font-mono font-semibold">Admin: 15524834348</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">
                    Account Password <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono">
                    Password nahi set? Leave empty & click Login to link!
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
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
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
                <span>{isSubmitting ? 'Authenticating...' : 'Login to Play'}</span>
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
                <p className="text-[10px] text-amber-400/90 mt-1 font-mono">
                  💡 Free Fire profile se 8-11 digit numeric UID daalein.
                </p>
              </div>

              {/* WhatsApp Phone Number */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>WhatsApp Phone Number <span className="text-amber-400">*</span></span>
                  <span className="text-[10px] text-emerald-400 font-normal">SMS / Room Alerts</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9876543210 (10 Digits)"
                    required
                    maxLength={10}
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Used for match updates, Room pass pings & payment verification.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Account Password (Min 4 Characters) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Set 4+ character password"
                    required
                    minLength={4}
                    className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">
                    Referral Code (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setRegReferralCode('NAWA3773')}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-mono font-bold underline cursor-pointer"
                  >
                    Apply 'NAWA3773' (+₹10 Bonus)
                  </button>
                </div>
                <div className="relative">
                  <Gift className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                  <input
                    type="text"
                    value={regReferralCode}
                    onChange={(e) => setRegReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code (e.g. NAWA3773)"
                    maxLength={15}
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 placeholder-slate-500 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-emerald-400 mt-1 font-mono font-semibold flex items-center gap-1">
                  <span>🎁</span>
                  <span>Use code <strong>NAWA3773</strong> to get ₹10 instant welcome signup bonus!</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70 mt-1"
              >
                <User className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Creating Profile...' : 'Create Account'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Unified Platform Footer */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Official Free Fire MAX Esports Engine · 100% Data Preserved</span>
            </span>
          </div>
        </div>
      </div>

      {/* ================= STEP-BY-STEP HOW TO LOGIN & REGISTER GUIDE MODAL ================= */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0e0e1a] border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative my-auto">
            <button
              onClick={() => setGuideModalOpen(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black shrink-0 shadow-lg shadow-amber-500/20">
                <BookOpen className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-heading">
                  How to Login & Register Guide
                </h3>
                <p className="text-xs text-amber-400 font-mono">Fire Arena Pro Complete Gamer Manual</p>
              </div>
            </div>

            {/* Guide Tabs */}
            <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => setGuideTab('register')}
                className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  guideTab === 'register'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Naye Users (Register Guide)</span>
              </button>

              <button
                type="button"
                onClick={() => setGuideTab('login')}
                className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  guideTab === 'login'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Purane Users (Login Guide)</span>
              </button>
            </div>

            {/* Guide Content: Tab 1 (Register) */}
            {guideTab === 'register' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-white">Step 1: "Register" tab par click karein</strong>
                    <p className="text-slate-400 mt-0.5">Screen ke top par diye gaye "Register (New Gamer)" tab ko chunein.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-white">Step 2: Apna Free Fire In-Game Name (IGN) enter karein</strong>
                    <p className="text-slate-400 mt-0.5">Apna wahi IGN likhein jo Free Fire MAX game ke andar aapka display name hai.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-white">Step 3: Free Fire profile se 8-11 digit UID copy karein</strong>
                    <p className="text-slate-400 mt-0.5">Game profile ke avatar ke neeche se numeric UID copy karke yahan paste karein.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <strong className="text-white">Step 4: Password set karein aur Referral Code (Optional) daalein</strong>
                    <p className="text-slate-400 mt-0.5">Apna 4+ character password set karein aur dost ka referral code daal kar ₹10 instant bonus paayein.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <strong className="text-white">Step 5: "Create Account" par click karein</strong>
                    <p className="text-slate-400 mt-0.5">Aapka profile instantly create ho jayega aur aap Arena ke tournaments join karne ke liye ready ho jayenge.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Guide Content: Tab 2 (Login) */}
            {guideTab === 'login' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-white">Step 1: "Login" tab select karein</strong>
                    <p className="text-slate-400 mt-0.5">Top selector me "Gamer Login" tab select karein.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-white">Step 2: Apni registered Free Fire UID ya Email daalein</strong>
                    <p className="text-slate-400 mt-0.5">Identifier box me apna UID (e.g. 74892314) ya registered email daalein.</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-white">Step 3: Apna Password enter karein</strong>
                    <p className="text-slate-400 mt-0.5">
                      Apna set kiya hua password enter karein. (Purane Google users bina password dale Login dabayein taaki account link popup khul jaye).
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <strong className="text-white">Step 4: "Login to Play" dabayein</strong>
                    <p className="text-slate-400 mt-0.5">Button click karte hi aapka wallet balance aur booked matches restore ho kar dashboard khul jayega.</p>
                  </div>
                </div>

                {/* Admin Access Note */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-400 block font-heading">Super Admin Direct Access:</strong>
                    <p className="text-slate-300 mt-0.5">
                      Admin credentials: Free Fire UID <code className="text-amber-300 bg-black/60 px-1 py-0.5 rounded font-mono font-bold">15524834348</code> aur Password <code className="text-amber-300 bg-black/60 px-1 py-0.5 rounded font-mono font-bold">271845</code> daal kar direct Admin Dashboard me login karein.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick WhatsApp Support Note at bottom */}
            <div className="mt-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>24/7 Gamer Support Helpline</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Login ya Password me pareshani hone par Admin Support se WhatsApp par sampark karein.
                </p>
              </div>

              <a
                href="https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC"
                target="_blank"
                rel="noreferrer"
                className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                title="Join Official WhatsApp Group / Support"
              >
                <span>WhatsApp Support</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

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
