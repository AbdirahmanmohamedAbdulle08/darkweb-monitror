import { Router } from 'express';
import { reportService } from '../services/ReportService.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';
import type { ScanFinding } from '../../src/types/index.ts';

const router = Router();

// Get user reports
router.get('/my-reports', requireAuth, (req, res) => {
  const reports = reportService.getUserReports(req.user!.id);
  res.json({ reports });
});

// Get single report
router.get('/:id', requireAuth, (req, res) => {
  const result = reportService.getReportById(req.params.id, req.user!.id, req.user!.role);
  if (result.error) {
    res.status(result.error.includes('Unauthorized') ? 403 : 404).json({ error: result.error });
    return;
  }

  res.json(result);
});

// Download report findings as CSV
router.get('/:id/download-csv', requireAuth, (req, res) => {
  const result = reportService.getReportById(req.params.id, req.user!.id, req.user!.role);
  if (result.error || !result.findings) {
    res.status(404).json({ error: result.error || 'No findings available for download.' });
    return;
  }

  const csv = reportService.generateCSV(result.findings as ScanFinding[]);
  const filename = `DarkWatch_Report_${req.params.id}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export default router;
