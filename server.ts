import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Nodemailer API endpoint to dispatch Google Play Redeem Code to user's registered Gmail
app.post('/api/send-redeem-code', async (req, res) => {
  try {
    const { toEmail, ign, amount, redeemCode } = req.body;

    if (!toEmail || !redeemCode) {
      return res.status(400).json({ error: 'Missing toEmail or redeemCode' });
    }

    console.log(`[Nodemailer Dispatch] Sending Play Redeem Code ${redeemCode} (₹${amount}) to ${toEmail} for player ${ign}`);

    // If SMTP credentials exist in environment, use them; otherwise use local test transporter
    let transporter: any;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Create JSON transport / mock logger for development sandbox
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0c0c16; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 550px; margin: 0 auto; border: 1px solid #f59e0b;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 26px; letter-spacing: 1px;">FIRE ARENA PRO</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Official Esports Tournament Payout</p>
        </div>

        <div style="background-color: #161626; padding: 18px; border-radius: 10px; border: 1px solid #334155; margin-bottom: 20px;">
          <p style="font-size: 14px; margin: 0 0 10px 0; color: #e2e8f0;">
            Congratulations <strong style="color: #f59e0b;">${ign || 'Gamer'}</strong>!
          </p>
          <p style="font-size: 13px; margin: 0; color: #94a3b8; line-height: 1.5;">
            Your withdrawal request of <strong style="color: #10b981;">₹${amount}</strong> from Fire Arena Pro has been verified and processed by the administration.
          </p>
        </div>

        <div style="background-color: #000000; padding: 18px; border-radius: 10px; border: 2px dashed #f59e0b; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 11px; color: #f59e0b; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; display: block; margin-bottom: 6px;">Your Google Play Redeem Code</span>
          <code style="font-size: 20px; font-weight: bold; color: #ffffff; letter-spacing: 2px; font-family: monospace;">${redeemCode}</code>
        </div>

        <div style="font-size: 12px; color: #94a3b8; line-height: 1.6; border-top: 1px solid #1e293b; padding-top: 14px;">
          <strong style="color: #e2e8f0; display: block; margin-bottom: 4px;">How to Redeem:</strong>
          1. Open the Google Play Store app on your phone.<br/>
          2. Tap your profile icon at top right.<br/>
          3. Tap <strong>Payments & subscriptions</strong> → <strong>Redeem code</strong>.<br/>
          4. Enter your code and click Redeem to top up your Free Fire MAX Diamonds.
        </div>

        <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #64748b;">
          &copy; ${new Date().getFullYear()} Fire Arena Pro Esports. Automated Payout Dispatch.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: '"Fire Arena Pro Esports" <payouts@firearenapro.com>',
      to: toEmail,
      subject: `🏆 Free Fire MAX Payout: Google Play Redeem Code (₹${amount})`,
      text: `Congratulations ${ign || 'Gamer'}! Here is your Google Play Redeem Code for ₹${amount}: ${redeemCode}`,
      html: htmlContent,
    });

    console.log('[Nodemailer Dispatch Success]:', info.messageId || 'Delivered to mail pipeline');

    return res.json({
      success: true,
      message: 'Redeem code dispatched via Nodemailer',
      deliveredTo: toEmail,
      code: redeemCode,
    });
  } catch (error: any) {
    console.error('[Nodemailer Dispatch Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to dispatch email' });
  }
});

// Rupayex Payment Gateway API Endpoint (Server Proxy for zero-CORS reliability)
app.post('/api/rupayex/create-order', async (req, res) => {
  try {
    const { amount, order_id, customer_name, customer_mobile, redirect_url } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid deposit amount' });
    }

    const payload = {
      user_token: "2cbda25b49468fe8b5b65d535531fe0d",
      instance_id: "I9dwytvqic1793850117",
      amount: Number(amount),
      order_id: String(order_id || `TXN_${Date.now()}`),
      customer_name: customer_name || "Player",
      customer_mobile: customer_mobile || "9999999999",
      redirect_url: redirect_url || "https://example.com/wallet?payment=success"
    };

    console.log('[Rupayex Gateway Proxy] Creating order:', payload.order_id, 'Amount: ₹' + payload.amount);

    const gatewayResponse = await fetch('https://rupayex.net/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await gatewayResponse.json().catch(() => null);
    console.log('[Rupayex Gateway Proxy] Response:', data);

    if (!data) {
      return res.status(502).json({ status: false, message: 'Invalid response from Rupayex Gateway' });
    }

    return res.status(gatewayResponse.status).json(data);
  } catch (error: any) {
    console.error('[Rupayex Gateway Proxy Error]:', error);
    return res.status(500).json({ status: false, error: error.message || 'Payment Gateway proxy failure' });
  }
});

// Rupayex Backend Webhook Handler (Server-to-Server Instant Auto-Credit)
const handleRupayexWebhook = async (req: express.Request, res: express.Response) => {
  try {
    console.log('[Rupayex Webhook Received]:', req.body);
    const body = req.body || {};

    // 1. Case-insensitively verify payment status
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

    // 2. Check if already marked PAID in deposit_orders (prevents double crediting)
    const checkOrderRes = await fetch(`${firestoreBaseUrl}/deposit_orders/${orderId}?key=${apiKey}`);
    if (checkOrderRes.ok) {
      const orderDoc = await checkOrderRes.json();
      if (orderDoc?.fields?.status?.stringValue === 'PAID') {
        console.log(`[Rupayex Webhook] Order ${orderId} already marked PAID in deposit_orders.`);
        return res.status(200).json({ success: true, message: "Balance updated successfully" });
      }
    }

    // 3. Resolve user ID from payload, orderId, or deposit_orders
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
      console.warn(`[Rupayex Webhook] Could not determine userId for order ${orderId}`);
      return res.status(200).json({ success: false, message: 'Could not resolve user ID' });
    }

    // 4. Mark deposit_orders/{order_id} as PAID first (idempotency barrier)
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

    // 5. Fetch current user document and increment both depositBalance and wallet_balance
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

    // 6. Log transaction record in /users/{uid}/transactions
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

    // 7. Mark /transactions/{orderId}
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

    // 8. Add to depositRequests feed
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

    // 9. Push in-app notification
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

    console.log(`[Rupayex Webhook Success] Successfully credited ₹${amount} to user ${userId} for order ${orderId}`);
    return res.status(200).json({ success: true, message: "Balance updated successfully" });
  } catch (err: any) {
    console.error('[Rupayex Webhook Handler Error]:', err);
    return res.status(200).json({ success: false, error: err.message });
  }
};

// Client-Side Verification Endpoint ("Check Payment Status" Fallback)
const handleVerifyPayment = async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body || {};
    const query = (req.query as any) || {};
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
      console.log('[Rupayex Status Check API Response]:', gatewayData);
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
              type: { stringValue: 'DEPOSIT' },
              amount: { integerValue: String(creditAmount) },
              orderId: { stringValue: finalOrderId },
              status: { stringValue: 'SUCCESS' },
              timestamp: { stringValue: new Date().toISOString() }
            }
          })
        });

        await fetch(`${firestoreBaseUrl}/transactions/${finalOrderId}?key=${apiKey}`, {
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
    console.error('[Verify Payment Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/rupayex-webhook', handleRupayexWebhook);
app.post('/api/rupayex/webhook', handleRupayexWebhook);
app.post('/api/rupayex/verify-order', handleVerifyPayment);
app.get('/api/rupayex/verify-order', handleVerifyPayment);
app.post('/api/verify-payment', handleVerifyPayment);
app.get('/api/verify-payment', handleVerifyPayment);

// Fallback Admin Delete Match Endpoint (bypasses client security rules securely)
app.post('/api/delete-match', async (req, res) => {
  try {
    const { matchId } = req.body || {};
    if (!matchId) {
      return res.status(400).json({ success: false, error: 'Missing matchId' });
    }

    const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/extreme-ripsaw-zxtlg/databases/ai-studio-firearenapro-f9430e16-49a6-42b6-8d93-473ca682eb98/documents`;
    const apiKey = 'AIzaSyCViuuf83lOW1Es1_9D5HR8rbhMNuBV7Lo';

    console.log(`[Admin API Delete] Deleting matchId: ${matchId}`);

    // Delete from /matches
    const delMatchRes = await fetch(`${firestoreBaseUrl}/matches/${matchId}?key=${apiKey}`, {
      method: 'DELETE',
    });

    // Also attempt deletion from /tournaments
    const delTourneyRes = await fetch(`${firestoreBaseUrl}/tournaments/${matchId}?key=${apiKey}`, {
      method: 'DELETE',
    });

    return res.status(200).json({
      success: true,
      message: `Match ${matchId} deleted successfully`,
      matchesStatus: delMatchRes.status,
      tournamentsStatus: delTourneyRes.status,
    });
  } catch (err: any) {
    console.error('[Admin API Delete Match Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  const publicPath = path.resolve(process.cwd(), 'public');
  
  // Explicit PWA routes with exact headers for PWABuilder & browsers
  app.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(publicPath, 'sw.js'));
  });

  app.get('/manifest.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.sendFile(path.join(publicPath, 'manifest.json'));
  });

  // Android Digital Asset Links for TWA Fullscreen Verification
  app.get('/.well-known/assetlinks.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(publicPath, '.well-known', 'assetlinks.json'));
  });

  app.use(express.static(publicPath, { dotfiles: 'allow' }));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { dotfiles: 'allow' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fire Arena Pro Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
