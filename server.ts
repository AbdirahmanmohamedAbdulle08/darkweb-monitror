import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './server/routes/auth.routes.ts';
import scanRoutes from './server/routes/scan.routes.ts';
import watchlistRoutes from './server/routes/watchlist.routes.ts';
import paymentRoutes from './server/routes/payment.routes.ts';
import reportRoutes from './server/routes/report.routes.ts';
import notificationRoutes from './server/routes/notification.routes.ts';
import adminRoutes from './server/routes/admin.routes.ts';
import { authMiddleware } from './server/middleware/auth.middleware.ts';
import { hibpProvider } from './server/providers/HIBPProvider.ts';
import { geminiAIService } from './server/services/GeminiAIService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Global session token authentication middleware
  app.use(authMiddleware);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'DarkWatch Intelligence',
      tagline: 'Discover. Monitor. Protect.',
      hibpConfigured: hibpProvider.isConfigured(),
      geminiConfigured: geminiAIService.isAvailable(),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/scan', scanRoutes);
  app.use('/api/watchlist', watchlistRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      error: 'An unexpected internal security error occurred.',
      message: err?.message || 'Server error',
    });
  });

  // Frontend integration (Vite dev middleware vs Production static serving)
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`[DarkWatch Intelligence] Server running at http://localhost:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start DarkWatch server:', err);
  process.exit(1);
});
