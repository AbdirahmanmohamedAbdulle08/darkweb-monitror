import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../database/db.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import { emailVerificationService } from '../services/EmailVerificationService.ts';
import { domainVerificationService } from '../services/DomainVerificationService.ts';
import type { WatchlistItem } from '../../src/types/index.ts';

const router = Router();

// Get user's watchlists
router.get('/', requireAuth, (req, res) => {
  const items: WatchlistItem[] = [];
  for (const item of db.watchlists.values()) {
    if (item.userId === req.user!.id) {
      items.push(item);
    }
  }
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ watchlists: items });
});

// Add asset to watchlist (must be verified or created with verification check)
router.post('/', requireAuth, (req, res) => {
  const { assetType, assetValue } = req.body;

  if (!assetType || !assetValue) {
    res.status(400).json({ error: 'Asset type (email or domain) and asset value are required.' });
    return;
  }

  let cleanValue = assetValue.trim().toLowerCase();
  let isVerified = false;

  if (assetType === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanValue)) {
      res.status(400).json({ error: 'Invalid email address.' });
      return;
    }
    isVerified = emailVerificationService.isEmailVerified(cleanValue);
  } else if (assetType === 'domain') {
    cleanValue = domainVerificationService.normalizeDomain(cleanValue);
    if (!domainVerificationService.validateDomainFormat(cleanValue)) {
      res.status(400).json({ error: 'Invalid domain syntax.' });
      return;
    }
    isVerified = domainVerificationService.isDomainVerified(cleanValue);
  } else {
    res.status(400).json({ error: 'Unsupported asset type.' });
    return;
  }

  // Check for duplicates
  for (const item of db.watchlists.values()) {
    if (item.userId === req.user!.id && item.assetValue === cleanValue) {
      res.status(409).json({ error: 'This asset is already present in your watchlist.' });
      return;
    }
  }

  const id = 'wl_' + crypto.randomUUID();
  const newItem: WatchlistItem = {
    id,
    userId: req.user!.id,
    assetType,
    assetValue: cleanValue,
    isMonitored: true,
    verificationStatus: isVerified ? 'verified' : 'pending',
    createdAt: new Date().toISOString(),
  };

  db.watchlists.set(id, newItem);

  db.logAudit({
    userId: req.user!.id,
    action: 'WATCHLIST_ASSET_ADDED',
    resourceType: 'watchlist',
    resourceId: id,
    details: { assetType, assetValue: cleanValue, isVerified },
  });

  res.status(201).json({
    success: true,
    item: newItem,
    message: isVerified
      ? 'Asset added and active monitoring enabled.'
      : 'Asset added to watchlist. Ownership verification required before background queries can proceed.',
  });
});

// Toggle monitoring state
router.patch('/:id/toggle-monitoring', requireAuth, (req, res) => {
  const item = db.watchlists.get(req.params.id);
  if (!item || item.userId !== req.user!.id) {
    res.status(404).json({ error: 'Watchlist asset not found.' });
    return;
  }

  item.isMonitored = !item.isMonitored;
  db.watchlists.set(item.id, item);

  db.logAudit({
    userId: req.user!.id,
    action: item.isMonitored ? 'WATCHLIST_MONITORING_RESUMED' : 'WATCHLIST_MONITORING_PAUSED',
    resourceType: 'watchlist',
    resourceId: item.id,
  });

  res.json({ success: true, item });
});

// Remove asset
router.delete('/:id', requireAuth, (req, res) => {
  const item = db.watchlists.get(req.params.id);
  if (!item || item.userId !== req.user!.id) {
    res.status(404).json({ error: 'Watchlist asset not found.' });
    return;
  }

  db.watchlists.delete(req.params.id);

  db.logAudit({
    userId: req.user!.id,
    action: 'WATCHLIST_ASSET_REMOVED',
    resourceType: 'watchlist',
    resourceId: req.params.id,
    details: { assetValue: item.assetValue },
  });

  res.json({ success: true, message: 'Asset removed from watchlist.' });
});

export default router;
