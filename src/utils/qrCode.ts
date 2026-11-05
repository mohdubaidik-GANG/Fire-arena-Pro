/**
 * Generates UPI deep link string for Indian UPI payment apps (PhonePe, Google Pay, Paytm, etc.)
 *
 * CRITICAL FIX: Do NOT encode '@' in the payee VPA (pa parameter).
 * UPI apps require the literal '@' character (e.g. '9005939633@ptyes').
 * If '@' is encoded to '%40', UPI apps interpret '%40' as part of the username
 * rather than the domain separator, causing "Invalid VPA" error.
 */
export function generateUpiUrl(params: {
  pa: string; // Payee VPA / UPI ID (e.g. "9005939633@ptyes")
  pn?: string; // Payee Name (e.g. "Fire Arena Pro")
  am?: number | string; // Amount in INR
  cu?: string; // Currency
  tn?: string; // Transaction note
}): string {
  const { pa, pn = 'Fire Arena Pro', am, cu = 'INR', tn = 'AddCoins' } = params;

  // 1. Ensure payee VPA is clean and '@' is NEVER encoded to '%40'
  let payeeVpa = (pa || '9005939633@ptyes').trim();
  try {
    payeeVpa = decodeURIComponent(payeeVpa);
  } catch {
    payeeVpa = payeeVpa.replace(/%40/gi, '@');
  }
  // Extra safeguard: guarantee no %40 in payeeVpa
  payeeVpa = payeeVpa.replace(/%40/gi, '@');

  // 2. Payee Name & Transaction Note
  const payeeName = encodeURIComponent((pn || 'Fire Arena Pro').trim());
  const note = encodeURIComponent((tn || 'AddCoins').trim());

  // 3. Amount formatting (e.g. 50 or 50.00)
  const amountVal = am !== undefined && am !== null ? Number(am) : 0;
  const amount = !isNaN(amountVal) && amountVal > 0 
    ? (amountVal % 1 === 0 ? amountVal.toString() : amountVal.toFixed(2))
    : '';

  // 4. Construct exact UPI URL
  // Format: upi://pay?pa=${payeeVpa}&pn=${payeeName}&am=${amount}&cu=INR&tn=AddCoins
  if (amount) {
    return `upi://pay?pa=${payeeVpa}&pn=${payeeName}&am=${amount}&cu=${cu}&tn=${note}`;
  }
  return `upi://pay?pa=${payeeVpa}&pn=${payeeName}&cu=${cu}&tn=${note}`;
}

/**
 * Generates an SVG path or dynamic QR representation using an external QR API service if needed as fallback.
 * Uses the exact unencoded VPA UPI URI.
 */
export function getUpiQrSvgUrl(upiUri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=15&data=${encodeURIComponent(upiUri)}`;
}
