import { Router } from 'express';
import { db } from '../database/db.ts';
import { generateSessionToken, requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

// Register new user
router.post('/register', (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    res.status(400).json({ error: 'Email, password, and full name are required.' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email address format.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email address already exists.' });
    return;
  }

  const user = db.createUser(email, password, fullName.trim(), 'customer');
  const token = generateSessionToken(user.id);

  res.status(201).json({
    user,
    token,
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const userRecord = db.getUserByEmail(email);
  if (!userRecord || !db.verifyPassword(userRecord, password)) {
    res.status(401).json({ error: 'Invalid email or password credentials.' });
    return;
  }

  if (userRecord.status === 'suspended') {
    res.status(403).json({ error: 'Your account has been suspended. Please contact security administration.' });
    return;
  }

  const token = generateSessionToken(userRecord.id);

  db.logAudit({
    userId: userRecord.id,
    action: 'USER_LOGIN',
    resourceType: 'auth',
    details: { email: userRecord.email },
  });

  const { passwordHash, ...profile } = userRecord;

  res.json({
    user: profile,
    token,
  });
});

// Get current session
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Update password
router.post('/update-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    return;
  }

  const userRecord = db.getUserById(req.user!.id);
  if (!userRecord || !db.verifyPassword(userRecord, currentPassword)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  db.updateUserPassword(req.user!.id, newPassword);
  res.json({ success: true, message: 'Password updated successfully.' });
});

// Forgot password reset initiation
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }

  const user = db.getUserByEmail(email);
  let resetToken: string | undefined;

  if (user) {
    resetToken = db.createPasswordResetToken(user.id);
    db.logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'auth',
      details: { email: user.email },
    });
  }

  // Consistent response to prevent user enumeration, with previewToken provided in development/sandbox
  res.json({
    success: true,
    message: 'If an account exists for this address, password reset instructions have been logged.',
    previewToken: process.env.EMAIL_PROVIDER_API_KEY ? undefined : resetToken,
  });
});

// Complete password reset with token
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ error: 'Reset token and new password are required.' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const userId = db.verifyPasswordResetToken(token);
  if (!userId) {
    res.status(400).json({ error: 'Password reset link is invalid or has expired. Please request a new one.' });
    return;
  }

  db.updateUserPassword(userId, newPassword);
  db.consumePasswordResetToken(token);

  db.logAudit({
    userId,
    action: 'PASSWORD_RESET_COMPLETED',
    resourceType: 'auth',
  });

  res.json({
    success: true,
    message: 'Your password has been reset successfully. You may now sign in with your new credentials.',
  });
});

export default router;
