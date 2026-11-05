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

    const rawStatus = String(body.status || body.payment_status || body.order_status || '').toUpperCase();
    const isSuccess = rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED' || rawStatus === 'PAID';

    const orderId = String(body.order_id || body.orderId || body.client_txn_id || '').trim();
    const amount = Number(body.amount || body.order_amount || 0);

    if (!orderId) {
      console.warn('[Rupayex Webhook] Missing order_id in webhook payload');
      return res.status(400).json({ status: 'error', message: 'Missing order_id' });
    }

    if (!isSuccess) {
      console.log(`[Rupayex Webhook] Order ${orderId} received status: ${rawStatus}`);
      return res.json({ status: 'ok', message: `Status ${rawStatus} acknowledged` });
    }

    const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/extreme-ripsaw-zxtlg/databases/ai-studio-firearenapro-f9430e16-49a6-42b6-8d93-473ca682eb98/documents`;
    const apiKey = 'AIzaSyCViuuf83lOW1Es1_9D5HR8rbhMNuBV7Lo';

    // 1. Check if transaction has already been processed in Firestore
    const checkTxnRes = await fetch(`${firestoreBaseUrl}/transactions/${orderId}?key=${apiKey}`);
    if (checkTxnRes.ok) {
      const existingTxn = await checkTxnRes.json();
      if (existingTxn?.fields?.status?.stringValue === 'COMPLETED') {
        console.log(`[Rupayex Webhook] Order ${orderId} already credited in Firestore.`);
        return res.json({ status: 'ok', message: 'Already processed' });
      }
    }

    // 2. Extract userId from payload or parse from orderId (TXN_{timestamp}_{userId})
    let userId = String(body.userId || body.user_id || body.customer_id || '').trim();
    if (!userId && orderId.startsWith('TXN_')) {
      const parts = orderId.split('_');
      userId = parts.slice(2).join('_');
    }

    if (!userId) {
      console.warn(`[Rupayex Webhook] Could not determine userId for order ${orderId}`);
      return res.status(400).json({ status: 'error', message: 'Could not resolve user ID' });
    }

    // 3. Fetch user document to update balance
    const userDocRes = await fetch(`${firestoreBaseUrl}/users/${userId}?key=${apiKey}`);
    let currentDeposit = 0;
    let userEmail = '';
    let userIgn = 'Player';
    if (userDocRes.ok) {
      const userData = await userDocRes.json();
      currentDeposit = Number(userData?.fields?.depositBalance?.integerValue || userData?.fields?.depositBalance?.doubleValue || 0);
      userEmail = userData?.fields?.email?.stringValue || '';
      userIgn = userData?.fields?.ign?.stringValue || 'Player';
    }

    const newDepositBalance = currentDeposit + amount;

    // 4. Update user's depositBalance in Firestore
    await fetch(`${firestoreBaseUrl}/users/${userId}?updateMask.fieldPaths=depositBalance&updateMask.fieldPaths=updatedAt&key=${apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          depositBalance: { integerValue: String(newDepositBalance) },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    // 5. Mark transaction record in 'transactions' collection with status COMPLETED
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

    // 6. Record in depositRequests & walletHistory for user transaction feed
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

    console.log(`[Rupayex Webhook Success] Successfully credited ₹${amount} to user ${userId} for order ${orderId}`);
    return res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[Rupayex Webhook Handler Error]:', err);
    return res.status(500).json({ status: 'error', error: err.message });
  }
};

app.post('/api/rupayex-webhook', handleRupayexWebhook);
app.post('/api/rupayex/webhook', handleRupayexWebhook);

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
