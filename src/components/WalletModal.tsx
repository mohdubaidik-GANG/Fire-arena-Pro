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
  ExternalLink,
  Coins,
  ChevronLeft,
  Receipt,
  Trophy
} from 'lucide-react';
import { collection, query, where, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { DepositRequest, WithdrawalRequest, AdminSettings } from '../types';
import { generateUpiUrl } from '../utils/qrCode';
import { QrCodeCanvas } from './QrCodeCanvas';
import { WalletAndCareerStats } from './WalletAndCareerStats';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'overview' | 'deposit' | 'withdraw' | 'history';
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'overview',
}) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>(initialTab);

  // Settings from Admin
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    upiId: '9005939633@ptyes',
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
  const [deliveryEmail, setDeliveryEmail] = useState<string>(user?.email || '');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  useEffect(() => {
    if (user?.email && !deliveryEmail) {
      setDeliveryEmail(user.email);
    }
  }, [user?.email]);

  // Sync initial tab when changed
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch admin settings
  useEffect(() => {
    if (!isOpen || !user) return;

    const unsubscribeSettings = onSnapshot(
      doc(db, 'settings', 'global'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AdminSettings;
          if (data.upiId) {
            try {
              data.upiId = decodeURIComponent(data.upiId).replace(/%40/gi, '@').trim();
            } catch {
              data.upiId = data.upiId.replace(/%40/gi, '@').trim();
            }
          }
          setAdminSettings(data);
        }
      },
      (error) => {
        console.warn('Using default admin settings:', error);
      }
    );

    return () => {
      unsubscribeSettings();
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentEffectiveDepositAmount = customAmount ? parseFloat(customAmount) || 0 : depositAmount;

  // Clean raw Payee VPA without %40 encoding
  const cleanPayeeVpa = (adminSettings.upiId || '9005939633@ptyes').replace(/%40/gi, '@').trim();

  // Generate dynamic UPI deep link with clean VPA and raw '@'
  const currentUpiUri = generateUpiUrl({
    pa: cleanPayeeVpa,
    pn: adminSettings.upiName || 'FireArena MAX Esports',
    am: currentEffectiveDepositAmount > 0 ? currentEffectiveDepositAmount : undefined,
    tn: 'AddCoins',
  });

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(cleanPayeeVpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
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
    const payoutMethod = withdrawMethod === 'redeem_code' ? 'REDEEM_CODE' : 'UPI';
    const cleanDeliveryEmail = deliveryEmail ? deliveryEmail.trim() : (user?.email || payoutEmail || '');

    if (withdrawMethod === 'upi' && !cleanUpi.includes('@')) {
      setWithdrawError('Please enter a valid UPI ID (e.g., yourname@okaxis or number@paytm)');
      return;
    }

    if (withdrawMethod === 'redeem_code' && (!cleanDeliveryEmail || !cleanDeliveryEmail.includes('@'))) {
      setWithdrawError('Please enter a valid email address for Google Play code delivery');
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
        method: withdrawMethod || 'upi',
        payoutMethod: payoutMethod,
        upiId: withdrawMethod === 'upi' ? cleanUpi : '',
        deliveryEmail: cleanDeliveryEmail,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#090a14] border border-red-950/80 rounded-2xl shadow-2xl relative my-auto overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-red-950/60 bg-[#0e0c18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-red-600/30">
              <Coins className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-heading">
                  EliteX24 Esports Wallet
                </h2>
                <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-600/30 text-[10px] font-mono font-bold uppercase">
                  Dual Wallet
                </span>
              </div>
              <p className="text-xs text-slate-400">Add Coins, Redeem Winnings & Transaction Records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Top Navigation Tabs */}
        <div className="flex items-center border-b border-red-950/60 bg-[#07070f] overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[130px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Wallet & Balance</span>
          </button>

          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 min-w-[130px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'deposit'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Add Coins (UPI)</span>
          </button>

          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 min-w-[130px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'withdraw'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Redeem Coins</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {activeTab === 'overview' && (
            <WalletAndCareerStats
              onOpenDeposit={() => setActiveTab('deposit')}
              onOpenWithdraw={() => setActiveTab('withdraw')}
            />
          )}

          {activeTab === 'deposit' && (
            /* =================== DEPOSIT FLOW =================== */
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer mb-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Wallet & Stats Overview</span>
              </button>

              {/* Instructions Banner */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Step 1:</strong> Scan the Admin UPI QR Code using Google Pay, PhonePe, Paytm or any UPI app.
                  <br />
                  <strong>Step 2:</strong> Enter the 12-digit UPI Reference / UTR Number from your payment slip below to credit your account.
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
                      className={`h-11 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer ${
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
                      className="w-full h-11 pl-7 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic QR Code & Direct UPI Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#141424] to-[#0c0c16] border border-amber-500/30 flex flex-col items-center text-center space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                  <QrCode className="w-4 h-4" />
                  <span>SCAN UPI QR TO PAY ₹{currentEffectiveDepositAmount}</span>
                </div>

                <div className="p-3 bg-white rounded-2xl shadow-xl shadow-amber-500/10">
                  <QrCodeCanvas value={currentUpiUri} size={180} />
                </div>

                {/* Direct UPI ID with Copy Button */}
                <div className="w-full max-w-sm space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-mono">Official Admin UPI ID:</span>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/60 border border-red-950/80">
                    <code className="text-xs font-mono font-bold text-white tracking-wide truncate">
                      {cleanPayeeVpa}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="ml-2 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Auto-generated UPI Intent Button */}
                <a
                  href={currentUpiUri}
                  onClick={(e) => {
                    // Direct intent invocation for mobile APK / WebView browsers
                    try {
                      window.location.href = currentUpiUri;
                    } catch (err) {
                      console.warn('UPI direct intent note:', err);
                    }
                  }}
                  className="w-full max-w-sm h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <Smartphone className="w-4 h-4 text-white" />
                  <span>Pay ₹{currentEffectiveDepositAmount} via UPI App</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                </a>
              </div>

              {/* Step 2 Form: Enter UTR Number */}
              <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    12-Digit UPI Reference / UTR Number <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/\s+/g, ''))}
                    placeholder="e.g. 402391823901 (from your payment slip)"
                    maxLength={16}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Every UPI transaction gives a 12-digit UTR/Ref No. Admin matches this to credit your deposit wallet.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Payment Screenshot (Optional but recommended)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer"
                  />
                  {screenshotData && (
                    <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
                      <Check className="w-3.5 h-3.5" />
                      <span>Receipt screenshot attached</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={depositSubmitting || currentEffectiveDepositAmount <= 0 || !utrNumber}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <ArrowDownCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {depositSubmitting
                      ? 'Submitting Proof...'
                      : `Submit Deposit Request for ₹${currentEffectiveDepositAmount}`}
                  </span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'withdraw' && (
            /* =================== WITHDRAWAL FLOW =================== */
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer mb-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Wallet & Stats Overview</span>
              </button>

              {/* Instructions */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Withdrawable Balance: ₹{profile?.winningsBalance ?? 0}</strong>
                  <p className="text-slate-400 mt-0.5">
                    Only Winnings Cash can be withdrawn. Minimum withdrawal is ₹{adminSettings.minWithdrawal || 50}. Payouts processed directly to your UPI ID or delivered as an official Google Play Redeem Code voucher!
                  </p>
                </div>
              </div>

              {withdrawSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{withdrawSuccessMsg}</span>
                </div>
              )}

              {withdrawError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
                {/* Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Select Payout Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('upi')}
                      className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                        withdrawMethod === 'upi'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Direct UPI Transfer</div>
                        <div className="text-[10px] text-slate-400">GPay, PhonePe, Paytm VPA</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWithdrawMethod('redeem_code')}
                      className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                        withdrawMethod === 'redeem_code'
                          ? 'bg-amber-500/10 border-amber-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Google Play Code</div>
                        <div className="text-[10px] text-slate-400">Instant Redeem Voucher</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Withdrawal Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      required
                      min={adminSettings.minWithdrawal || 50}
                      max={profile?.winningsBalance || 0}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full h-11 pl-8 pr-16 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Enter Email for Redeem Code Delivery <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={deliveryEmail}
                      onChange={(e) => setDeliveryEmail(e.target.value)}
                      placeholder="your-email@gmail.com"
                      required
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      The official Google Play Redeem Code voucher will be generated and delivered to this email address once approved by Admin.
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
