import React, { useState } from 'react';
import { Crosshair, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfileSetupModal: React.FC = () => {
  const { user, saveInitialProfile } = useAuth();
  const [ign, setIgn] = useState('');
  const [ffUid, setFfUid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedIgn = ign.trim();
    const trimmedUid = ffUid.trim();

    if (trimmedIgn.length < 3) {
      setError('Free Fire IGN must be at least 3 characters.');
      return;
    }

    if (!/^\d{6,15}$/.test(trimmedUid)) {
      setError('Free Fire UID must be a 6 to 15 digit number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveInitialProfile(trimmedIgn, trimmedUid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save gamer profile';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0f0f18] border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Complete Gamer Profile</h2>
            <p className="text-xs text-slate-400">Required for match room invites & prize payouts</p>
          </div>
        </div>

        <div className="mb-5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
          <span className="text-slate-400">Connected Account:</span>{' '}
          <span className="text-amber-400 font-medium font-mono">{user?.email}</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Free Fire In-Game Name (IGN) <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={ign}
              onChange={(e) => setIgn(e.target.value)}
              placeholder="e.g. ꧁༒RAISTAR༒꧂ or KillerKing"
              required
              maxLength={30}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1">Exact IGN shown in your Free Fire MAX profile.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Free Fire UID (Numeric) <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={ffUid}
              onChange={(e) => setFfUid(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1234567890"
              required
              maxLength={15}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1">Your 8-10 digit account UID from player profile.</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
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
