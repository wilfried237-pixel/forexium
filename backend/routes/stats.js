import express from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/stats
router.get('/', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM vue_stats_globales');
  if (rows.length === 0) return res.json({ depot:0, caisse:0, stock_usdt:0, cmup_usdt:0 });
  const s = rows[0];
  res.json({
    depot:                    parseFloat(s.depot || 0),
    caisse:                   parseFloat(s.caisse || 0),
    stock_usdt:               parseFloat(s.stock_usdt || 0),
    cmup_usdt:                parseFloat(s.cmup_usdt || 0),
    total_ventes:             parseInt(s.total_ventes || 0),
    total_achats:             parseInt(s.total_achats || 0),
    benefices_visibles_total: parseFloat(s.benefices_visibles_total || 0),
    benefices_caches_total:   parseFloat(s.benefices_caches_total || 0),
  });
}));

// GET /api/stats/comptes
router.get('/comptes', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM comptes');
  const result = {};
  rows.forEach(c => { result[c.type_compte] = parseFloat(c.montant); });
  res.json(result);
}));

// GET /api/stats/repartition
router.get('/repartition', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM repartition_profits');
  res.json({
    repartition: rows.map(r => ({
      role:                   r.role,
      pourcentage_defaut:     parseFloat(r.pourcentage_defaut),
      total_accumule_visible: parseFloat(r.total_accumule_visible || 0),
      total_accumule_cache:   parseFloat(r.total_accumule_cache || 0),
    }))
  });
}));

// GET /api/stats/daily
router.get('/daily', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const rows = await query(
    `SELECT * FROM vue_stats_journalier ORDER BY jour DESC LIMIT ${parseInt(days) || 30}`
  );
  res.json({
    stats: rows.map(s => ({
      jour:                    s.jour,
      nb_transactions:         parseInt(s.nb_transactions),
      nb_ventes:               parseInt(s.nb_ventes),
      nb_achats:               parseInt(s.nb_achats),
      benefices_visibles_jour: parseFloat(s.benefices_visibles_jour || 0),
      benefices_caches_jour:   parseFloat(s.benefices_caches_jour || 0),
      ventes_cachees:          parseInt(s.ventes_cachees || 0),
    }))
  });
}));

export default router;
