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
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { collection, query, where, addDoc, updateDoc, doc, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';
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

  // Rupayex Verification & Status Check State
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; amount: number; createdAt: string } | null>(null);
  const [verifyingOrderId, setVerifyingOrderId] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyResultMsg, setVerifyResultMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showManualVerifyInput, setShowManualVerifyInput] = useState<boolean>(false);

  // Passbook & Transaction History State
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'MATCH_FEE' | 'PRIZE'>('ALL');
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'redeem_code'>('upi');
  const [withdrawUpiId, setWithdrawUpiId] = useState<string>('');
  const [deliveryEmail, setDeliveryEmail] = useState<string>(user?.email || '');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Read pending Rupayex order from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pending_rupayex_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.orderId) {
          setPendingOrder(parsed);
          setVerifyingOrderId(parsed.orderId);
        }
      }
    } catch {
      // ignore
    }
  }, [isOpen, activeTab]);

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

  // Fallback / Instant Verification for Rupayex Payment
  const handleCheckDepositStatus = async (orderIdToCheck?: string) => {
    const targetOrderId = (orderIdToCheck || verifyingOrderId || pendingOrder?.orderId || '').trim();
    if (!targetOrderId) {
      setVerifyResultMsg({ type: 'error', text: 'Please enter or select a Transaction / Order ID.' });
      return;
    }

    setIsVerifying(true);
    setVerifyResultMsg(null);
    try {
      const res = await fetch('/api/rupayex/verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: targetOrderId,
          userId: user?.uid,
          amount: pendingOrder?.amount || currentEffectiveDepositAmount
        })
      });

      const data = await res.json();
      if (data.success && (data.status === 'PAID' || data.status === 'SUCCESS' || data.status === 'COMPLETED')) {
        sound.playCoin();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        localStorage.removeItem('pending_rupayex_order');
        setPendingOrder(null);
        setVerifyResultMsg({
          type: 'success',
          text: data.message || `Payment verified! ₹${data.amount || currentEffectiveDepositAmount} credited to your wallet.`
        });
      } else {
        setVerifyResultMsg({
          type: 'info',
          text: data.message || `Order status: ${data.status || 'PENDING'}. If you just completed the payment, please allow up to 1-2 minutes for the bank network to confirm.`
        });
      }
    } catch (err: any) {
      setVerifyResultMsg({
        type: 'error',
        text: err.message || 'Unable to connect to verification server. Please try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Rupayex Payment Gateway Order Creation & Immediate Redirect
  const handleProceedToPayRupayex = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Duplicate Transaction Guard: Disable immediately on first tap
    if (depositSubmitting) return;
    setDepositSubmitting(true);

    setDepositError(null);
    setDepositSuccessMsg(null);

    const amount = Number(currentEffectiveDepositAmount);
    if (!amount || isNaN(amount) || amount < 20 || amount > 10000) {
      const errorMsg = "Amount ₹20 se ₹10,000 ke beech hona chahiye!";
      setDepositError(errorMsg);
      setDepositSubmitting(false);
      try {
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(errorMsg);
        }
      } catch {
        // If iframe suppresses alert, UI banner displays errorMsg
      }
      return;
    }

    if (!user) {
      setDepositError('Please log in first to proceed with deposit.');
      setDepositSubmitting(false);
      return;
    }

    const currentUser = {
      uid: user.uid,
      ffUid: profile?.freeFireUid || user.uid || '10000000',
      ign: profile?.ign || (user as any).displayName || 'Player',
      phone: profile?.phone || '9999999999',
      email: user.email || '',
    };

    const order_id = `TXN_${Date.now()}_${currentUser.uid}`;
    const redirect_url = `${window.location.origin}/wallet?payment=success&order_id=${order_id}&amount=${amount}`;

    const orderPayload = {
      user_token: "2cbda25b49468fe8b5b65d535531fe0d",
      instance_id: "I9dwytvqic1793850117",
      amount: Number(amount),
      order_id: order_id,
      customer_name: currentUser.ign || "Player",
      customer_mobile: currentUser.phone || "9999999999",
      redirect_url: redirect_url,
    };

    // Save pending transaction to localStorage for auto-crediting on redirect return
    const pendingData = {
      orderId: order_id,
      amount: Number(amount),
      userId: currentUser.uid,
      userFfUid: currentUser.ffUid,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('pending_rupayex_order', JSON.stringify(pendingData));
    setPendingOrder(pendingData);
    setVerifyingOrderId(order_id);

    try {
      let data: any = null;

      // 1. Try server proxy endpoint first (guarantees zero CORS blocking)
      try {
        const proxyRes = await fetch('/api/rupayex/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch (proxyErr) {
        console.warn('Proxy route attempted, falling back to direct endpoint:', proxyErr);
      }

      // 2. Direct endpoint fallback if needed
      if (!data || (!data.payment_url && !data.data?.payment_url)) {
        const directRes = await fetch('https://rupayex.net/api/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(orderPayload)
        });
        data = await directRes.json();
      }

      console.log('Rupayex create-order response:', data);

      const paymentUrl = data?.payment_url || data?.data?.payment_url || data?.url || data?.data?.url || data?.checkout_url;

      if (paymentUrl) {
        setDepositSuccessMsg('Connecting to Rupayex Gateway...');
        // Immediately redirect the user to checkout URL
        window.location.href = paymentUrl;
      } else {
        throw new Error(data?.message || 'Payment gateway failed to provide checkout URL.');
      }
    } catch (err: unknown) {
      console.error('Rupayex payment checkout failed:', err);
      const msg = err instanceof Error ? err.message : 'Unable to connect to Rupayex payment gateway.';
      setDepositError(msg);
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

              {/* Rupayex Security & Trust Banner */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <strong className="text-white">Rupayex Instant Gateway</strong>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <span className="text-slate-300">
                    Supports Google Pay, PhonePe, Paytm, BHIM, UPI QR & NetBanking. Your coins are credited <strong>instantly</strong> upon payment.
                  </span>
                </div>
              </div>

              {depositSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{depositSuccessMsg}</span>
                </div>
              )}

              {depositError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{depositError}</span>
                </div>
              )}

              {/* Amount Input & Quick Select Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Deposit Amount (₹20 - ₹10,000)
                </label>
                <div className="relative mb-3">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400 font-mono font-bold text-base">₹</span>
                  <input
                    type="number"
                    placeholder="Enter custom amount (₹20 - ₹10,000)"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setDepositError(null);
                    }}
                    min={20}
                    max={10000}
                    className="w-full h-12 pl-8 pr-4 rounded-xl bg-[#06070a] border border-red-950/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-red-500 shadow-inner"
                  />
                </div>

                {/* Quick Select Chips directly under the input box */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" /> Fast Deposit Chips
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Min ₹20 • Max ₹10,000</span>
                  </div>
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
              </div>

              {/* Rupayex Checkout Summary Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#110f22] to-[#090a14] border border-red-950/80 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-red-950/60">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-heading font-black text-white uppercase tracking-wider">
                      Checkout Summary
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-emerald-400" /> Auto-Credit Active
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Deposit Amount:</span>
                    <span className="font-mono font-bold text-white">₹{currentEffectiveDepositAmount}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Coins Credited:</span>
                    <span className="font-mono font-black text-amber-400">🪙 {currentEffectiveDepositAmount}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gateway Fees:</span>
                    <span className="font-mono font-bold text-emerald-400">₹0 (100% FREE)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Merchant Gateway:</span>
                    <span className="font-mono text-slate-200">Rupayex Instant UPI</span>
                  </div>
                </div>

                {/* Main Action Button: Proceed to Pay with Duplicate Transaction Guard */}
                <button
                  type="button"
                  onClick={handleProceedToPayRupayex}
                  disabled={depositSubmitting || currentEffectiveDepositAmount < 20 || currentEffectiveDepositAmount > 10000}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-950/80 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 border border-red-500/40"
                >
                  <Lock className="w-4 h-4 text-white" />
                  <span>
                    {depositSubmitting
                      ? 'Connecting Gateway...'
                      : currentEffectiveDepositAmount >= 20 && currentEffectiveDepositAmount <= 10000
                      ? `Proceed to Pay ₹${currentEffectiveDepositAmount}`
                      : 'Enter Amount (₹20 - ₹10,000)'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  You will be securely redirected to Rupayex payment gateway. Complete payment using any UPI app and your wallet will be updated automatically.
                </p>
              </div>

              {/* Fallback Payment Verification / Status Checker */}
              <div className="p-4 rounded-2xl bg-[#090b14] border border-red-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <RefreshCw className={`w-4 h-4 text-amber-400 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>Check Deposit Status / Verify</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualVerifyInput(!showManualVerifyInput)}
                    className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                  >
                    {showManualVerifyInput ? 'Hide Custom Input' : 'Enter Order ID Manually'}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Payment kiya par coins add nahi huye? Instant bank verification chalaayein:
                </p>

                {pendingOrder && (
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Recent Order Pending</div>
                      <div className="font-mono text-white font-bold">{pendingOrder.orderId} (₹{pendingOrder.amount})</div>
                    </div>
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => handleCheckDepositStatus(pendingOrder.orderId)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] uppercase cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-md shadow-amber-500/20"
                    >
                      <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                      <span>{isVerifying ? 'Checking...' : 'Check Status'}</span>
                    </button>
                  </div>
                )}

                {showManualVerifyInput && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. TXN_1720000000000_uid"
                      value={verifyingOrderId}
                      onChange={(e) => setVerifyingOrderId(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg bg-black border border-red-950/70 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      disabled={isVerifying || !verifyingOrderId.trim()}
                      onClick={() => handleCheckDepositStatus()}
                      className="h-9 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                      <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
                    </button>
                  </div>
                )}

                {verifyResultMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      verifyResultMsg.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : verifyResultMsg.type === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {verifyResultMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{verifyResultMsg.text}</span>
                  </div>
                )}
              </div>
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
