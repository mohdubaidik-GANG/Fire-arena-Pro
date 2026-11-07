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
  Trophy,
  ShieldCheck,
  Lock,
  Zap,
  CreditCard,
  RefreshCw,
  Filter,
  TrendingUp,
  TrendingDown,
  Search,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { collection, query, where, addDoc, updateDoc, doc, onSnapshot, getDocs, orderBy, limit, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';
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
    upiName: 'Fire Arena Pro',
    qrCodeUrl: '',
    supportWhatsapp: 'https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC',
    minDeposit: 20,
    minWithdrawal: 50,
    rules: 'Deposit is credited within 5-15 mins of UTR verification. Withdrawals processed 24/7.',
  });

  // Deposit Form State (Flexible ₹20 to ₹10,000)
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('50');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [proofNote, setProofNote] = useState<string>('');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [depositSubmitting, setDepositSubmitting] = useState<boolean>(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Passbook & Transaction History State
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'MATCH_FEE' | 'PRIZE'>('ALL');
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(50);
  const [withdrawMethod, setWithdrawMethod] = useState<'phonepe' | 'gpay' | 'paytm' | 'upi' | 'redeem_code'>('phonepe');
  const [withdrawUpiId, setWithdrawUpiId] = useState<string>('');
  const [withdrawPhone, setWithdrawPhone] = useState<string>(profile?.phone || '');
  const [deliveryEmail, setDeliveryEmail] = useState<string>(user?.email || '');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawalReceipt, setWithdrawalReceipt] = useState<{
    transactionId: string;
    amount: number;
    method: string;
    upiId: string;
    phone: string;
    createdAt: string;
    estimatedTime: string;
  } | null>(null);
  const [receiptCopied, setReceiptCopied] = useState<boolean>(false);

  useEffect(() => {
    if (profile?.phone && !withdrawPhone) {
      setWithdrawPhone(profile.phone);
    }
  }, [profile?.phone]);


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

  // Load Passbook Transaction History (Deposits, Withdrawals, Match Fees, Prizes Won)
  useEffect(() => {
    if (!isOpen || !user) return;
    setLoadingHistory(true);

    const userTxnRef = collection(db, 'users', user.uid, 'transactions');
    const unsubTxns = onSnapshot(
      query(userTxnRef, limit(50)),
      (snapshot) => {
        const txns: any[] = [];
        snapshot.forEach((docSnap) => {
          txns.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Also fetch user's withdrawal requests to merge into passbook
        const withQuery = query(collection(db, 'withdrawalRequests'), where('userId', '==', user.uid), limit(25));
        getDocs(withQuery)
          .then((withSnap) => {
            withSnap.forEach((wDoc) => {
              const wData = wDoc.data();
              // Check if already in list
              if (!txns.some((t) => t.id === wDoc.id || t.orderId === wDoc.id)) {
                txns.push({
                  id: wDoc.id,
                  type: 'WITHDRAWAL',
                  amount: wData.amount,
                  status: (wData.status || 'PENDING').toUpperCase(),
                  method: wData.method || 'UPI',
                  createdAt: wData.createdAt || new Date().toISOString(),
                  orderId: wDoc.id,
                  note: wData.payoutMethod || 'Withdrawal Payout'
                });
              }
            });

            // Sort descending by date
            txns.sort((a, b) => {
              const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
              const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
              return timeB - timeA;
            });

            setTransactionsList(txns);
            setLoadingHistory(false);
          })
          .catch(() => {
            setTransactionsList(txns);
            setLoadingHistory(false);
          });
      },
      (err) => {
        console.warn('Passbook listener note:', err);
        setLoadingHistory(false);
      }
    );

    return () => {
      unsubTxns();
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentEffectiveDepositAmount = customAmount ? parseFloat(customAmount) || 0 : depositAmount;

  // Clean raw Payee VPA without %40 encoding
  const cleanPayeeVpa = (adminSettings.upiId || '9005939633@ptyes').replace(/%40/gi, '@').trim();

  // Generate dynamic UPI deep link with clean VPA and raw '@'
  const currentUpiUri = generateUpiUrl({
    pa: cleanPayeeVpa,
    pn: adminSettings.upiName || 'Fire Arena Pro',
    am: currentEffectiveDepositAmount > 0 ? currentEffectiveDepositAmount : undefined,
    tn: 'AddCoins',
  });

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(cleanPayeeVpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Handle screenshot upload as base64 DataURL
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setDepositError('Screenshot file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotData(reader.result as string);
      setDepositError(null);
    };
    reader.onerror = () => {
      setDepositError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  // Submit Payment Proof to Firestore depositRequests
  const handleDepositSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (depositSubmitting) return;

    setDepositError(null);
    setDepositSuccessMsg(null);

    const amount = Number(currentEffectiveDepositAmount);
    if (!amount || isNaN(amount) || amount < 20 || amount > 10000) {
      setDepositError('Amount must be between ₹20 and ₹10,000.');
      return;
    }

    if (!user) {
      setDepositError('Please log in first to submit deposit proof.');
      return;
    }

    const trimmedUtr = utrNumber.trim();
    if (!trimmedUtr) {
      setDepositError('Please enter the 12-digit UTR / UPI Transaction Reference Number.');
      return;
    }

    if (trimmedUtr.length < 6) {
      setDepositError('Please enter a valid UTR / Transaction ID (minimum 6 digits).');
      return;
    }

    setDepositSubmitting(true);

    try {
      // 1. Save to Firestore depositRequests collection
      await addDoc(collection(db, 'depositRequests'), {
        userId: user.uid,
        userEmail: user.email || '',
        userIgn: profile?.ign || (user as any).displayName || 'Player',
        userFfUid: profile?.freeFireUid || '',
        amount: Number(amount),
        utrNumber: trimmedUtr,
        screenshotUrl: screenshotData || '',
        proofUrl: screenshotData || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      });

      // 2. Add to user's transactions passbook
      const txnId = `DEP_${Date.now()}`;
      await setDoc(doc(db, 'users', user.uid, 'transactions', txnId), {
        type: 'DEPOSIT',
        amount: Number(amount),
        orderId: trimmedUtr,
        status: 'PENDING',
        note: `Direct UPI Deposit (UTR: ${trimmedUtr})`,
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        console.warn('Passbook log note:', err);
      });

      // 3. Play sound & celebration
      sound.playCoin();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      // 4. Reset form & notify user
      setUtrNumber('');
      setScreenshotData('');
      setDepositSuccessMsg('Deposit request submitted! Admin will verify and credit balance within 10 minutes.');
    } catch (err: unknown) {
      console.error('Failed to submit deposit request:', err);
      const msg = err instanceof Error ? err.message : 'Failed to submit payment proof. Please try again.';
      setDepositError(msg);
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

    const availableWinnings = Number(profile.winningsBalance ?? (profile as any)?.winning_balance ?? 0);
    if (amount > availableWinnings) {
      setWithdrawError(`Insufficient Winning Balance. Your withdrawable balance is ₹${availableWinnings}`);
      return;
    }

    const payoutEmail = user?.email || '';
    const cleanUpi = (withdrawUpiId || '').trim();
    const cleanPhone = (withdrawPhone || profile.phone || '').trim();
    const cleanDeliveryEmail = deliveryEmail ? deliveryEmail.trim() : (user?.email || payoutEmail || '');

    if (withdrawMethod !== 'redeem_code' && (!cleanUpi || !cleanUpi.includes('@'))) {
      setWithdrawError('Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)');
      return;
    }

    if (withdrawMethod !== 'redeem_code' && cleanPhone.replace(/\D/g, '').length < 10) {
      setWithdrawError('Please enter a valid 10-digit mobile number to confirm your payout.');
      return;
    }

    if (withdrawMethod === 'redeem_code' && (!cleanDeliveryEmail || !cleanDeliveryEmail.includes('@'))) {
      setWithdrawError('Please enter a valid email address for Google Play code delivery');
      return;
    }

    setWithdrawSubmitting(true);
    const withdrawalDocId = `WTH_${Date.now()}_${user.uid.slice(0, 6)}`;
    const payoutMethodLabel = withdrawMethod === 'phonepe'
      ? 'PHONEPE_UPI'
      : withdrawMethod === 'gpay'
      ? 'GPAY_UPI'
      : withdrawMethod === 'paytm'
      ? 'PAYTM_UPI'
      : withdrawMethod === 'redeem_code'
      ? 'GOOGLE_PLAY_REDEEM_CODE'
      : 'DIRECT_UPI';

    const newWithdrawalRecord = {
      id: withdrawalDocId,
      orderId: withdrawalDocId,
      userId: user.uid,
      userEmail: payoutEmail,
      userIgn: profile.ign || 'Gamer',
      userPhone: cleanPhone,
      amount: Number(amount),
      method: withdrawMethod,
      payoutMethod: payoutMethodLabel,
      upiId: withdrawMethod !== 'redeem_code' ? cleanUpi : '',
      deliveryEmail: cleanDeliveryEmail,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const withdrawalDocRef = doc(db, 'withdrawalRequests', withdrawalDocId);
      const userTxnRef = doc(db, 'users', user.uid, 'transactions', withdrawalDocId);

      // Execute atomic Firestore transaction to prevent double spending
      await runTransaction(db, async (transaction) => {
        const userDocSnap = await transaction.get(userDocRef);
        if (!userDocSnap.exists()) {
          throw new Error('User profile record not found.');
        }

        const currentData = userDocSnap.data();
        const currentWinnings = Number(currentData.winningsBalance ?? currentData.winning_balance ?? 0);

        if (currentWinnings < amount) {
          throw new Error(`Insufficient Winning Balance. You have ₹${currentWinnings}`);
        }

        const remaining = Math.max(0, currentWinnings - amount);

        // Deduct from both winningsBalance and winning_balance atomically
        transaction.update(userDocRef, {
          winningsBalance: remaining,
          winning_balance: remaining,
          updatedAt: new Date().toISOString(),
        });

        // Set withdrawal request doc
        transaction.set(withdrawalDocRef, newWithdrawalRecord);

        // Record in user's passbook transactions
        transaction.set(userTxnRef, {
          id: withdrawalDocId,
          orderId: withdrawalDocId,
          userId: user.uid,
          amount: Number(amount),
          type: 'WITHDRAWAL',
          status: 'PENDING',
          method: payoutMethodLabel,
          upiId: cleanUpi || cleanDeliveryEmail,
          phone: cleanPhone,
          note: `Payout via ${payoutMethodLabel}`,
          createdAt: new Date().toISOString(),
        });
      });

      // Sound & confetti celebrate
      try {
        sound.playCoin();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      // Open Popup Receipt Modal
      setWithdrawalReceipt({
        transactionId: withdrawalDocId,
        amount: Number(amount),
        method: payoutMethodLabel.replace(/_/g, ' '),
        upiId: cleanUpi || cleanDeliveryEmail,
        phone: cleanPhone,
        createdAt: new Date().toISOString(),
        estimatedTime: '5-15 Minutes',
      });

      setWithdrawSuccessMsg(`Withdrawal of ₹${amount} submitted! Processing in 5-15 mins.`);
      setWithdrawUpiId('');
      setWithdrawAmount(adminSettings.minWithdrawal || 50);
    } catch (err: unknown) {
      console.error('Withdrawal transaction error:', err);
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
                  Fire Arena Pro Esports Wallet
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
            className={`flex-1 min-w-[120px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
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
            className={`flex-1 min-w-[120px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
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
            className={`flex-1 min-w-[120px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'withdraw'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Redeem Coins</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 min-w-[120px] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Passbook / History</span>
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

              {/* Direct UPI QR Deposit Header & Trust Banner */}
              <div className="p-3.5 bg-gradient-to-r from-red-950/40 via-amber-950/20 to-black border border-red-500/30 rounded-2xl text-xs flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="text-white font-heading font-black tracking-wide">DIRECT UPI QR DEPOSIT</strong>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                      0% FEE • INSTANT
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Scan the QR code or pay to the official Admin UPI ID below using any UPI app. Enter your 12-digit UTR reference number and upload payment proof to get instant credit.
                  </p>
                </div>
              </div>

              {depositSuccessMsg && (
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl text-xs text-emerald-200 flex items-start gap-3 shadow-lg shadow-emerald-950/50 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-white block mb-0.5">Payment Proof Submitted!</strong>
                    <span>{depositSuccessMsg}</span>
                  </div>
                </div>
              )}

              {depositError && (
                <div className="p-3.5 bg-red-950/60 border border-red-500/60 rounded-2xl text-xs text-red-200 flex items-center gap-2.5 shadow-lg shadow-red-950/50">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{depositError}</span>
                </div>
              )}

              {/* QR Code & Admin UPI ID Display Container */}
              <div className="p-5 rounded-3xl bg-gradient-to-b from-[#141226] via-[#0c0d18] to-[#070810] border border-red-950/80 shadow-2xl space-y-5">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  {/* Clean QR Code Container */}
                  <div className="flex flex-col items-center">
                    <div className="p-3.5 rounded-2xl bg-white shadow-2xl shadow-red-950/60 border-2 border-red-500/40 relative">
                      <QrCodeCanvas
                        value={currentUpiUri}
                        size={168}
                      />
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-mono font-black tracking-wider shadow">
                        SCAN TO PAY
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-3.5">
                      Payee: <strong className="text-white">{adminSettings.upiName || 'Fire Arena Pro'}</strong>
                    </span>
                  </div>

                  {/* Admin UPI Details & Copy Button */}
                  <div className="flex-1 w-full space-y-3.5 text-center sm:text-left">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-1">
                        Official Admin UPI ID:
                      </span>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/80 border border-red-950/80">
                        <span className="flex-1 font-mono font-bold text-amber-400 text-xs sm:text-sm truncate select-all px-1">
                          {cleanPayeeVpa}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            copiedUpi
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                              : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/50'
                          }`}
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy UPI ID</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Accepted Payment Badges */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-1.5">
                        Accepted UPI Apps:
                      </span>
                      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                          Google Pay
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                          PhonePe
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                          Paytm
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          BHIM UPI
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deposit Form Section */}
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                {/* 1. Amount Input & Quick Select Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Amount to Add (₹)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Min ₹20 • Max ₹10,000</span>
                  </div>
                  <div className="relative mb-2.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400 font-mono font-bold text-base">₹</span>
                    <input
                      type="number"
                      placeholder="Enter amount to deposit"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setDepositError(null);
                      }}
                      min={20}
                      max={10000}
                      required
                      className="w-full h-12 pl-8 pr-4 rounded-xl bg-[#06070a] border border-red-950/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-red-500 shadow-inner"
                    />
                  </div>

                  {/* Fast Deposit Chips */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '₹20', value: 20 },
                      { label: '₹50', value: 50 },
                      { label: '₹100', value: 100 },
                      { label: '₹200', value: 200 },
                      { label: '₹500', value: 500 },
                      { label: '₹1,000', value: 1000 },
                      { label: '₹2,000', value: 2000 },
                      { label: '₹5,000', value: 5000 },
                    ].map((chip) => {
                      const isSelected = currentEffectiveDepositAmount === chip.value;
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => {
                            setCustomAmount(chip.value.toString());
                            setDepositAmount(chip.value);
                            setDepositError(null);
                          }}
                          className={`py-2 px-1 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer border flex items-center justify-center ${
                            isSelected
                              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-500 shadow-md shadow-red-950/60 scale-102'
                              : 'bg-[#06070a] border-red-950/70 text-slate-300 hover:border-red-800 hover:text-white'
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 12-Digit UTR / Transaction ID (Required) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>12-Digit UTR / Transaction ID</span>
                      <span className="text-red-400 font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">Required for verification</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 412384918234 or UPI Ref No."
                    value={utrNumber}
                    onChange={(e) => {
                      setUtrNumber(e.target.value);
                      setDepositError(null);
                    }}
                    required
                    maxLength={32}
                    className="w-full h-12 px-4 rounded-xl bg-[#06070a] border border-red-950/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-red-500 shadow-inner"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Found in your UPI app transaction details (Google Pay, PhonePe, Paytm, BHIM) as "UPI Ref ID" or "UTR".
                  </p>
                </div>

                {/* 3. Screenshot Upload (Payment Proof) */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Upload Payment Screenshot (Proof)
                  </label>

                  {screenshotData ? (
                    <div className="p-3 rounded-2xl bg-black/60 border border-emerald-500/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={screenshotData}
                          alt="Uploaded payment proof"
                          className="w-14 h-14 rounded-lg object-cover border border-emerald-500/50 bg-black"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">Screenshot Attached</span>
                          <span className="text-[10px] text-emerald-400 font-mono">Ready to submit with proof</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScreenshotData('')}
                        className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800 text-xs font-semibold cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-red-950/80 hover:border-red-500/60 bg-[#06070a] cursor-pointer transition-colors group">
                      <Upload className="w-6 h-6 text-slate-500 group-hover:text-red-400 mb-1 transition-colors" />
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                        Click to select payment screenshot
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, or WEBP (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={depositSubmitting || currentEffectiveDepositAmount < 20 || !utrNumber.trim()}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-950/80 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 border border-red-500/40 mt-2"
                >
                  <Lock className="w-4 h-4 text-white" />
                  <span>
                    {depositSubmitting
                      ? 'Submitting Proof...'
                      : `Submit Payment Proof (₹${currentEffectiveDepositAmount})`}
                  </span>
                </button>
              </form>

              {/* Security & Verification Notice */}
              <div className="p-3.5 rounded-xl bg-[#090b14] border border-red-950/60 text-center text-[11px] text-slate-400 space-y-1">
                <p>
                  ⚡ Admin verifies deposits quickly. Coins will be credited to your wallet within <strong>5–10 minutes</strong>.
                </p>
                <p className="text-[10px] text-slate-500">
                  For payment assistance, contact Admin via WhatsApp Support in settings.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'withdraw' && (
            /* =================== WITHDRAWAL FLOW =================== */
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer mb-0.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Wallet & Career Stats</span>
              </button>

              {/* Glowing Available Winnings Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/40 via-[#0a0f18] to-[#070810] border border-emerald-500/40 text-center relative overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span>Available Winning Balance</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase">
                    Min Withdrawal: ₹{adminSettings.minWithdrawal || 50}
                  </span>
                </div>

                <div className="py-2">
                  <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                    ₹{profile?.winningsBalance ?? (profile as any)?.winning_balance ?? 0}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    100% withdrawable pure earnings from tournament rank prizes & kill bounties.
                  </p>
                </div>

                {/* 0% TDS & Fee Notice Badge */}
                <div className="mt-3 pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-emerald-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>0% TDS / Zero Withdrawal Fee</span>
                  </span>
                  <span className="hidden sm:inline text-emerald-600">•</span>
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    <span>Disbursal in 5-15 Mins</span>
                  </span>
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

              <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                {/* Method Selector Tabs: PhonePe | Google Pay | Paytm | Direct UPI */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Select Payout Gateway</span>
                    <span className="text-[10px] text-emerald-400 font-mono">100% Verified UPI</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'phonepe', label: 'PhonePe', sub: '@ybl / @ibl', color: 'from-purple-600 to-indigo-700', badge: 'POPULAR' },
                      { id: 'gpay', label: 'Google Pay', sub: '@okhdfcbank', color: 'from-blue-600 to-cyan-600', badge: 'INSTANT' },
                      { id: 'paytm', label: 'Paytm UPI', sub: '@paytm', color: 'from-sky-600 to-blue-700', badge: 'FAST' },
                      { id: 'upi', label: 'Direct UPI', sub: 'Any Bank VPA', color: 'from-emerald-600 to-teal-700', badge: 'ALL APPS' },
                    ].map((m) => {
                      const isSelected = withdrawMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setWithdrawMethod(m.id as any)}
                          className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer text-left relative ${
                            isSelected
                              ? 'bg-gradient-to-b from-emerald-950/60 to-black border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                              : 'bg-[#090b14] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold font-heading">{m.label}</span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {m.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{m.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount with Quick Withdraw All Button */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Withdrawal Amount (₹)
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Available: ₹{profile?.winningsBalance ?? (profile as any)?.winning_balance ?? 0}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-base font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={adminSettings.minWithdrawal || 50}
                      max={profile?.winningsBalance ?? (profile as any)?.winning_balance ?? 0}
                      value={withdrawAmount || ''}
                      onChange={(e) => setWithdrawAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder={`Min ₹${adminSettings.minWithdrawal || 50}`}
                      className="w-full h-12 pl-8 pr-24 rounded-xl bg-[#06070a] border border-red-950/80 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const maxAmt = profile?.winningsBalance ?? (profile as any)?.winning_balance ?? 0;
                        setWithdrawAmount(maxAmt);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <span>Withdraw All</span>
                    </button>
                  </div>
                </div>

                {/* UPI ID Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {withdrawMethod === 'phonepe'
                      ? 'Enter PhonePe UPI ID'
                      : withdrawMethod === 'gpay'
                      ? 'Enter Google Pay UPI ID'
                      : withdrawMethod === 'paytm'
                      ? 'Enter Paytm UPI ID'
                      : 'Enter UPI ID (VPA)'}{' '}
                    <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={withdrawUpiId}
                    onChange={(e) => setWithdrawUpiId(e.target.value)}
                    placeholder={
                      withdrawMethod === 'phonepe'
                        ? 'e.g. 9876543210@ybl or yourname@ibl'
                        : withdrawMethod === 'gpay'
                        ? 'e.g. yourname@okhdfcbank or yourname@okaxis'
                        : withdrawMethod === 'paytm'
                        ? 'e.g. 9876543210@paytm'
                        : 'e.g. yourhandle@bankname'
                    }
                    required
                    className="w-full h-12 px-3.5 rounded-xl bg-[#06070a] border border-red-950/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Admin dispatches payout directly to this verified UPI address.
                  </p>
                </div>

                {/* Confirm Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm 10-Digit Mobile Number <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full h-12 px-3.5 rounded-xl bg-[#06070a] border border-red-950/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Used for automated transaction SMS confirmation and instant WhatsApp support.
                  </p>
                </div>

                {/* Submit Payout Request Button */}
                <button
                  type="submit"
                  disabled={
                    withdrawSubmitting ||
                    (profile?.winningsBalance ?? (profile as any)?.winning_balance ?? 0) <
                      (adminSettings.minWithdrawal || 50) ||
                    withdrawAmount < (adminSettings.minWithdrawal || 50)
                  }
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-black font-heading text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {withdrawSubmitting
                      ? 'Processing Payout Request...'
                      : `Request Payout of ₹${withdrawAmount}`}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* Popup Receipt Modal for Successful Withdrawal Request */}
          {withdrawalReceipt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
              <div className="w-full max-w-md bg-[#0a0c16] border border-emerald-500/50 rounded-2xl p-5 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-950/60">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-heading font-black text-sm uppercase text-white">
                      Payout Request Submitted
                    </span>
                  </div>
                  <button
                    onClick={() => setWithdrawalReceipt(null)}
                    className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center py-2">
                  <span className="text-xs text-slate-400 uppercase font-mono block">Amount Disbursed</span>
                  <div className="text-3xl font-black font-mono text-emerald-400 my-1">
                    ₹{withdrawalReceipt.amount}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                    STATUS: PENDING (5-15 MINS)
                  </span>
                </div>

                <div className="space-y-2 rounded-xl bg-black/50 p-3.5 border border-slate-800 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Transaction ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">{withdrawalReceipt.transactionId}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(withdrawalReceipt.transactionId);
                          setReceiptCopied(true);
                          setTimeout(() => setReceiptCopied(false), 2000);
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        {receiptCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Method:</span>
                    <span className="text-slate-200">{withdrawalReceipt.method}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">UPI ID:</span>
                    <span className="text-emerald-400 font-bold">{withdrawalReceipt.upiId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="text-slate-200">{withdrawalReceipt.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Est. Arrival:</span>
                    <span className="text-amber-400 font-bold">5-15 Minutes</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <a
                    href="https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp Support if Delayed</span>
                  </a>

                  <button
                    onClick={() => setWithdrawalReceipt(null)}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase transition-all cursor-pointer"
                  >
                    Done / Back to Arena
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            /* =================== PASSBOOK & TRANSACTION HISTORY =================== */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer w-fit"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Wallet Overview</span>
                </button>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total Records: {transactionsList.length}
                  </span>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-red-950/40">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'DEPOSIT', label: 'Deposits' },
                  { id: 'WITHDRAWAL', label: 'Withdrawals' },
                  { id: 'MATCH_FEE', label: 'Match Fees' },
                  { id: 'PRIZE', label: 'Prizes Won' },
                ].map((pill) => {
                  const isActive = historyFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setHistoryFilter(pill.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-500 shadow-md shadow-red-950/60'
                          : 'bg-[#090b14] border-red-950/60 text-slate-400 hover:text-white hover:border-red-900/40'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              {/* Transactions List */}
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-500" />
                  <p className="text-xs font-mono">Loading transaction passbook...</p>
                </div>
              ) : (
                (() => {
                  const filtered = transactionsList.filter((item) => {
                    const type = String(item.type || '').toUpperCase();
                    if (historyFilter === 'ALL') return true;
                    if (historyFilter === 'DEPOSIT') return type === 'DEPOSIT';
                    if (historyFilter === 'WITHDRAWAL') return type === 'WITHDRAWAL';
                    if (historyFilter === 'MATCH_FEE') {
                      return ['ENTRY_FEE', 'MATCH_JOIN', 'MATCH_FEE', 'FEE'].includes(type);
                    }
                    if (historyFilter === 'PRIZE') {
                      return ['WINNINGS', 'PRIZE', 'KILL_REWARD', 'BONUS', 'REFERRAL_BONUS'].includes(type);
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 px-4 text-center rounded-2xl bg-[#090a14] border border-red-950/60">
                        <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                          No Transactions in this Category
                        </p>
                        <p className="text-xs text-slate-500 mt-1 mb-4">
                          Your deposit, match join, prize earnings, and payout logs will appear here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('deposit')}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold uppercase"
                        >
                          Add Coins Now
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {filtered.map((txn) => {
                        const rawType = String(txn.type || '').toUpperCase();
                        const isCredit = [
                          'DEPOSIT',
                          'WINNINGS',
                          'PRIZE',
                          'KILL_REWARD',
                          'BONUS',
                          'REFERRAL_BONUS'
                        ].includes(rawType);
                        const status = String(txn.status || 'COMPLETED').toUpperCase();
                        const isSuccess = ['COMPLETED', 'PAID', 'SUCCESS', 'APPROVED'].includes(status);
                        const isPending = ['PENDING', 'PROCESSING'].includes(status);

                        const formattedDate = txn.createdAt || txn.timestamp
                          ? new Date(txn.createdAt || txn.timestamp).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'Just Now';

                        return (
                          <div
                            key={txn.id || txn.orderId}
                            className="p-3.5 rounded-xl bg-gradient-to-r from-[#0d0e1b] to-[#070810] border border-red-950/70 flex items-center justify-between gap-3 hover:border-red-900/70 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  rawType === 'DEPOSIT'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : rawType === 'WITHDRAWAL'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : isCredit
                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {rawType === 'DEPOSIT' ? (
                                  <ArrowDownCircle className="w-5 h-5" />
                                ) : rawType === 'WITHDRAWAL' ? (
                                  <ArrowUpRight className="w-5 h-5" />
                                ) : isCredit ? (
                                  <Trophy className="w-5 h-5" />
                                ) : (
                                  <Receipt className="w-5 h-5" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                                    {rawType === 'DEPOSIT'
                                      ? 'Deposit / Add Coins'
                                      : rawType === 'WITHDRAWAL'
                                      ? 'Coins Withdrawal'
                                      : rawType === 'REFERRAL_BONUS'
                                      ? 'Referral Signup Bonus'
                                      : rawType === 'KILL_REWARD'
                                      ? 'Kill Bounty Reward'
                                      : isCredit
                                      ? 'Tournament Prize Won'
                                      : 'Match Entry Fee'}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                                      isSuccess
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : isPending
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    }`}
                                  >
                                    {status}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                                  <span>{formattedDate}</span>
                                  {txn.orderId && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">
                                        {txn.orderId}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`font-mono font-bold text-sm sm:text-base ${
                                  isCredit ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isCredit ? '+' : '-'}₹{txn.amount || 0}
                              </span>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {txn.gateway || txn.method || (isCredit ? 'Credit' : 'Debit')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
