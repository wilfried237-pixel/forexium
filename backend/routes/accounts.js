import express from 'express';
import { query, transaction as dbTransaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// COMPTES CLIENTS
// ─────────────────────────────────────────────────────────────

// GET /api/accounts/clients - Lister tous les clients
router.get('/clients', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT 
      cc.*,
      COUNT(t.id) as nb_transactions,
      SUM(CASE WHEN t.type = 'vente' THEN 1 ELSE 0 END) as nb_ventes,
      SUM(CASE WHEN t.type = 'achat' THEN 1 ELSE 0 END) as nb_achats
    FROM comptes_clients cc
    LEFT JOIN transactions t ON FIND_IN_SET(cc.nom, t.client) > 0 AND t.statut = 'committed'
    GROUP BY cc.id
    ORDER BY cc.nom ASC
  `);
  res.json({ clients: rows });
}));

// POST /api/accounts/clients - Créer un nouveau client
router.post('/clients', asyncHandler(async (req, res) => {
  const { nom, numero, adresse } = req.body;
  
  if (!nom || !numero) {
    return res.status(400).json({ error: 'Nom et numéro requis' });
  }

  const result = await query(
    'INSERT INTO comptes_clients (nom, numero, adresse) VALUES (?, ?, ?)',
    [nom, numero, adresse || null]
  );

  res.json({ success: true, client_id: result.insertId });
}));

// PUT /api/accounts/clients/:id - Modifier un client
router.put('/clients/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nom, numero, adresse, solde } = req.body;

  let sql = 'UPDATE comptes_clients SET ';
  const updates = [];
  const values = [];

  if (nom !== undefined) {
    updates.push('nom = ?');
    values.push(nom);
  }
  if (numero !== undefined) {
    updates.push('numero = ?');
    values.push(numero);
  }
  if (adresse !== undefined) {
    updates.push('adresse = ?');
    values.push(adresse);
  }
  if (solde !== undefined) {
    updates.push('solde = ?');
    values.push(solde);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucune modification' });
  }

  updates.push('updated_at = NOW()');
  sql += updates.join(', ') + ' WHERE id = ?';
  values.push(id);

  await query(sql, values);
  res.json({ success: true });
}));

// DELETE /api/accounts/clients/:id - Supprimer un client
router.delete('/clients/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM comptes_clients WHERE id = ?', [id]);
  res.json({ success: true });
}));

// GET /api/accounts/clients/:id/transactions - Historique d'un client
router.get('/clients/:id/transactions', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const client = await query('SELECT nom FROM comptes_clients WHERE id = ?', [id]);
  if (!client || client.length === 0) {
    return res.status(404).json({ error: 'Client non trouvé' });
  }

  const nom = client[0].nom;
  const transactions = await query(`
    SELECT 
      t.*,
      u.name as user_name,
      u.role as user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE FIND_IN_SET(?, t.client) > 0 AND t.statut = 'committed'
    ORDER BY t.date DESC
  `, [nom]);

  res.json({ transactions });
}));

// ─────────────────────────────────────────────────────────────
// COMPTES FOURNISSEURS
// ─────────────────────────────────────────────────────────────

// GET /api/accounts/fournisseurs - Lister tous les fournisseurs
router.get('/fournisseurs', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT 
      cf.*,
      COUNT(t.id) as nb_transactions,
      SUM(CASE WHEN t.type = 'vente' THEN 1 ELSE 0 END) as nb_ventes,
      SUM(CASE WHEN t.type = 'achat' THEN 1 ELSE 0 END) as nb_achats
    FROM comptes_fournisseurs cf
    LEFT JOIN transactions t ON t.id_fournisseur = cf.id AND t.statut = 'committed'
    GROUP BY cf.id
    ORDER BY cf.nom ASC
  `);
  res.json({ fournisseurs: rows });
}));

// POST /api/accounts/fournisseurs - Créer un nouveau fournisseur
router.post('/fournisseurs', asyncHandler(async (req, res) => {
  const { nom, numero, adresse } = req.body;
  
  if (!nom || !numero) {
    return res.status(400).json({ error: 'Nom et numéro requis' });
  }

  const result = await query(
    'INSERT INTO comptes_fournisseurs (nom, numero, adresse) VALUES (?, ?, ?)',
    [nom, numero, adresse || null]
  );

  res.json({ success: true, fournisseur_id: result.insertId });
}));

// PUT /api/accounts/fournisseurs/:id - Modifier un fournisseur
router.put('/fournisseurs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nom, numero, adresse, solde_xaf, solde_usdt, dette_usdt } = req.body;

  let sql = 'UPDATE comptes_fournisseurs SET ';
  const updates = [];
  const values = [];

  if (nom !== undefined) {
    updates.push('nom = ?');
    values.push(nom);
  }
  if (numero !== undefined) {
    updates.push('numero = ?');
    values.push(numero);
  }
  if (adresse !== undefined) {
    updates.push('adresse = ?');
    values.push(adresse);
  }
  if (solde_xaf !== undefined) {
    updates.push('solde_xaf = ?');
    values.push(solde_xaf);
  }
  if (solde_usdt !== undefined) {
    updates.push('solde_usdt = ?');
    values.push(solde_usdt);
  }
  if (dette_usdt !== undefined) {
    updates.push('dette_usdt = ?');
    values.push(dette_usdt);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucune modification' });
  }

  updates.push('updated_at = NOW()');
  sql += updates.join(', ') + ' WHERE id = ?';
  values.push(id);

  await query(sql, values);
  res.json({ success: true });
}));

// DELETE /api/accounts/fournisseurs/:id - Supprimer un fournisseur
router.delete('/fournisseurs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM comptes_fournisseurs WHERE id = ?', [id]);
  res.json({ success: true });
}));

// POST /api/accounts/fournisseurs/:id/payment - Paiement fournisseur (XAF ou USDT)
router.post('/fournisseurs/:id/payment', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { mode, montant } = req.body;

  if (!mode || !montant) {
    return res.status(400).json({ error: 'Mode et montant requis' });
  }

  if (!['xaf', 'usdt'].includes(mode)) {
    return res.status(400).json({ error: 'Mode invalide (xaf ou usdt)' });
  }

  await dbTransaction(async (conn) => {
    if (mode === 'xaf') {
      // Prélèvement caisse
      await conn.query(
        'UPDATE comptes SET montant = montant - ? WHERE type_compte = ?',
        [montant, 'caisse']
      );
      await conn.query(
        'UPDATE comptes_fournisseurs SET solde_xaf = solde_xaf - ? WHERE id = ?',
        [montant, id]
      );
    } else {
      // Remboursement USDT
      await conn.query(
        'UPDATE comptes_fournisseurs SET solde_usdt = solde_usdt - ? WHERE id = ?',
        [montant, id]
      );
    }

    // Log du paiement
    await conn.query(
      'INSERT INTO logs (id, date_heure, type_evenement, description) VALUES (?, NOW(), ?, ?)',
      [`LOG_${Date.now()}`, 'paiement_fournisseur', `Paiement ${mode.toUpperCase()} de ${montant} au fournisseur ${id}`]
    );
  });

  res.json({ success: true });
}));

// GET /api/accounts/fournisseurs/:id/transactions - Historique d'un fournisseur
router.get('/fournisseurs/:id/transactions', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const fournisseur = await query('SELECT nom FROM comptes_fournisseurs WHERE id = ?', [id]);
  if (!fournisseur || fournisseur.length === 0) {
    return res.status(404).json({ error: 'Fournisseur non trouvé' });
  }

  const transactions = await query(`
    SELECT 
      t.*,
      u.name as user_name,
      u.role as user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.id_fournisseur = ? AND t.statut = 'committed'
    ORDER BY t.date DESC
  `, [id]);

  res.json({ transactions });
}));

// ─────────────────────────────────────────────────────────────
// EXTRAITS DE COMPTE
// ─────────────────────────────────────────────────────────────

// GET /api/accounts/extrait/clients/:id - Extrait d'un client
router.get('/extrait/clients/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const extrait = await query(`
    SELECT 
      cc.id,
      cc.nom,
      cc.numero,
      cc.adresse,
      cc.solde,
      COUNT(t.id) as nb_transactions,
      SUM(CASE WHEN t.type = 'vente' THEN 1 ELSE 0 END) as nb_ventes,
      SUM(CASE WHEN t.montant_reste > 0 THEN 1 ELSE 0 END) as transactions_en_attente,
      cc.created_at,
      cc.updated_at
    FROM comptes_clients cc
    LEFT JOIN transactions t ON FIND_IN_SET(cc.nom, t.client) > 0 AND t.statut = 'committed'
    WHERE cc.id = ?
    GROUP BY cc.id
  `, [id]);

  if (!extrait || extrait.length === 0) {
    return res.status(404).json({ error: 'Client non trouvé' });
  }

  const transactions = await query(`
    SELECT 
      id,
      date,
      type,
      montant,
      montant_paye,
      montant_reste,
      surplus_client,
      statut,
      notes
    FROM transactions
    WHERE FIND_IN_SET(?, client) > 0 AND statut = 'committed'
    ORDER BY date DESC
  `, [extrait[0].nom]);

  res.json({ extrait: extrait[0], transactions });
}));

// GET /api/accounts/extrait/fournisseurs/:id - Extrait d'un fournisseur
router.get('/extrait/fournisseurs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const extrait = await query(`
    SELECT 
      cf.id,
      cf.nom,
      cf.numero,
      cf.adresse,
      cf.solde_xaf,
      cf.solde_usdt,
      cf.dette_usdt,
      COUNT(t.id) as nb_transactions,
      SUM(CASE WHEN t.type = 'vente' THEN 1 ELSE 0 END) as nb_ventes,
      SUM(CASE WHEN t.montant_reste > 0 THEN 1 ELSE 0 END) as transactions_en_attente,
      cf.created_at,
      cf.updated_at
    FROM comptes_fournisseurs cf
    LEFT JOIN transactions t ON t.id_fournisseur = cf.id AND t.statut = 'committed'
    WHERE cf.id = ?
    GROUP BY cf.id
  `, [id]);

  if (!extrait || extrait.length === 0) {
    return res.status(404).json({ error: 'Fournisseur non trouvé' });
  }

  const transactions = await query(`
    SELECT 
      id,
      date,
      type,
      montant,
      montant_paye,
      montant_reste,
      mode_paiement,
      statut,
      notes
    FROM transactions
    WHERE id_fournisseur = ? AND statut = 'committed'
    ORDER BY date DESC
  `, [id]);

  res.json({ extrait: extrait[0], transactions });
}));

export default router;
