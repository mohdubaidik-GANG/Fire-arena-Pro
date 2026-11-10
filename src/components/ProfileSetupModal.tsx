import React, { useState } from 'react';
import { Crosshair, UserCheck, AlertCircle, ArrowRight, Phone, Gift, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfileSetupModal: React.FC = () => {
  const { user, saveInitialProfile } = useAuth();
  const [ign, setIgn] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedIgn = ign.trim();
    const trimmedUid = ffUid.trim();
    const trimmedPhone = whatsappPhone.replace(/\D/g, '').slice(-10);

    if (trimmedIgn.length < 2) {
      setError('Free Fire IGN must be at least 2 characters.');
      return;
    }

    if (!/^\d{8,11}$/.test(trimmedUid)) {
      setError('Free Fire UID must be a valid 8-11 digit numeric ID.');
      return;
    }

    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError('Please enter a valid 10-digit WhatsApp phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveInitialProfile(trimmedIgn, trimmedUid, trimmedPhone, referralCode.trim());
      if (referralCode.trim().toUpperCase() === 'NAWA3773') {
        setSuccess('Profile saved! ₹10 Welcome Bonus has been credited to your wallet via code NAWA3773.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save gamer profile';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-[#0f0f18] border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl relative my-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Complete Gamer Profile</h2>
            <p className="text-xs text-slate-400">Required for Free Fire room invites & instant prize payouts</p>
          </div>
        </div>

        <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
          <span className="text-slate-400">Connected Account:</span>{' '}
          <span className="text-amber-400 font-medium font-mono">{user?.email}</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Free Fire In-Game Name (IGN) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Free Fire In-Game Name (IGN) <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={ign}
              onChange={(e) => setIgn(e.target.value)}
              placeholder="e.g. TotalGamer_99"
              required
              maxLength={25}
              className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">Exact IGN from your Free Fire MAX profile.</p>
          </div>

          {/* 2. Free Fire UID (Numeric) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Free Fire UID (Numeric) <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={ffUid}
              onChange={(e) => setFfUid(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="e.g. 74892314"
              required
              maxLength={11}
              className="w-full h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="text-[10px] text-slate-500 mt-1">8-11 digit numeric account UID.</p>
          </div>

          {/* 3. WhatsApp Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>WhatsApp Phone Number <span className="text-amber-400">*</span></span>
              <span className="text-[10px] text-emerald-400 font-normal">For Room ID SMS/Alerts</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="e.g. 9876543210 (10 digits)"
                required
                maxLength={10}
                className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Used for match updates, Room pass pings & payment verification.</p>
          </div>

          {/* 4. Referral Code (with NAWA3773 bonus chip) */}
          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>Referral Code (Optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setReferralCode('NAWA3773')}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold font-mono underline cursor-pointer"
              >
                Apply 'NAWA3773' (+₹10 Bonus)
              </button>
            </div>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code (e.g. NAWA3773)"
              maxLength={15}
              className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300 placeholder-slate-500 text-xs font-mono uppercase focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-emerald-400 mt-1 font-mono">
              🎁 Apply code <strong>NAWA3773</strong> to get ₹10 Welcome Bonus credited directly to your wallet!
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Profile...' : 'Enter Tournament Arena'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
