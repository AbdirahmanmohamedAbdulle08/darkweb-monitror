import { Router } from 'express';
import { db } from '../database/db.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import type { NotificationItem } from '../../src/types/index.ts';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const list: NotificationItem[] = [];
  for (const notif of db.notifications.values()) {
    if (notif.userId === req.user!.id) {
      list.push(notif);
    }
  }
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ notifications: list });
});

router.patch('/:id/read', requireAuth, (req, res) => {
  const notif = db.notifications.get(req.params.id);
  if (!notif || notif.userId !== req.user!.id) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }

  notif.isRead = true;
  db.notifications.set(notif.id, notif);
  res.json({ success: true, notification: notif });
});

router.post('/mark-all-read', requireAuth, (req, res) => {
  for (const notif of db.notifications.values()) {
    if (notif.userId === req.user!.id) {
      notif.isRead = true;
      db.notifications.set(notif.id, notif);
    }
  }
  res.json({ success: true });
});

export default router;
