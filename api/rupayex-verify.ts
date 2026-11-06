// Vercel Serverless Function: /api/rupayex/verify-order & /api/verify-payment
export default async function handler(req: any, res: any) {
  try {
    const body = req.body || {};
    const query = req.query || {};
    const finalOrderId = String(body.order_id || body.orderId || query.order_id || query.orderId || '').trim();
    const userId = String(body.userId || body.user_id || query.userId || query.user_id || '').trim();
    const reqAmount = Number(body.amount || query.amount || 0);

    if (!finalOrderId) {
      return res.status(400).json({ success: false, message: 'Missing order ID to verify' });
    }

    const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/extreme-ripsaw-zxtlg/databases/ai-studio-firearenapro-f9430e16-49a6-42b6-8d93-473ca682eb98/documents`;
    const apiKey = 'AIzaSyCViuuf83lOW1Es1_9D5HR8rbhMNuBV7Lo';

    // 1. Check if already marked PAID in deposit_orders
    const checkOrderRes = await fetch(`${firestoreBaseUrl}/deposit_orders/${finalOrderId}?key=${apiKey}`);
    if (checkOrderRes.ok) {
      const orderDoc = await checkOrderRes.json();
      if (orderDoc?.fields?.status?.stringValue === 'PAID') {
        const amt = Number(orderDoc?.fields?.amount?.integerValue || reqAmount || 0);
        return res.json({ success: true, status: 'PAID', amount: amt, message: 'Deposit verified and already credited.' });
      }
    }

    // 2. Query Rupayex Gateway Status API directly
    let gatewayData: any = null;
    try {
      const rupayexCheckRes = await fetch('https://rupayex.net/api/check-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          user_token: "2cbda25b49468fe8b5b65d535531fe0d",
          order_id: finalOrderId
        })
      });
      gatewayData = await rupayexCheckRes.json().catch(() => null);
    } catch (gErr) {
      console.warn('Rupayex status check gateway call failed:', gErr);
    }

    const rawStatus = String(gatewayData?.status || gatewayData?.data?.status || gatewayData?.payment_status || '').toUpperCase();
    const isPaid = ['SUCCESS', 'TXN_SUCCESS', 'COMPLETED', 'PAID', 'TRUE'].includes(rawStatus);

    if (isPaid) {
      const creditAmount = Number(gatewayData?.amount || gatewayData?.data?.amount || reqAmount || 0);
      let targetUserId = String(userId || gatewayData?.user_id || '').trim();
      if (!targetUserId && finalOrderId.startsWith('TXN_')) {
        const parts = finalOrderId.split('_');
        targetUserId = parts.slice(2).join('_');
      }

      // Mark deposit_orders as PAID
      await fetch(`${firestoreBaseUrl}/deposit_orders/${finalOrderId}?key=${apiKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            orderId: { stringValue: finalOrderId },
            userId: { stringValue: targetUserId },
            amount: { integerValue: String(creditAmount) },
            status: { stringValue: 'PAID' },
            gateway: { stringValue: 'RUPAYEX' },
            updatedAt: { stringValue: new Date().toISOString() }
          }
        })
      });

      // Update user wallet balance
      if (targetUserId) {
        const userRes = await fetch(`${firestoreBaseUrl}/users/${targetUserId}?key=${apiKey}`);
        let curDeposit = 0;
        let curWallet = 0;
        if (userRes.ok) {
          const uData = await userRes.json();
          curDeposit = Number(uData?.fields?.depositBalance?.integerValue || 0);
          curWallet = Number(uData?.fields?.wallet_balance?.integerValue || curDeposit);
        }

        await fetch(`${firestoreBaseUrl}/users/${targetUserId}?updateMask.fieldPaths=depositBalance&updateMask.fieldPaths=wallet_balance&updateMask.fieldPaths=updatedAt&key=${apiKey}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              depositBalance: { integerValue: String(curDeposit + creditAmount) },
              wallet_balance: { integerValue: String(curWallet + creditAmount) },
              updatedAt: { stringValue: new Date().toISOString() }
            }
          })
        });

        // Add transaction log
        await fetch(`${firestoreBaseUrl}/users/${targetUserId}/transactions/${finalOrderId}?key=${apiKey}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              orderId: { stringValue: finalOrderId },
              userId: { stringValue: targetUserId },
              amount: { integerValue: String(creditAmount) },
              status: { stringValue: 'COMPLETED' },
              type: { stringValue: 'DEPOSIT' },
              gateway: { stringValue: 'RUPAYEX' },
              createdAt: { stringValue: new Date().toISOString() }
            }
          })
        });
      }

      return res.json({
        success: true,
        status: 'PAID',
        amount: creditAmount,
        message: `Payment verified! ₹${creditAmount} has been credited to your wallet.`
      });
    }

    return res.json({
      success: false,
      status: rawStatus || 'PENDING',
      message: 'Payment has not been confirmed by the bank yet. Please wait a few seconds and tap again.'
    });
  } catch (err: any) {
    console.error('[Verify Payment Serverless Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
