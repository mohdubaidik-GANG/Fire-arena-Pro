import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UnauthorizedScreenProps {
  onLogout?: () => void;
  onBackToArena?: () => void;
}

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({ onLogout, onBackToArena }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#07070b]">
      <div className="w-full max-w-md bg-[#0f0f18] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto mb-5 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold block mb-1">
          Security Access Control
        </span>

        <h1 className="text-2xl font-bold text-white font-heading mb-3">
          Unauthorized Access Denied
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          The Admin Command Center is strictly restricted to whitelisted administrators. Your current authenticated email{' '}
          <strong className="text-amber-400 font-mono">{user?.email || 'Unknown'}</strong> is not authorized to view this portal.
        </p>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono mb-6">
          Required Super Admin: <span className="text-slate-200">ubedmo650@gmail.com</span>
        </div>

        <div className="space-y-3">
          <button
            onClick={onBackToArena ? onBackToArena : () => window.location.href = '/'}
            className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Player Arena</span>
          </button>

          <button
            onClick={onLogout || logout}
            className="w-full h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
