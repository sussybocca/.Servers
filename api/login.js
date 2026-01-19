import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// Nodemailer transporter - FIX FOR GMAIL
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // MUST be Gmail "App Password" not regular password
  },
  tls: {
    rejectUnauthorized: false // Helps with some Gmail issues
  }
});

// Rate limiting
const rateLimitCache = new Map();

async function checkRateLimit(key) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;
  
  const attempts = rateLimitCache.get(key) || [];
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) return false;
  
  recentAttempts.push(now);
  rateLimitCache.set(key, recentAttempts);
  return true;
}

async function logAttempt(key) {
  const attempts = rateLimitCache.get(key) || [];
  attempts.push(Date.now());
  rateLimitCache.set(key, attempts);
}

// Device fingerprint - IMPROVED
function getDeviceFingerprint(headers, frontendFingerprint) {
  // Use frontend fingerprint if provided, otherwise create from headers
  if (frontendFingerprint && frontendFingerprint.length > 10) {
    return frontendFingerprint;
  }
  
  const source = (headers['user-agent'] || '') + 
                 (headers['accept-language'] || '') + 
                 (headers['x-forwarded-for'] || '');
  return crypto.createHash('sha256').update(source).digest('hex');
}

// Random delay
async function randomDelay() {
  const delay = 500 + Math.random() * 1000;
  return new Promise(res => setTimeout(res, delay));
}

// Session token
function generateEncryptedToken() {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(process.env.SESSION_SECRET || 'fallback-secret-key-32-bytes-long-here', 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const uuid = uuidv4();
  const encrypted = cipher.update(uuid, 'utf8', 'hex') + cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

// Send verification email - IMPROVED
async function sendVerificationEmail(email, code) {
  try {
    console.log(`Attempting to send verification email to: ${email}`);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Server.x Login Verification Code',
      text: `Your verification code is: ${code}\nIt expires in 1 minute.`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Server.x Login Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 8px; text-align: center; margin: 20px 0;">${code}</h1>
        <p>This code will expire in <strong>1 minute</strong>.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from Server.x</p>
      </div>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${email}:`, info.messageId);
    return true;
  } catch (err) {
    console.error('EMAIL SEND ERROR:', err.message);
    console.error('Full error:', err);
    return false;
  }
}

// Generate verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Password check
function passwordStrongEnough(password) {
  return password.length >= 6; // Reduced from 8 for testing
}

// ----------------- MAIN HANDLER -----------------
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    let body;
    if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body); } catch (e) { body = req.body; }
    } else {
      body = req.body;
    }

    const { email, password, remember_me, fingerprint, verification_code } = body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const ip = req.headers['x-forwarded-for'] || req.headers['client-ip'] || req.socket?.remoteAddress || 'unknown';

    // Rate limit
    if (!(await checkRateLimit(ip + email))) {
      return res.status(429).json({ success: false, error: 'Too many login attempts. Please try again in 15 minutes.' });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, username, verified, suspended, suspension_reason, is_honeytoken, password, encrypted_password, profile_picture')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('Supabase user fetch error:', userError);
      await logAttempt(ip + email);
      await randomDelay();
      return res.status(500).json({ success: false, error: 'Authentication service error' });
    }

    // Password check
    let passwordValid = false;
    if (user) {
      const passwordToCheck = user.encrypted_password || user.password || '';
      if (passwordToCheck) passwordValid = await bcrypt.compare(password, passwordToCheck);
    }
    
    if (!user || !passwordValid) {
      const dummyHash = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO';
      await bcrypt.compare(password, dummyHash);
      await logAttempt(ip + email);
      await randomDelay();
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // User status checks
    if (user.suspended) return res.status(403).json({ success: false, error: user.suspension_reason || 'Account suspended' });
    if (user.is_honeytoken) {
      console.warn(`Honeytoken attempt: ${email} from ${ip}`);
      await logAttempt(ip + email);
      await randomDelay();
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    if (user.verified === false) return res.status(403).json({ success: false, error: 'Please verify your email first' });

    if (!passwordStrongEnough(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const deviceFingerprint = getDeviceFingerprint(req.headers, fingerprint);
    console.log(`Device fingerprint for ${email}: ${deviceFingerprint}`);

    // STEP 1: Password correct, send verification code
    if (!verification_code) {
      const code = generateVerificationCode();
      console.log(`Generated verification code for ${email}: ${code}`);
      
      // Store in pending_verifications table
      const { error: upsertError } = await supabase
        .from('pending_verifications')
        .upsert({
          email,
          code,
          fingerprint: deviceFingerprint,
          expires_at: new Date(Date.now() + 60 * 1000).toISOString()
        }, { onConflict: 'email, fingerprint' });

      if (upsertError) {
        console.error('Supabase upsert error:', upsertError);
        return res.status(500).json({ success: false, error: 'Failed to store verification code' });
      }

      // Send email
      const emailSent = await sendVerificationEmail(email, code);
      if (!emailSent) {
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to send verification email. Check email configuration.',
          debug: 'Check EMAIL_USER and EMAIL_PASS in Vercel environment variables'
        });
      }

      return res.status(200).json({
        success: true,
        verification_required: true,
        message: 'Verification code sent to your email. It expires in 1 minute.',
        email_sent: true,
        fingerprint: deviceFingerprint // Send back for debugging
      });
    }

    // STEP 2: Verify the code
    const { data: pending, error: pendingError } = await supabase
      .from('pending_verifications')
      .select('*')
      .eq('email', email)
      .eq('fingerprint', deviceFingerprint)
      .maybeSingle();

    if (pendingError) {
      console.error('Pending verification fetch error:', pendingError);
      return res.status(500).json({ success: false, error: 'Failed to verify code' });
    }

    if (!pending) {
      console.log(`No pending verification found for ${email} with fingerprint ${deviceFingerprint}`);
      return res.status(401).json({ success: false, error: 'No verification request found. Please try logging in again.' });
    }

    if (pending.code !== verification_code) {
      console.log(`Code mismatch for ${email}: expected ${pending.code}, got ${verification_code}`);
      return res.status(401).json({ success: false, error: 'Invalid verification code' });
    }

    if (new Date(pending.expires_at) < new Date()) {
      await supabase.from('pending_verifications').delete().eq('email', email).eq('fingerprint', deviceFingerprint);
      return res.status(401).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
    }

    // Clean up and create session
    await supabase.from('pending_verifications').delete().eq('email', email).eq('fingerprint', deviceFingerprint);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        last_fingerprint: deviceFingerprint,
        last_login: new Date().toISOString(),
        online: true
      })
      .eq('id', user.id);

    if (updateError) console.error('User update error:', updateError);

    const session_token = generateEncryptedToken();
    const expiresInDays = remember_me ? 90 : 1;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const sessionData = {
      user_id: user.id,
      user_email: email,
      session_token,
      expires_at: expiresAt.toISOString(),
      verified: true,
      context: { ip, user_agent: req.headers['user-agent'], timestamp: new Date().toISOString() }
    };

    const { error: sessionError } = await supabase.from('sessions').insert(sessionData);
    if (sessionError) console.error('Session insert error:', sessionError);

    const cookieOptions = [
      `__Host-session_secure=${session_token}`,
      'Path=/',
      'HttpOnly',
      'Secure',
      `Max-Age=${expiresInDays * 24 * 60 * 60}`,
      'SameSite=Strict'
    ].join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile_picture: user.profile_picture
      },
      session_expires: expiresAt.toISOString()
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
