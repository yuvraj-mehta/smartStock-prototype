import express from 'express';
import { getInventoryValue, getCOGSAndProfit, getOutstandingPayables, getOutstandingReceivables, getDamagedLostValue } from '../controllers/financialReport.controller.js';

const router = express.Router();

// GET /api/v1/financial-report/inventory-value
router.get('/inventory-value', getInventoryValue);
// GET /api/v1/financial-report/cogs-profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/cogs-profit', getCOGSAndProfit);
// GET /api/v1/financial-report/payables
router.get('/payables', getOutstandingPayables);
// GET /api/v1/financial-report/receivables
router.get('/receivables', getOutstandingReceivables);
// GET /api/v1/financial-report/damaged-lost-value
router.get('/damaged-lost-value', getDamagedLostValue);

export default router;
