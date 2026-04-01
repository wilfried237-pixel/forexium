import express from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/settings
router.get('/', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM settings');
  const result = {};
  rows.forEach(s => { result[s.cle] = s.valeur; });
  res.json(result);
}));

// GET /api/settings/:key
router.get('/:key', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM settings WHERE cle = ?', [req.params.key]);
  if (rows.length === 0) return res.status(404).json({ error: 'Paramètre non trouvé' });
  res.json({ cle: rows[0].cle, valeur: rows[0].valeur, description: rows[0].description });
}));

// PUT /api/settings/:key
router.put('/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { valeur } = req.body;
  if (valeur === undefined) return res.status(400).json({ error: 'Valeur requise' });

  const existing = await query('SELECT id FROM settings WHERE cle = ?', [key]);
  if (existing.length === 0) return res.status(404).json({ error: 'Paramètre non trouvé' });

  await query('UPDATE settings SET valeur = ? WHERE cle = ?', [valeur, key]);
  await query(
    "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'settings', ?, ?)",
    [`LOG_${Date.now()}`, `Paramètre modifié: ${key}`, req.user.id]
  );
  res.json({ success: true, cle: key, valeur });
}));

export default router;
