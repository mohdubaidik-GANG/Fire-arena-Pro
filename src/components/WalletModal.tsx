import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  ArrowDownCircle,
  ArrowUpRight,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Gift,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { DepositRequest, WithdrawalRequest, AdminSettings } from '../types';
import { generateUpiUrl } from '../utils/qrCode';
import { QrCodeCanvas } from './QrCodeCanvas';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'deposit' | 'withdraw';
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'deposit',
}) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(initialTab);

  // Settings from Admin
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    upiId: 'firearenapay@okaxis',
    upiName: 'FireArena MAX Esports',
    qrCodeUrl: '',
    supportWhatsapp: '919876543210',
    minDeposit: 20,
    minWithdrawal: 50,
    rules: 'Deposit is credited within 5-15 mins of UTR verification. Withdrawals processed 24/7.',
  });

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [proofNote, setProofNote] = useState<string>('');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [depositSubmitting, setDepositSubmitting] = useState<boolean>(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'redeem_code'>('upi');
  const [withdrawUpiId, setWithdrawUpiId] = useState<string>('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // User History State
  const [myDeposits, setMyDeposits] = useState<DepositRequest[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Sync initial tab when changed
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch admin settings & user history
  useEffect(() => {
    if (!isOpen || !user) return;

    // Listen to admin settings
    const unsubscribeSettings = onSnapshot(
      doc(db, 'settings', 'global'),
      (docSnap) => {
        if (docSnap.exists()) {
          setAdminSettings(docSnap.data() as AdminSettings);
        }
      },
      (error) => {
        console.warn('Using default admin settings:', error);
      }
    );

    // Fetch user's deposit requests
    const qDeposits = query(
      collection(db, 'depositRequests'),
      where('userId', '==', user.uid)
    );
    const unsubscribeDeposits = onSnapshot(
      qDeposits,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DepositRequest));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyDeposits(list);
      },
      (error) => {
        console.error('Error fetching deposits:', error);
      }
    );

    // Fetch user's withdrawal requests
    const qWithdrawals = query(
      collection(db, 'withdrawalRequests'),
      where('userId', '==', user.uid)
    );
    const unsubscribeWithdrawals = onSnapshot(
      qWithdrawals,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WithdrawalRequest));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyWithdrawals(list);
      },
      (error) => {
        console.error('Error fetching withdrawals:', error);
      }
    );

    return () => {
      unsubscribeSettings();
      unsubscribeDeposits();
      unsubscribeWithdrawals();
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentEffectiveDepositAmount = customAmount ? parseFloat(customAmount) || 0 : depositAmount;

  // Generate dynamic UPI deep link
  const currentUpiUri = generateUpiUrl({
    pa: adminSettings.upiId,
    pn: adminSettings.upiName,
    am: currentEffectiveDepositAmount > 0 ? currentEffectiveDepositAmount : undefined,
    tn: `Deposit by ${profile?.ign || user?.email || 'Player'}`,
  });

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(adminSettings.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyRedeemCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Handle Screenshot file upload
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Screenshot image size should be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Deposit Request
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccessMsg(null);

    const amount = currentEffectiveDepositAmount;
    if (amount < (adminSettings.minDeposit || 20)) {
      setDepositError(`Minimum deposit amount is ₹${adminSettings.minDeposit || 20}`);
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (cleanUtr.length < 6) {
      setDepositError('Please enter a valid 12-digit UPI Reference / UTR Number from your payment app.');
      return;
    }

    if (!user || !profile) {
      setDepositError('Please log in first.');
      return;
    }

    setDepositSubmitting(true);
    try {
      const newDeposit: Omit<DepositRequest, 'id'> = {
        userId: user.uid,
        userEmail: user.email || '',
        userIgn: profile.ign,
        amount,
        utrNumber: cleanUtr,
        proofUrl: screenshotData || proofNote || 'UPI direct receipt',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'depositRequests'), newDeposit);
      setDepositSuccessMsg(`Deposit request for ₹${amount} submitted! Status: Pending Admin Verification.`);
      setUtrNumber('');
      setScreenshotData('');
      setProofNote('');
      setCustomAmount('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit deposit request';
      setDepositError(msg);
      handleFirestoreError(err, OperationType.CREATE, 'depositRequests');
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Submit Withdrawal Request
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccessMsg(null);

    if (!user || !profile) {
      setWithdrawError('Please log in first.');
      return;
    }

    const amount = withdrawAmount;
    const minWith = adminSettings.minWithdrawal || 50;

    if (amount < minWith) {
      setWithdrawError(`Minimum withdrawal amount is ₹${minWith}`);
      return;
    }

    const currentWinnings = profile.winningsBalance || 0;
    if (amount > currentWinnings) {
      setWithdrawError(`Insufficient Winnings Cash. Your withdrawable balance is ₹${currentWinnings}`);
      return;
    }

    const payoutEmail = user?.email || '';
    const cleanUpi = (withdrawUpiId || '').trim();
    const payoutMethod = withdrawMethod || 'upi';
    const fallbackDeliveryEmail = user?.email || payoutEmail || '';

    if (payoutMethod === 'upi' && !cleanUpi.includes('@')) {
      setWithdrawError('Please enter a valid UPI ID (e.g., yourname@okaxis or number@paytm)');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      // 1. Create withdrawal request document with guaranteed non-undefined values
      const newWithdrawal: Record<string, any> = {
        userId: user.uid || '',
        userEmail: payoutEmail,
        userIgn: profile.ign || 'Gamer',
        amount: Number(amount) || 0,
        method: payoutMethod,
        upiId: payoutMethod === 'upi' ? cleanUpi : '',
        deliveryEmail: fallbackDeliveryEmail,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Ensure NO field in the object can ever be undefined
      Object.keys(newWithdrawal).forEach((key) => {
        if (newWithdrawal[key] === undefined) {
          newWithdrawal[key] = '';
        }
      });

      await addDoc(collection(db, 'withdrawalRequests'), newWithdrawal);

      // 2. Instantly deduct winnings balance so user cannot double-spend
      await updateDoc(doc(db, 'users', user.uid), {
        winningsBalance: Math.max(0, currentWinnings - amount),
        updatedAt: new Date().toISOString(),
      });

      // 3. Reset form and show clean green success toast
      setWithdrawSuccessMsg('Withdrawal request submitted for Admin approval!');
      setWithdrawUpiId('');
      setWithdrawAmount(adminSettings.minWithdrawal || 50);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request withdrawal';
      setWithdrawError(msg);
      handleFirestoreError(err, OperationType.CREATE, 'withdrawalRequests');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl bg-[#0c0c14] border border-amber-500/20 rounded-2xl shadow-2xl relative my-auto overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0f0f1c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading">Dual Cash Wallet</h2>
              <p className="text-xs text-slate-400">Deposit & Winnings Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Wallet Visual Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-[#090910] border-b border-slate-800/80">
          {/* Card 1: Deposit Cash */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Deposit Balance
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Entry Fees</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-white tabular-nums">
              ₹{profile?.depositBalance ?? 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Non-withdrawable · Used to join tournaments</p>
          </div>

          {/* Card 2: Winnings Cash */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Winnings Balance
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">100% Payout</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
              ₹{profile?.winningsBalance ?? 0}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Earned from Kills & Booyah · 100% Withdrawable</p>
          </div>
        </div>

        {/* Action Tabs: Add Cash vs Withdraw */}
        <div className="flex border-b border-slate-800 bg-[#0d0d18]">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'deposit'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Add Cash / Deposit</span>
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'withdraw'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw Winnings</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 max-h-[62vh] overflow-y-auto space-y-6">
          {activeTab === 'deposit' ? (
            /* =================== DEPOSIT FLOW =================== */
            <div className="space-y-6">
              {/* Instructions Banner */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Step 1:</strong> Select amount & scan Admin UPI QR code or pay to UPI ID.
                  <br />
                  <strong>Step 2:</strong> Enter the 12-digit UPI Reference / UTR Number below to claim your deposit.
                </span>
              </div>

              {depositSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{depositSuccessMsg}</span>
                </div>
              )}

              {depositError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{depositError}</span>
                </div>
              )}

              {/* Amount Selection Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Deposit Amount
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[20, 50, 100, 200].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setDepositAmount(amt);
                        setCustomAmount('');
                      }}
                      className={`h-10 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer ${
                        depositAmount === amt && !customAmount
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="Or enter custom amount (e.g. 150)"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full h-10 pl-7 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {customAmount && (
                    <span className="text-xs text-amber-400 font-mono font-semibold">
                      Total: ₹{currentEffectiveDepositAmount}
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic QR & UPI ID Box */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                <div className="shrink-0 flex flex-col items-center">
                  <QrCodeCanvas value={currentUpiUri} size={150} />
                  <span className="text-[10px] text-slate-400 mt-1 font-mono">Scan via GPay / PhonePe / Paytm</span>
                </div>

                <div className="flex-1 w-full space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Admin Official UPI ID</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-slate-800 text-amber-400 font-mono text-xs select-all break-all">
                        {adminSettings.upiId}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Payee Name</span>
                    <p className="text-xs font-semibold text-slate-200">{adminSettings.upiName}</p>
                  </div>

                  <a
                    href={currentUpiUri}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium pt-1"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Pay directly via UPI App (Mobile)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Deposit Verification Form */}
              <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  Submit Payment Verification
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    12-Digit UPI Ref / UTR Number <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/\s+/g, ''))}
                    placeholder="e.g. 430129482910"
                    required
                    minLength={6}
                    maxLength={30}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Found in your payment receipt under "UPI Ref ID" or "UTR".</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Screenshot (Optional, speeds up approval)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                  />
                  {screenshotData && (
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Screenshot attached
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={depositSubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>{depositSubmitting ? 'Submitting Verification...' : `Submit Deposit Proof (₹${currentEffectiveDepositAmount})`}</span>
                </button>
              </form>

              {/* Deposit History */}
              {myDeposits.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Recent Deposit Requests
                  </h4>
                  <div className="space-y-2">
                    {myDeposits.slice(0, 4).map((dep) => (
                      <div
                        key={dep.id}
                        className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-white">₹{dep.amount}</span>
                            <span className="text-[10px] text-slate-500 font-mono">UTR: {dep.utrNumber}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(dep.createdAt).toLocaleDateString()} at {new Date(dep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div>
                          {dep.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px]">
                              <Clock className="w-3 h-3" /> Pending Admin
                            </span>
                          )}
                          {dep.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Approved (+₹{dep.amount})
                            </span>
                          )}
                          {dep.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono text-[10px]">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* =================== WITHDRAWAL FLOW =================== */
            <div className="space-y-6">
              {/* Instructions */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Withdraw your hard-earned tournament prize money.
                  <br />
                  <strong>Option A:</strong> Direct instant UPI transfer to your VPA.
                  <br />
                  <strong>Option B:</strong> Google Play Redeem Code delivered instantly to your profile and email.
                </span>
              </div>

              {withdrawSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5 shadow-lg shadow-emerald-950/40">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-sm">{withdrawSuccessMsg}</span>
                </div>
              )}

              {withdrawError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {/* Available Winnings Indicator */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Withdrawable Balance</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    ₹{profile?.winningsBalance ?? 0}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Min Withdrawal</span>
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    ₹{adminSettings.minWithdrawal || 50}
                  </span>
                </div>
              </div>

              <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
                {/* Withdrawal Method Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Choose Payout Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('upi')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        withdrawMethod === 'upi'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Smartphone className={`w-5 h-5 mt-0.5 ${withdrawMethod === 'upi' ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="text-xs font-bold text-white">Direct UPI Transfer</div>
                        <div className="text-[10px] text-slate-400">Bank account via VPA</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('redeem_code')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        withdrawMethod === 'redeem_code'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Gift className={`w-5 h-5 mt-0.5 ${withdrawMethod === 'redeem_code' ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="text-xs font-bold text-white">Play Redeem Code</div>
                        <div className="text-[10px] text-slate-400">Google Play Diamonds</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Amount to Withdraw */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Withdrawal Amount (₹) <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      min={adminSettings.minWithdrawal || 50}
                      max={profile?.winningsBalance || 0}
                      required
                      className="w-full h-11 pl-7 pr-20 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(profile?.winningsBalance || 0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Conditional Inputs */}
                {withdrawMethod === 'upi' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Your UPI ID (VPA) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={withdrawUpiId}
                      onChange={(e) => setWithdrawUpiId(e.target.value)}
                      placeholder="e.g. 9876543210@paytm or gamer@okhdfcbank"
                      required
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ensure your UPI ID is correct. Admin will disburse payout directly to this handle.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-1">
                    <span className="text-slate-400 block">Redeem Code Delivery Email:</span>
                    <span className="text-amber-400 font-mono font-semibold">{user?.email}</span>
                    <p className="text-[11px] text-slate-500">
                      The official Google Play Redeem Code voucher will be generated and displayed in your profile history as well as sent to this address.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={withdrawSubmitting || (profile?.winningsBalance || 0) < (adminSettings.minWithdrawal || 50)}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>
                    {withdrawSubmitting
                      ? 'Processing Request...'
                      : `Request Payout of ₹${withdrawAmount}`}
                  </span>
                </button>
              </form>

              {/* Withdrawal History & Redeem Codes */}
              {myWithdrawals.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Recent Withdrawals & Redeem Codes
                  </h4>
                  <div className="space-y-2.5">
                    {myWithdrawals.map((w) => (
                      <div
                        key={w.id}
                        className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-emerald-400 text-sm">₹{w.amount}</span>
                            <span className="text-[11px] text-slate-400 uppercase font-mono">
                              via {w.method === 'upi' ? 'UPI' : 'Play Code'}
                            </span>
                          </div>

                          <div>
                            {w.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px]">
                                <Clock className="w-3 h-3" /> Processing Payout
                              </span>
                            )}
                            {w.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                                <CheckCircle2 className="w-3 h-3" /> Paid & Completed
                              </span>
                            )}
                            {w.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono text-[10px]">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </div>
                        </div>

                        {/* If Google Play Redeem Code was issued */}
                        {w.redeemCode && (
                          <div className="p-2.5 bg-black/60 border border-amber-500/40 rounded-lg flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-amber-400 font-semibold block uppercase">Google Play Redeem Code</span>
                              <code className="text-sm font-mono font-bold text-white select-all">
                                {w.redeemCode}
                              </code>
                            </div>
                            <button
                              onClick={() => handleCopyRedeemCode(w.redeemCode!, w.id)}
                              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedCodeId === w.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedCodeId === w.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}

                        {/* If UPI payout UTR exists */}
                        {w.payoutUtr && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            Bank Payout UTR: <span className="text-white font-semibold">{w.payoutUtr}</span>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-500 flex items-center justify-between">
                          <span>Requested on {new Date(w.createdAt).toLocaleDateString()}</span>
                          {w.adminNote && <span className="text-amber-400/80">Note: {w.adminNote}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
