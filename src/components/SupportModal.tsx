import React, { useState } from 'react';
import {
  X,
  Headphones,
  MessageCircle,
  Send,
  Mail,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  Clock,
  Zap,
  Users
} from 'lucide-react';
import { sound } from '../utils/audio';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How and when do I get the Free Fire Room ID & Password?',
      a: 'Room ID & Password are automatically unlocked on your registered match card 15 minutes before match start time. You will also receive an urgent in-app notification ping with a 1-tap copy button to join the Free Fire custom room.'
    },
    {
      q: 'How long does Deposit verification take?',
      a: 'After you scan the admin UPI QR code and submit your 12-digit UTR/Reference number with payment proof, our admin team verifies the transaction and credits your deposit wallet within 5 to 10 minutes.'
    },
    {
      q: 'How do I withdraw my match winnings?',
      a: 'Go to Wallet -> Withdraw tab. Enter your desired withdrawal amount (minimum ₹10) and your active UPI ID. Winnings are transferred directly to your bank account via UPI within 10 to 30 minutes.'
    },
    {
      q: 'How are kill prizes verified & credited?',
      a: 'Take a clear screenshot of the end-game kill feed/scoreboard right after your match and click "Submit Proof" on your match card. Admin verifies against official spectator logs and credits winnings immediately.'
    },
    {
      q: 'What if a match gets cancelled by Admin?',
      a: 'If a tournament room is cancelled for any reason, 100% of the entry fee is automatically and instantly refunded back to your wallet balance with zero deductions.'
    },
    {
      q: 'Are PC Emulators allowed in tournament rooms?',
      a: 'Strictly NO. Fire Arena Pro is 100% Mobile touch only. Playing on BlueStacks, LDPlayer, MSI, or using config files/scripts results in an instant permanent ban with zero refund.'
    }
  ];

  const handleCopyEmail = () => {
    sound.playCopy();
    navigator.clipboard.writeText('ubedmo650@gmail.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const whatsappSupportUrl = `https://wa.me/918979313773?text=${encodeURIComponent(
    'Hello Admin, I need help with FIRE-ARENA-PRO'
  )}`;
  const whatsappGroupUrl = 'https://chat.whatsapp.com/HXFdnz9VkWmFHehKIBo4WC';
  const telegramUrl = 'https://t.me/firearenapro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-[#090a14] border border-red-950/80 rounded-2xl shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-red-950/60 bg-[#0e0c18] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-black font-bold shadow-lg shadow-emerald-500/20">
              <Headphones className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading">
                24/7 Gamer Support & Helpdesk
              </h3>
              <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Admin Online · Avg Reply: Under 5 Mins</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Contact Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Direct WhatsApp Support */}
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => sound.playClick()}
              className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-green-950/40 border border-emerald-500/40 hover:border-emerald-400 flex items-center gap-3 transition-all cursor-pointer group shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black shrink-0 shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5 fill-black" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">
                  Instant Chat
                </span>
                <span className="text-xs font-bold text-white block truncate">
                  WhatsApp Support
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Pre-filled help message
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
            </a>

            {/* 2. Official Telegram Community */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => sound.playClick()}
              className="p-3.5 rounded-xl bg-gradient-to-r from-sky-600/20 to-blue-950/40 border border-sky-500/40 hover:border-sky-400 flex items-center gap-3 transition-all cursor-pointer group shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-500/30 group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5 fill-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono font-bold text-sky-400 block">
                  Official Channel
                </span>
                <span className="text-xs font-bold text-white block truncate">
                  Telegram Community
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Daily room announcements
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-sky-400 ml-auto shrink-0" />
            </a>
          </div>

          {/* Secondary Contact Bar: Email & WhatsApp Group */}
          <div className="p-3 rounded-xl bg-black/60 border border-red-950/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 font-semibold">Official Support Email:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="mailto:ubedmo650@gmail.com?subject=FIRE-ARENA-PRO%20Support"
                  className="text-amber-400 hover:underline font-mono text-xs font-bold"
                >
                  ubedmo650@gmail.com
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="Copy email address"
                >
                  {copiedEmail ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-semibold">Gamer Community Group:</span>
              </div>
              <a
                href={whatsappGroupUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 text-xs font-bold font-mono flex items-center gap-1"
              >
                <span>Join Group</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* FAQ Accordion Section */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Frequently Asked Questions (FAQ)</span>
            </span>

            <div className="space-y-1.5">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-red-950/60 bg-black/50 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setOpenFaqIndex(isOpen ? null : idx);
                      }}
                      className="w-full p-3 text-left flex items-center justify-between gap-2 hover:bg-slate-900/60 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-red-600/20 text-red-400 text-[10px] flex items-center justify-center font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <span>{faq.q}</span>
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 text-[11px] text-slate-400 leading-relaxed pl-9 border-t border-slate-900/80">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-3.5 border-t border-red-950/60 bg-[#0e0c18] flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official 24/7 Verified Fire Arena Pro Desk</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
