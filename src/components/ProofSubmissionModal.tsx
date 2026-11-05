import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, Image as ImageIcon, Crosshair, Award } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Tournament, MatchProof } from '../types';
import { sound } from '../utils/audio';

interface ProofSubmissionModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProofSubmissionModal: React.FC<ProofSubmissionModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [kills, setKills] = useState<number>(0);
  const [rank, setRank] = useState<number>(1);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !tournament || !user || !profile) return null;

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Screenshot size must be under 2MB for fast upload');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotUrl(reader.result as string);
      sound.playClick();
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotUrl) {
      setError('Please provide a screenshot proof or upload your match scorecard image.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const proofId = `proof_${tournament.id}_${user.uid}_${Date.now()}`;
      const proofData: MatchProof = {
        id: proofId,
        tournamentId: tournament.id,
        matchTitle: tournament.title,
        userId: user.uid,
        userIgn: profile.ign,
        freeFireUid: profile.freeFireUid,
        kills: Number(kills) || 0,
        rank: Number(rank) || 1,
        screenshotUrl,
        notes: notes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'matchProofs', proofId), proofData);

      sound.playSuccess();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 1600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit proof';
      setError(msg);
      handleFirestoreError(err, OperationType.WRITE, 'matchProofs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0b0c14] border border-red-900/60 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-red-950/60 bg-[#100d18]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">Submit Match Proof</h2>
              <p className="text-xs text-slate-400">Winning Scorecard & Kills Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {success ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white font-heading">Proof Submitted Successfully!</h3>
              <p className="text-xs text-slate-400">
                Fire Arena Pro admin will verify your screenshot and credit your coin prizes instantly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Match Details Banner */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-red-950/50 space-y-1">
                <h4 className="text-xs font-bold text-white truncate font-heading">{tournament.title}</h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Player: <strong className="text-amber-400">{profile.ign}</strong></span>
                  <span>UID: <strong className="text-slate-200">{profile.freeFireUid}</strong></span>
                </div>
              </div>

              {/* Kills & Rank Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-red-400" />
                    <span>Total Kills</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={kills}
                    onChange={(e) => setKills(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-10 px-3 rounded-xl bg-black/60 border border-slate-800 focus:border-red-500 focus:outline-none text-white font-mono text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Finish Rank</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={tournament.maxSlots || 48}
                    value={rank}
                    onChange={(e) => setRank(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 px-3 rounded-xl bg-black/60 border border-slate-800 focus:border-red-500 focus:outline-none text-white font-mono text-sm"
                    required
                  />
                </div>
              </div>

              {/* Upload Scorecard Screenshot */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scorecard / Booyah Screenshot</span>
                </label>

                <div className="border-2 border-dashed border-red-900/50 hover:border-red-500/50 rounded-xl p-4 text-center bg-black/40 transition-colors">
                  {screenshotUrl ? (
                    <div className="space-y-2">
                      <img
                        src={screenshotUrl}
                        alt="Screenshot Preview"
                        className="max-h-36 mx-auto rounded-lg object-contain border border-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => setScreenshotUrl('')}
                        className="text-[11px] text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        Remove & choose another image
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block space-y-2">
                      <UploadCloud className="w-8 h-8 text-slate-500 mx-auto" />
                      <div>
                        <span className="text-xs font-bold text-red-400 hover:underline">Tap to select screenshot</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG or WebP (Max 2MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFile}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">Or enter Direct Image URL:</span>
                  <input
                    type="url"
                    placeholder="https://i.imgur.com/example.png"
                    value={screenshotUrl.startsWith('data:') ? '' : screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-black/50 border border-slate-800 focus:border-red-500 text-xs text-white placeholder-slate-600 font-mono"
                  />
                </div>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Booyah with AWM squad wipe"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-black/50 border border-slate-800 focus:border-red-500 text-xs text-white placeholder-slate-600"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !screenshotUrl}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isSubmitting ? 'Uploading Proof...' : 'Submit Scorecard Proof'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
