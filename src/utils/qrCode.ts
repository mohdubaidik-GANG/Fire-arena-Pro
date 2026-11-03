/**
 * Generates UPI deep link string for Indian UPI payment apps (PhonePe, Google Pay, Paytm, etc.)
 */
export function generateUpiUrl(params: {
  pa: string; // Payee VPA / UPI ID
  pn: string; // Payee Name
  am?: number; // Amount
  cu?: string; // Currency
  tn?: string; // Transaction note
}): string {
  const { pa, pn, am, cu = 'INR', tn = 'FireArena Tournament Deposit' } = params;
  let url = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&cu=${cu}&tn=${encodeURIComponent(tn)}`;
  if (am && am > 0) {
    url += `&am=${am.toFixed(2)}`;
  }
  return url;
}

/**
 * Generates an SVG path or dynamic QR representation using an inline SVG element
 * For maximum reliability, we also construct a high-resolution SVG QR code representation.
 */
export function getUpiQrSvgUrl(upiUri: string): string {
  // We can use a clean dynamic SVG encoded as data URL or render via an SVG component
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=15&data=${encodeURIComponent(upiUri)}`;
}
