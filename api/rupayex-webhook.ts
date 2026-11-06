// Vercel Serverless Function: /api/rupayex-webhook
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    console.log('[Rupayex Vercel Webhook Received]:', body);

    const rawStatus = String(body.status || body.payment_status || body.order_status || body.txn_status || '').toUpperCase();
    const isSuccess = ['SUCCESS', 'TXN_SUCCESS', 'COMPLETED', 'PAID', 'TRUE'].includes(rawStatus);

    const orderId = String(body.order_id || body.orderId || body.client_txn_id || body.txn_id || '').trim();
    const amount = Number(body.amount || body.order_amount || body.txn_amount || 0);

    if (!orderId) {
      console.warn('[Rupayex Webhook] Missing order_id in webhook payload');
      return res.status(200).json({ success: false, message: 'Missing order_id' });
    }

    if (!isSuccess) {
      console.log(`[Rupayex Webhook] Order ${orderId} received status: ${rawStatus}`);
      return res.status(200).json({ success: true, message: `Status ${rawStatus} acknowledged` });
    }

    const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/extreme-ripsaw-zxtlg/databases/ai-studio-firearenapro-f9430e16-49a6-42b6-8d93-473ca682eb98/documents`;
    const apiKey = 'AIzaSyCViuuf83lOW1Es1_9D5HR8rbhMNuBV7Lo';

    // 1. Check if already marked PAID in deposit_orders
    const checkOrderRes = await fetch(`${firestoreBaseUrl}/deposit_orders/${orderId}?key=${apiKey}`);
    if (checkOrderRes.ok) {
      const orderDoc = await checkOrderRes.json();
      if (orderDoc?.fields?.status?.stringValue === 'PAID') {
        console.log(`[Rupayex Webhook] Order ${orderId} already credited in deposit_orders.`);
        return res.status(200).json({ success: true, message: "Balance updated successfully" });
      }
    }

    // 2. Resolve userId
    let userId = String(body.user_id || body.userId || body.customer_id || body.uid || '').trim();
    if (!userId && orderId.startsWith('TXN_')) {
      const parts = orderId.split('_');
      userId = parts.slice(2).join('_');
    }
    if (!userId && checkOrderRes.ok) {
      const orderDoc = await checkOrderRes.json().catch(() => null);
      userId = orderDoc?.fields?.userId?.stringValue || '';
    }

    if (!userId) {
      console.warn(`[Rupayex Webhook] Could not resolve userId for order ${orderId}`);
      return res.status(200).json({ success: false, message: 'Could not resolve user ID' });
    }

    // 3. Mark deposit_orders/{order_id} as PAID (idempotency barrier)
    await fetch(`${firestoreBaseUrl}/deposit_orders/${orderId}?key=${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          orderId: { stringValue: orderId },
          userId: { stringValue: userId },
          amount: { integerValue: String(amount) },
          status: { stringValue: 'PAID' },
          gateway: { stringValue: 'RUPAYEX' },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    // 4. Fetch current user balance and increment both depositBalance and wallet_balance
    const userDocRes = await fetch(`${firestoreBaseUrl}/users/${userId}?key=${apiKey}`);
    let currentDeposit = 0;
    let currentWallet = 0;
    let userEmail = '';
    let userIgn = 'Player';
    if (userDocRes.ok) {
      const userData = await userDocRes.json();
      currentDeposit = Number(userData?.fields?.depositBalance?.integerValue || userData?.fields?.depositBalance?.doubleValue || 0);
      currentWallet = Number(userData?.fields?.wallet_balance?.integerValue || userData?.fields?.wallet_balance?.doubleValue || currentDeposit);
      userEmail = userData?.fields?.email?.stringValue || '';
      userIgn = userData?.fields?.ign?.stringValue || 'Player';
    }

    const newDeposit = currentDeposit + amount;
    const newWallet = currentWallet + amount;

    await fetch(`${firestoreBaseUrl}/users/${userId}?updateMask.fieldPaths=depositBalance&updateMask.fieldPaths=wallet_balance&updateMask.fieldPaths=updatedAt&key=${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          depositBalance: { integerValue: String(newDeposit) },
          wallet_balance: { integerValue: String(newWallet) },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    // 5. Log transaction record in /users/{uid}/transactions
    await fetch(`${firestoreBaseUrl}/users/${userId}/transactions/${orderId}?key=${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          type: { stringValue: 'DEPOSIT' },
          amount: { integerValue: String(amount) },
          orderId: { stringValue: orderId },
          status: { stringValue: 'SUCCESS' },
          timestamp: { stringValue: new Date().toISOString() }
        }
      })
    });

    // 6. Mark /transactions/{orderId}
    await fetch(`${firestoreBaseUrl}/transactions/${orderId}?key=${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          orderId: { stringValue: orderId },
          userId: { stringValue: userId },
          amount: { integerValue: String(amount) },
          status: { stringValue: 'COMPLETED' },
          type: { stringValue: 'DEPOSIT' },
          gateway: { stringValue: 'RUPAYEX' },
          createdAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    // 7. Add to depositRequests feed
    await fetch(`${firestoreBaseUrl}/depositRequests?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          userId: { stringValue: userId },
          userEmail: { stringValue: userEmail },
          userIgn: { stringValue: userIgn },
          amount: { integerValue: String(amount) },
          orderId: { stringValue: orderId },
          status: { stringValue: 'COMPLETED' },
          gateway: { stringValue: 'RUPAYEX' },
          createdAt: { stringValue: new Date().toISOString() },
          reviewedAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    // 8. Push in-app notification
    await fetch(`${firestoreBaseUrl}/users/${userId}/notifications?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          title: { stringValue: '🪙 Instant Deposit Credited!' },
          message: { stringValue: `₹${amount} has been successfully added to your wallet. Order ID: ${orderId}` },
          category: { stringValue: 'WALLET' },
          createdAt: { stringValue: new Date().toISOString() }
        }
      })
    }).catch(() => {});

    console.log(`[Rupayex Vercel Webhook] Success: Credited ₹${amount} to user ${userId} for order ${orderId}`);
    return res.status(200).json({ success: true, message: "Balance updated successfully" });
  } catch (err: any) {
    console.error('[Rupayex Vercel Webhook Error]:', err);
    return res.status(200).json({ success: false, error: err.message });
  }
}
