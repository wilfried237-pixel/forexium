import express from 'express';
import { query, transaction as dbTransaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// VALIDATIONS
// ─────────────────────────────────────────────────────────────
const validateNom       = (val) => /^[a-zA-ZÀ-ÿ0-9\s\-']+$/.test(val);
const validateVille     = (val) => /^[a-zA-ZÀ-ÿ\s\-']+$/.test(val);
const validateTelephone = (tel) => /^\+237[0-9]{9}$/.test(tel.replace(/\s/g, ''));

// ─────────────────────────────────────────────────────────────
// HELPERS — Agrégats par client / fournisseur
//   total_a_payer = SUM(montant)        WHERE type = 'payement_client' (ou 'payement_fournisseur')
//   total_paye    = SUM(montant_paye)   WHERE même type
//   reste         = total_a_payer - total_paye  (calculé en JS, pas stocké)
// ─────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════
// COMPTES CLIENTS
// ═════════════════════════════════════════════════════════════

// GET /api/accounts/clients
router.get('/clients', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT
      cc.*,
      COALESCE(agg.nb_transactions, 0)     AS nb_transactions,
      COALESCE(agg.nb_ventes, 0)           AS nb_ventes,
      COALESCE(agg.nb_paiements, 0)        AS nb_paiements,
      COALESCE(agg.total_a_payer, 0)       AS total_a_payer,
      COALESCE(agg.total_paye, 0)          AS total_paye,
      (COALESCE(agg.total_a_payer, 0) - COALESCE(agg.total_paye, 0)) AS reste
    FROM comptes_clients cc
    LEFT JOIN (
      SELECT
        cc2.id AS client_id,
        COUNT(t.id) AS nb_transactions,
        SUM(CASE WHEN t.type = 'vente' THEN 1 ELSE 0 END)            AS nb_ventes,
        SUM(CASE WHEN t.type = 'payement_client' THEN 1 ELSE 0 END)  AS nb_paiements,
        SUM(CASE WHEN t.type = 'payement_client' THEN IFNULL(t.montant, 0)      ELSE 0 END) AS total_a_payer,
        SUM(CASE WHEN t.type = 'payement_client' THEN IFNULL(t.montant_paye, 0) ELSE 0 END) AS total_paye
      FROM comptes_clients cc2
      LEFT JOIN transactions t
        ON (t.client_id = cc2.id OR FIND_IN_SET(cc2.nom, t.client) > 0)
       AND t.statut = 'committed'
      GROUP BY cc2.id
    ) agg ON agg.client_id = cc.id
    ORDER BY cc.nom ASC
  `);
  res.json({ clients: rows });
}));

// POST /api/accounts/clients
router.post('/clients', asyncHandler(async (req, res) => {
  const { nom, prenom, ville, adresse, telephone } = req.body;

  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  if (!validateNom(nom)) return res.status(400).json({ error: 'Nom invalide' });
  if (prenom && !validateNom(prenom)) return res.status(400).json({ error: 'Prénom invalide' });
  if (ville && !validateVille(ville)) return res.status(400).json({ error: 'La ville ne doit contenir que des lettres' });
  if (telephone && !validateTelephone(telephone)) return res.status(400).json({ error: 'Format téléphone invalide. Utiliser : +237 suivi de 9 chiffres' });

  const lastRows = await query("SELECT id FROM comptes_clients ORDER BY id DESC LIMIT 1");
  const nextId = lastRows && lastRows.length > 0 ? lastRows[0].id + 1 : 1;
  const numero = `CLT-${String(nextId).padStart(3, '0')}`;

  const result = await query(
    'INSERT INTO comptes_clients (nom, prenom, ville, adresse, telephone, numero) VALUES (?, ?, ?, ?, ?, ?)',
    [nom, prenom || null, ville || null, adresse || null, telephone || null, numero]
  );

  res.json({ success: true, client_id: result.insertId, numero });
}));

// PUT /api/accounts/clients/:id
router.put('/clients/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, ville, adresse, solde, telephone } = req.body;

  const updates = [];
  const values = [];

  if (nom !== undefined) {
    if (!validateNom(nom)) return res.status(400).json({ error: 'Nom invalide' });
    updates.push('nom = ?'); values.push(nom);
  }
  if (prenom !== undefined) {
    if (prenom && !validateNom(prenom)) return res.status(400).json({ error: 'Prénom invalide' });
    updates.push('prenom = ?'); values.push(prenom || null);
  }
  if (ville !== undefined) {
    if (ville && !validateVille(ville)) return res.status(400).json({ error: 'La ville ne doit contenir que des lettres' });
    updates.push('ville = ?'); values.push(ville || null);
  }
  if (adresse !== undefined) {
    updates.push('adresse = ?'); values.push(adresse);
  }
  if (solde !== undefined) {
    updates.push('solde = ?'); values.push(solde);
  }
  if (telephone !== undefined) {
    if (telephone && !validateTelephone(telephone))
      return res.status(400).json({ error: 'Format téléphone invalide. Utiliser : +237 suivi de 9 chiffres' });
    updates.push('telephone = ?'); values.push(telephone || null);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Aucune modification' });

  updates.push('updated_at = NOW()');
  await query(`UPDATE comptes_clients SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
  res.json({ success: true });
}));

// DELETE /api/accounts/clients/:id
router.delete('/clients/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM comptes_clients WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

// GET /api/accounts/clients/:id/transactions
router.get('/clients/:id/transactions', asyncHandler(async (req, res) => {
  const client = await query('SELECT nom FROM comptes_clients WHERE id = ?', [req.params.id]);
  if (!client || client.length === 0) return res.status(404).json({ error: 'Client non trouvé' });

  const transactions = await query(`
    SELECT t.*, u.name as user_name, u.role as user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE (t.client_id = ? OR FIND_IN_SET(?, t.client) > 0) AND t.statut = 'committed'
    ORDER BY t.date DESC
  `, [req.params.id, client[0].nom]);

  res.json({ transactions });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/accounts/clients/:id/payment
//   Enregistre un paiement client en tant que TRANSACTION
//   type = 'payement_client'
//   montant         = montant à payer (ce que le client devait régler)
//   montant_paye    = ce qu'il a effectivement payé
//   montant_reste   = montant - montant_paye  (stocké pour traçabilité, recalculable)
// ─────────────────────────────────────────────────────────────
router.post('/clients/:id/payment', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    montant_a_payer,
    montant_paye,
    mode_paiement = 'xaf',
    notes = null,
    date = null, // optionnel : permet de dater le paiement (sinon NOW())
  } = req.body;

  const aPay  = parseFloat(montant_a_payer);
  const paye  = parseFloat(montant_paye);

  if (isNaN(aPay) || aPay < 0)  return res.status(400).json({ error: 'Montant à payer invalide' });
  if (isNaN(paye) || paye < 0)  return res.status(400).json({ error: 'Montant payé invalide' });

  const client = await query('SELECT id, nom FROM comptes_clients WHERE id = ?', [id]);
  if (!client || client.length === 0) return res.status(404).json({ error: 'Client non trouvé' });

  const reste = Math.max(0, aPay - paye);
  let payment_status = 'unpaid';
  if (paye > 0 && reste > 0) payment_status = 'partial';
  else if (paye >= aPay && aPay > 0) payment_status = 'paid';

  const txId = `PC_${Date.now()}`;
  const dateClause = date ? ', date = ?' : '';
  const dateParam  = date ? [date] : [];

  await dbTransaction(async (conn) => {
    // 1) Insertion de la transaction de paiement
    await conn.query(
      `INSERT INTO transactions
         (id, user_id, type, client_id, client, montant, montant_paye, montant_reste,
          payment_status, mode_paiement, notes, statut${date ? ', date' : ''})
       VALUES (?, ?, 'payement_client', ?, ?, ?, ?, ?, ?, ?, ?, 'committed'${date ? ', ?' : ''})`,
      [txId, req.user.id, client[0].id, client[0].nom, aPay, paye, reste,
       payment_status, mode_paiement, notes, ...dateParam]
    );

    // 2) Si paiement en XAF → la caisse encaisse
    if (mode_paiement === 'xaf' && paye > 0) {
      await conn.query(
        'UPDATE comptes SET montant = montant + ? WHERE type_compte = ?',
        [paye, 'caisse']
      );
    }

    // 3) Mise à jour du solde du client (solde = total restant dû, info)
    await conn.query(
      'UPDATE comptes_clients SET solde = solde + ? - ?, updated_at = NOW() WHERE id = ?',
      [aPay, paye, id]
    );

    // 4) Log
    await conn.query(
      `INSERT INTO logs (id, date_heure, type_evenement, description, user_id)
       VALUES (?, NOW(), 'paiement_client', ?, ?)`,
      [`LOG_${Date.now()}`,
       `Paiement client ${client[0].nom} — à payer: ${aPay} / payé: ${paye} / reste: ${reste} (${mode_paiement})`,
       req.user.id]
    );
  });

  res.json({
    success: true,
    transaction_id: txId,
    montant_a_payer: aPay,
    montant_paye:    paye,
    reste,
    payment_status,
  });
}));

// ═════════════════════════════════════════════════════════════
// COMPTES FOURNISSEURS
// ═════════════════════════════════════════════════════════════

// GET /api/accounts/fournisseurs
router.get('/fournisseurs', asyncHandler(async (req, res) => {
  const rows = await query(`
    SELECT
      cf.*,
      COALESCE(agg.nb_transactions, 0)    AS nb_transactions,
      COALESCE(agg.nb_achats, 0)          AS nb_achats,
      COALESCE(agg.nb_paiements, 0)       AS nb_paiements,
      COALESCE(agg.total_a_payer, 0)      AS total_a_payer,
      COALESCE(agg.total_paye, 0)         AS total_paye,
      (COALESCE(agg.total_a_payer, 0) - COALESCE(agg.total_paye, 0)) AS reste
    FROM comptes_fournisseurs cf
    LEFT JOIN (
      SELECT
        cf2.id AS fournisseur_id,
        COUNT(t.id) AS nb_transactions,
        SUM(CASE WHEN t.type = 'achat' THEN 1 ELSE 0 END)                AS nb_achats,
        SUM(CASE WHEN t.type = 'payement_fournisseur' THEN 1 ELSE 0 END) AS nb_paiements,
        SUM(CASE WHEN t.type = 'payement_fournisseur' THEN IFNULL(t.montant, 0)      ELSE 0 END) AS total_a_payer,
        SUM(CASE WHEN t.type = 'payement_fournisseur' THEN IFNULL(t.montant_paye, 0) ELSE 0 END) AS total_paye
      FROM comptes_fournisseurs cf2
      LEFT JOIN transactions t ON t.id_fournisseur = cf2.id AND t.statut = 'committed'
      GROUP BY cf2.id
    ) agg ON agg.fournisseur_id = cf.id
    ORDER BY cf.nom ASC
  `);
  res.json({ fournisseurs: rows });
}));

// POST /api/accounts/fournisseurs
router.post('/fournisseurs', asyncHandler(async (req, res) => {
  const { nom, prenom, ville, adresse, telephone } = req.body;

  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  if (!validateNom(nom)) return res.status(400).json({ error: 'Nom invalide' });
  if (prenom && !validateNom(prenom)) return res.status(400).json({ error: 'Prénom invalide' });
  if (ville && !validateVille(ville)) return res.status(400).json({ error: 'La ville ne doit contenir que des lettres' });
  if (telephone && !validateTelephone(telephone)) return res.status(400).json({ error: 'Format téléphone invalide. Utiliser : +237 suivi de 9 chiffres' });

  const lastRows = await query("SELECT id FROM comptes_fournisseurs ORDER BY id DESC LIMIT 1");
  const nextId = lastRows && lastRows.length > 0 ? lastRows[0].id + 1 : 1;
  const numero = `FRN-${String(nextId).padStart(3, '0')}`;

  const result = await query(
    'INSERT INTO comptes_fournisseurs (nom, prenom, ville, adresse, telephone, numero) VALUES (?, ?, ?, ?, ?, ?)',
    [nom, prenom || null, ville || null, adresse || null, telephone || null, numero]
  );

  res.json({ success: true, fournisseur_id: result.insertId, numero });
}));

// PUT /api/accounts/fournisseurs/:id
router.put('/fournisseurs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, ville, adresse, solde_xaf, solde_usdt, dette_usdt, telephone } = req.body;

  const updates = [];
  const values = [];

  if (nom !== undefined) {
    if (!validateNom(nom)) return res.status(400).json({ error: 'Nom invalide' });
    updates.push('nom = ?'); values.push(nom);
  }
  if (prenom !== undefined) {
    if (prenom && !validateNom(prenom)) return res.status(400).json({ error: 'Prénom invalide' });
    updates.push('prenom = ?'); values.push(prenom || null);
  }
  if (ville !== undefined) {
    if (ville && !validateVille(ville)) return res.status(400).json({ error: 'La ville ne doit contenir que des lettres' });
    updates.push('ville = ?'); values.push(ville || null);
  }
  if (adresse !== undefined) {
    updates.push('adresse = ?'); values.push(adresse);
  }
  if (solde_xaf !== undefined) {
    updates.push('solde_xaf = ?'); values.push(solde_xaf);
  }
  if (solde_usdt !== undefined) {
    updates.push('solde_usdt = ?'); values.push(solde_usdt);
  }
  if (dette_usdt !== undefined) {
    updates.push('dette_usdt = ?'); values.push(dette_usdt);
  }
  if (telephone !== undefined) {
    if (telephone && !validateTelephone(telephone))
      return res.status(400).json({ error: 'Format téléphone invalide. Utiliser : +237 suivi de 9 chiffres' });
    updates.push('telephone = ?'); values.push(telephone || null);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Aucune modification' });

  updates.push('updated_at = NOW()');
  await query(`UPDATE comptes_fournisseurs SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
  res.json({ success: true });
}));

// DELETE /api/accounts/fournisseurs/:id
router.delete('/fournisseurs/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM comptes_fournisseurs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/accounts/fournisseurs/:id/payment
//   Enregistre un paiement fournisseur en tant que TRANSACTION
//   type = 'payement_fournisseur'
// ─────────────────────────────────────────────────────────────
router.post('/fournisseurs/:id/payment', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    montant_a_payer,
    montant_paye,
    mode_paiement = 'xaf',          // 'xaf' ou 'usdt'
    notes = null,
    date = null,
    // rétro-compatibilité avec ancien payload { mode, montant }
    mode,
    montant,
  } = req.body;

  // Rétro-compatibilité : si l'ancien format est utilisé, on considère que tout est payé
  const finalMode = mode_paiement || mode || 'xaf';
  const aPay = parseFloat(montant_a_payer ?? montant);
  const paye = parseFloat(montant_paye    ?? montant);

  if (isNaN(aPay) || aPay < 0) return res.status(400).json({ error: 'Montant à payer invalide' });
  if (isNaN(paye) || paye < 0) return res.status(400).json({ error: 'Montant payé invalide' });
  if (!['xaf', 'usdt'].includes(finalMode)) {
    return res.status(400).json({ error: 'Mode invalide (xaf ou usdt)' });
  }

  const fournisseur = await query('SELECT id, nom FROM comptes_fournisseurs WHERE id = ?', [id]);
  if (!fournisseur || fournisseur.length === 0) {
    return res.status(404).json({ error: 'Fournisseur non trouvé' });
  }

  const reste = Math.max(0, aPay - paye);
  let payment_status = 'unpaid';
  if (paye > 0 && reste > 0) payment_status = 'partial';
  else if (paye >= aPay && aPay > 0) payment_status = 'paid';

  const txId = `PF_${Date.now()}`;

  await dbTransaction(async (conn) => {
    await conn.query(
      `INSERT INTO transactions
         (id, user_id, type, id_fournisseur, fournisseur, montant, montant_paye, montant_reste,
          payment_status, mode_paiement, notes, statut${date ? ', date' : ''})
       VALUES (?, ?, 'payement_fournisseur', ?, ?, ?, ?, ?, ?, ?, ?, 'committed'${date ? ', ?' : ''})`,
      [txId, req.user.id, fournisseur[0].id, fournisseur[0].nom, aPay, paye, reste,
       payment_status, finalMode, notes, ...(date ? [date] : [])]
    );

    if (finalMode === 'xaf' && paye > 0) {
      // Caisse débitée, dette XAF du fournisseur diminuée
      await conn.query('UPDATE comptes SET montant = montant - ? WHERE type_compte = ?', [paye, 'caisse']);
      await conn.query('UPDATE comptes_fournisseurs SET solde_xaf = solde_xaf - ? WHERE id = ?', [paye, id]);
    } else if (finalMode === 'usdt' && paye > 0) {
      await conn.query('UPDATE comptes_fournisseurs SET solde_usdt = solde_usdt - ? WHERE id = ?', [paye, id]);
    }

    await conn.query(
      `INSERT INTO logs (id, date_heure, type_evenement, description, user_id)
       VALUES (?, NOW(), 'paiement_fournisseur', ?, ?)`,
      [`LOG_${Date.now()}`,
       `Paiement fournisseur ${fournisseur[0].nom} — à payer: ${aPay} / payé: ${paye} / reste: ${reste} (${finalMode})`,
       req.user.id]
    );
  });

  res.json({
    success: true,
    transaction_id: txId,
    montant_a_payer: aPay,
    montant_paye:    paye,
    reste,
    payment_status,
  });
}));

// GET /api/accounts/fournisseurs/:id/transactions
router.get('/fournisseurs/:id/transactions', asyncHandler(async (req, res) => {
  const fournisseur = await query('SELECT nom FROM comptes_fournisseurs WHERE id = ?', [req.params.id]);
  if (!fournisseur || fournisseur.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });

  const transactions = await query(`
    SELECT t.*, u.name as user_name, u.role as user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.id_fournisseur = ? AND t.statut = 'committed'
    ORDER BY t.date DESC
  `, [req.params.id]);

  res.json({ transactions });
}));

// ═════════════════════════════════════════════════════════════
// EXTRAITS DE COMPTE
//
// Renvoie pour un client/fournisseur :
//   - extrait      : infos du compte
//   - transactions : liste des paiements (type = 'payement_*') sur la période
//   - daily        : ventilation par jour { date, total_a_payer, total_paye, reste }
//   - totals       : { total_a_payer, total_paye, reste }
// ═════════════════════════════════════════════════════════════

// GET /api/accounts/extrait/clients/:id?date_debut=&date_fin=
router.get('/extrait/clients/:id', asyncHandler(async (req, res) => {
  const { date_debut, date_fin } = req.query;

  const extrait = await query(`
    SELECT cc.*,
      (SELECT COUNT(*) FROM transactions t
        WHERE (t.client_id = cc.id OR FIND_IN_SET(cc.nom, t.client) > 0)
          AND t.statut = 'committed') AS nb_transactions
    FROM comptes_clients cc WHERE cc.id = ?
  `, [req.params.id]);

  if (!extrait || extrait.length === 0) return res.status(404).json({ error: 'Client non trouvé' });

  const clientNom = extrait[0].nom;
  const baseWhere = `(t.client_id = ? OR FIND_IN_SET(?, t.client) > 0)
                     AND t.statut = 'committed'
                     AND t.type   = 'payement_client'`;
  const baseParams = [req.params.id, clientNom];

  let dateFilter = '';
  const params = [...baseParams];
  if (date_debut) { dateFilter += ' AND DATE(t.date) >= ?'; params.push(date_debut); }
  if (date_fin)   { dateFilter += ' AND DATE(t.date) <= ?'; params.push(date_fin); }

  // 1) Liste des paiements
  const transactions = await query(
    `SELECT t.id, t.date, t.type, t.montant AS montant_a_payer,
            IFNULL(t.montant_paye, 0)  AS montant_paye,
            (IFNULL(t.montant, 0) - IFNULL(t.montant_paye, 0)) AS reste,
            t.payment_status, t.mode_paiement, t.statut, t.notes
     FROM transactions t
     WHERE ${baseWhere}${dateFilter}
     ORDER BY t.date DESC`,
    params
  );

  // 2) Ventilation par jour
  const daily = await query(
    `SELECT DATE(t.date) AS jour,
            COUNT(*) AS nb_paiements,
            SUM(IFNULL(t.montant, 0))      AS total_a_payer,
            SUM(IFNULL(t.montant_paye, 0)) AS total_paye,
            (SUM(IFNULL(t.montant, 0)) - SUM(IFNULL(t.montant_paye, 0))) AS reste
     FROM transactions t
     WHERE ${baseWhere}${dateFilter}
     GROUP BY DATE(t.date)
     ORDER BY jour DESC`,
    params
  );

  // 3) Totaux globaux
  const totalsRows = await query(
    `SELECT COUNT(*) AS nb_paiements,
            SUM(IFNULL(t.montant, 0))      AS total_a_payer,
            SUM(IFNULL(t.montant_paye, 0)) AS total_paye,
            (SUM(IFNULL(t.montant, 0)) - SUM(IFNULL(t.montant_paye, 0))) AS reste
     FROM transactions t
     WHERE ${baseWhere}${dateFilter}`,
    params
  );

  res.json({
    extrait:      extrait[0],
    transactions,
    daily,
    totals: totalsRows[0] || { nb_paiements: 0, total_a_payer: 0, total_paye: 0, reste: 0 },
  });
}));

// GET /api/accounts/extrait/fournisseurs/:id?date_debut=&date_fin=
router.get('/extrait/fournisseurs/:id', asyncHandler(async (req, res) => {
  const { date_debut, date_fin } = req.query;

  const extrait = await query(`
    SELECT cf.*,
      (SELECT COUNT(*) FROM transactions t
        WHERE t.id_fournisseur = cf.id AND t.statut = 'committed') AS nb_transactions
    FROM comptes_fournisseurs cf WHERE cf.id = ?
  `, [req.params.id]);

  if (!extrait || extrait.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });

  const baseWhere = `t.id_fournisseur = ?
                     AND t.statut = 'committed'
                     AND t.type   = 'payement_fournisseur'`;
  const baseParams = [req.params.id];

  let dateFilter = '';
  const params = [...baseParams];
  if (date_debut) { dateFilter += ' AND DATE(t.date) >= ?'; params.push(date_debut); }
  if (date_fin)   { dateFilter += ' AND DATE(t.date) <= ?'; params.push(date_fin); }

  const transactions = await query(
    `SELECT t.id, t.date, t.type, t.montant AS montant_a_payer,
            IFNULL(t.montant_paye, 0)  AS montant_paye,
            (IFNULL(t.montant, 0) - IFNULL(t.montant_paye, 0)) AS reste,
            t.payment_status, t.mode_paiement, t.statut, t.notes
     FROM transactions t
     WHERE ${baseWhere}${dateFilter}
     ORDER BY t.date DESC`,
    params
  );

  const daily = await query(
    `SELECT DATE(t.date) AS jour,
            COUNT(*) AS nb_paiements,
            SUM(IFNULL(t.montant, 0))      AS total_a_payer,
            SUM(IFNULL(t.montant_paye, 0)) AS total_paye,
            (SUM(IFNULL(t.montant, 0)) - SUM(IFNULL(t.montant_paye, 0))) AS reste
     FROM transactions t
     WHERE ${baseWhere}${dateFilter}
     GROUP BY DATE(t.date)
     ORDER BY jour DESC`,
    params
  );

  const totalsRows = await query(
    `SELECT COUNT(*) AS nb_paiements,
            SUM(IFNULL(t.montant, 0))      AS total_a_payer,
            SUM(IFNULL(t.montant_paye, 0)) AS total_paye,
            (SUM(IFNULL(t.montant, 0)) - SUM(IFNULL(t.montant_paye, 0))) AS reste
     FROM transactions t
     WHERE ${baseWhere}${dateFilter}`,
    params
  );

  res.json({
    extrait:      extrait[0],
    transactions,
    daily,
    totals: totalsRows[0] || { nb_paiements: 0, total_a_payer: 0, total_paye: 0, reste: 0 },
  });
}));

export default router;
