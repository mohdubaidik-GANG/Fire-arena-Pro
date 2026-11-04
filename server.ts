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
          <h1 style="color: #f59e0b; margin: 0; font-size: 26px; letter-spacing: 1px;">FIREARENA MAX</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Official Esports Tournament Payout</p>
        </div>

        <div style="background-color: #161626; padding: 18px; border-radius: 10px; border: 1px solid #334155; margin-bottom: 20px;">
          <p style="font-size: 14px; margin: 0 0 10px 0; color: #e2e8f0;">
            Congratulations <strong style="color: #f59e0b;">${ign || 'Gamer'}</strong>!
          </p>
          <p style="font-size: 13px; margin: 0; color: #94a3b8; line-height: 1.5;">
            Your withdrawal request of <strong style="color: #10b981;">₹${amount}</strong> from FireArena MAX has been verified and processed by the administration.
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
          &copy; ${new Date().getFullYear()} FireArena MAX Esports. Automated Payout Dispatch.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: '"FireArena MAX Esports" <payouts@firearenamax.com>',
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

  app.use(express.static(publicPath));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FireArena MAX Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
