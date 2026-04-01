import express from 'express';
import { query, transaction as dbTransaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// GET /api/transactions
// ─────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const { limit = 500, type, statut } = req.query;

  let sql = `
    SELECT t.*, u.name AS user_name, u.role AS user_role, u.email AS user_email
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE 1=1`;
  const params = [];

  if (type)   { sql += ' AND t.type = ?';   params.push(type); }
  if (statut) { sql += ' AND t.statut = ?'; params.push(statut); }
  sql += ` ORDER BY t.date DESC LIMIT ${parseInt(limit) || 500}`;

  const rows = await query(sql, params);
  res.json({ transactions: rows });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/transactions
// ─────────────────────────────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { type, ...data } = req.body;
  if (!type) return res.status(400).json({ error: 'Type requis' });

  let result;
  switch (type) {
    case 'achat':     result = await handleAchat(data, req.user);     break;
    case 'vente':     result = await handleVente(data, req.user);     break;
    case 'depense':   result = await handleDepense(data, req.user);   break;
    case 'retrait':   result = await handleRetrait(data, req.user);   break;
    case 'versement': result = await handleVersement(data, req.user); break;
    default: return res.status(400).json({ error: 'Type invalide' });
  }
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/transactions/:id/valider-assoc
// Porteur valide une vente assoc_pending → committed
// ─────────────────────────────────────────────────────────────
router.put('/:id/valider-assoc', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await dbTransaction(async (conn) => {
    const [rows] = await conn.query(
      "SELECT * FROM transactions WHERE id = ? AND statut = 'assoc_pending'", [id]
    );
    if (!rows || rows.length === 0)
      throw new Error('Transaction introuvable ou déjà validée');

    await conn.query(
      "UPDATE transactions SET statut = 'committed', date_modification = NOW() WHERE id = ?", [id]
    );
    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'validation', ?, ?)",
      [`LOG_${Date.now()}`, `Vente associé validée par porteur: ${id}`, req.user.id]
    );
  });

  res.json({ success: true, transaction_id: id });
}));

// Finaliser une vente porteur_pending avec le taux caché réel
// ─────────────────────────────────────────────────────────────
router.put('/:id/finaliser', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { taux_vente_cache, pct_porteur = 70, pct_associe = 30 } = req.body;

  if (!taux_vente_cache)
    return res.status(400).json({ error: 'Taux caché requis' });

  const tc   = parseFloat(taux_vente_cache);
  const pctP = parseInt(pct_porteur);
  const pctA = parseInt(pct_associe);

  await dbTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT * FROM transactions WHERE id = ? AND type = ?', [id, 'vente']
    );
    if (!rows || rows.length === 0)
      throw new Error('Transaction non trouvée');

    const tx        = rows[0];
    const qteDevise = parseFloat(tx.quantite_vente);
    const valAchat  = parseFloat(tx.valeur_achat_xaf);
    const valVenteC = qteDevise * tc;
    const benC      = valVenteC - valAchat;
    const partPC    = benC * (pctP / 100);
    const partAC    = benC * (pctA / 100);

    await conn.query(`
      UPDATE transactions SET
        taux_vente_cache    = ?,
        valeur_vente_cachee = ?,
        benefice_cache      = ?,
        part_porteur_cachee = ?,
        part_associe_cachee = ?,
        pourcentage_porteur = ?,
        pourcentage_associe = ?,
        statut              = 'committed',
        date_modification   = NOW()
      WHERE id = ?`,
      [tc, valVenteC, benC, partPC, partAC, pctP, pctA, id]
    );

    await conn.query(
      'UPDATE repartition_profits SET total_accumule_cache = total_accumule_cache + ? WHERE role = ?',
      [partPC, 'porteur']
    );
    await conn.query(
      'UPDATE repartition_profits SET total_accumule_cache = total_accumule_cache + ? WHERE role = ?',
      [partAC, 'associe']
    );
    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'finalisation', ?, ?)",
      [`LOG_${Date.now()}`, `Vente finalisée: ${id} — taux caché: ${tc}`, req.user.id]
    );
  });

  res.json({ success: true, transaction_id: id });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/transactions/:id — modifier une transaction
// ─────────────────────────────────────────────────────────────
router.put('/:id', asyncHandler(async (req, res) => {
  const { id }  = req.params;
  const changes = req.body;

  const fieldMap = {
    client:           'client',
    fournisseur:      'fournisseur',
    beneficiaire:     'beneficiaire',
    description:      'notes',
    tauxConversion:   'taux_conversion',
    tauxVisible:      'taux_vente_visible',
    tauxAchatXAF:     'taux_achat_xaf',
    quantiteDevise:   'quantite_vente',
    usdtConsomme:     'usdt_consomme',
    quantite:         'quantite',
    taux:             'taux_achat_unitaire',
    montant:          'montant',
    tauxCache:        'taux_vente_cache',
    valeurVenteCachee:'valeur_vente_cachee',
    beneficeCachee:   'benefice_cache',
    partPorteurCache: 'part_porteur_cachee',
    partAssocieCache: 'part_associe_cachee',
    porteurPctCache:  'pourcentage_porteur',
    statut:           'statut',
    deviseVente:      'devise_vente',
  };

  const setClauses = [];
  const params     = [];

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (changes[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = ?`);
      params.push(changes[jsKey]);
    }
  }

  if (setClauses.length === 0)
    return res.status(400).json({ error: 'Aucun champ à modifier' });

  setClauses.push('date_modification = NOW()');
  params.push(id);

  await query(`UPDATE transactions SET ${setClauses.join(', ')} WHERE id = ?`, params);
  await query(
    "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'edition', ?, ?)",
    [`LOG_${Date.now()}`, `Transaction modifiée: ${id}`, req.user.id]
  );

  res.json({ success: true, transaction_id: id });
}));

// ═════════════════════════════════════════════════════════════
// HANDLERS MÉTIER
// ═════════════════════════════════════════════════════════════

// ─── ACHAT USDT ───────────────────────────────────────────────
// Règle : pas de plafond pour le dépôt (financement libre).
//         La caisse a un plafond réel.
//         On n'utilise plus la procédure stockée proc_achat_usdt.
async function handleAchat(data, user) {
  const { quantite, taux_unitaire, use_caisse = false, fournisseur } = data;
  if (!quantite || !taux_unitaire)
    throw new Error('Quantité et taux unitaire requis');

  const qte       = parseFloat(quantite);
  const taux      = parseFloat(taux_unitaire);
  const prixTotal = qte * taux;
  const source    = use_caisse ? 'caisse' : 'depot';

  return await dbTransaction(async (conn) => {
    // Vérifier solde caisse uniquement (dépôt = pas de plafond)
    if (use_caisse) {
      const [caisseRows] = await conn.query(
        'SELECT montant FROM comptes WHERE type_compte = ?', ['caisse']
      );
      if (!caisseRows.length || parseFloat(caisseRows[0].montant) < prixTotal)
        throw new Error('Solde caisse insuffisant');
    }

    // Lire stock pour CMUP
    const [stockRows] = await conn.query(
      'SELECT quantite, cmup FROM stock_devises WHERE devise = ?', ['USDT']
    );
    const stockActuel = stockRows.length ? parseFloat(stockRows[0].quantite) : 0;
    const cmupActuel  = stockRows.length ? parseFloat(stockRows[0].cmup)     : 0;

    // Calcul CMUP pondéré
    const nouveauCmup = stockActuel <= 0
      ? taux
      : ((stockActuel * cmupActuel) + (qte * taux)) / (stockActuel + qte);

    const txId = `TX_${Date.now()}`;

    await conn.query(`
      INSERT INTO transactions
        (id, user_id, type, devise, quantite, taux_achat_unitaire,
         prix_achat_total, use_caisse, ancien_cmup, nouveau_cmup, fournisseur, statut)
      VALUES (?, ?, 'achat', 'USDT', ?, ?, ?, ?, ?, ?, ?, 'committed')`,
      [txId, user.id, qte, taux, prixTotal, use_caisse ? 1 : 0,
       cmupActuel, nouveauCmup, fournisseur || null]
    );

    // Mettre à jour stock USDT
    await conn.query(
      'UPDATE stock_devises SET quantite = quantite + ?, cmup = ? WHERE devise = ?',
      [qte, nouveauCmup, 'USDT']
    );

    // Débiter le compte source
    await conn.query(
      'UPDATE comptes SET montant = montant - ? WHERE type_compte = ?',
      [prixTotal, source]
    );

    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'achat', ?, ?)",
      [`LOG_${Date.now()}`, `Achat USDT: ${qte} @ ${taux} XAF — Source: ${source}`, user.id]
    );

    return {
      success: true,
      message: 'Achat enregistré',
      transaction_id: txId,
      nouveau_cmup: nouveauCmup,
    };
  });
}

// ─── VENTE ────────────────────────────────────────────────────
// Stock toujours déduit immédiatement. Pas de dépendance au trigger SQL.
async function handleVente(data, user) {
  const {
    devise_vente, taux_conversion, quantite_vente,
    taux_vente_visible, pct_porteur = 70, pct_associe = 30,
    client, taux_vente_cache = null,
  } = data;

  if (!devise_vente || !taux_conversion || !quantite_vente || !taux_vente_visible || !client)
    throw new Error('Champs manquants pour la vente');

  return await dbTransaction(async (conn) => {
    const [stockRows] = await conn.query(
      'SELECT quantite, cmup FROM stock_devises WHERE devise = ?', ['USDT']
    );
    if (!stockRows.length) throw new Error('Stock USDT introuvable');

    const stockDispo   = parseFloat(stockRows[0].quantite);
    const cmup         = parseFloat(stockRows[0].cmup);
    const conv         = parseFloat(taux_conversion);
    const qteDevise    = parseFloat(quantite_vente);
    const tvV          = parseFloat(taux_vente_visible);
    const usdtConso    = qteDevise / conv;
    const tauxAchatXAF = cmup / conv;
    const valAchat     = usdtConso * cmup;
    const valVenteV    = qteDevise * tvV;
    const benV         = valVenteV - valAchat;
    const pctP         = parseFloat(pct_porteur);
    const pctA         = parseFloat(pct_associe);
    const partPorteur  = benV * (pctP / 100);
    const partAssocie  = benV * (pctA / 100);

    if (stockDispo < usdtConso)
      throw new Error(
        `Stock USDT insuffisant (disponible: ${stockDispo.toFixed(4)}, requis: ${usdtConso.toFixed(4)})`
      );

    const statut = taux_vente_cache
      ? 'committed'
      : (user.role === 'porteur' ? 'porteur_pending' : 'assoc_pending');

    const txId = `TX_${Date.now()}`;

    await conn.query(`
      INSERT INTO transactions (
        id, user_id, type, devise_vente, taux_conversion, taux_achat_xaf,
        quantite_vente, taux_vente_visible, valeur_achat_xaf, valeur_vente_visible,
        benefice_visible, part_porteur_visible, part_associe_visible,
        pourcentage_porteur, pourcentage_associe, usdt_consomme, client,
        taux_vente_cache, statut
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        txId, user.id, 'vente', devise_vente, conv, tauxAchatXAF,
        qteDevise, tvV, valAchat, valVenteV,
        benV, partPorteur, partAssocie,
        pctP, pctA, usdtConso, client,
        taux_vente_cache ? parseFloat(taux_vente_cache) : null, statut,
      ]
    );

    // Déduire le stock USDT immédiatement (tous statuts)
    await conn.query(
      'UPDATE stock_devises SET quantite = quantite - ? WHERE devise = ?',
      [usdtConso, 'USDT']
    );

    // Créditer la caisse avec la valeur visible
    await conn.query(
      'UPDATE comptes SET montant = montant + ? WHERE type_compte = ?',
      [valVenteV, 'caisse']
    );

    // Répartition visible
    await conn.query(
      'UPDATE repartition_profits SET total_accumule_visible = total_accumule_visible + ? WHERE role = ?',
      [partPorteur, 'porteur']
    );
    await conn.query(
      'UPDATE repartition_profits SET total_accumule_visible = total_accumule_visible + ? WHERE role = ?',
      [partAssocie, 'associe']
    );

    // Si taux caché fourni dès la vente → enregistrer les données cachées aussi
    if (taux_vente_cache) {
      const tc        = parseFloat(taux_vente_cache);
      const valVenteC = qteDevise * tc;
      const benC      = valVenteC - valAchat;
      const partPC    = benC * (pctP / 100);
      const partAC    = benC * (pctA / 100);

      await conn.query(`
        UPDATE transactions SET
          valeur_vente_cachee = ?,
          benefice_cache      = ?,
          part_porteur_cachee = ?,
          part_associe_cachee = ?
        WHERE id = ?`,
        [valVenteC, benC, partPC, partAC, txId]
      );
      await conn.query(
        'UPDATE repartition_profits SET total_accumule_cache = total_accumule_cache + ? WHERE role = ?',
        [partPC, 'porteur']
      );
      await conn.query(
        'UPDATE repartition_profits SET total_accumule_cache = total_accumule_cache + ? WHERE role = ?',
        [partAC, 'associe']
      );
    }

    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'vente', ?, ?)",
      [`LOG_${Date.now()}`, `Vente ${devise_vente}: ${qteDevise} — Client: ${client} — ${statut}`, user.id]
    );

    return { success: true, message: 'Vente enregistrée', transaction_id: txId, statut };
  });
}

// ─── DÉPENSE ──────────────────────────────────────────────────
async function handleDepense(data, user) {
  const { montant, categorie, description } = data;
  if (!montant || !categorie) throw new Error('Montant et catégorie requis');

  const montantF = parseFloat(montant);

  return await dbTransaction(async (conn) => {
    const [caisseRows] = await conn.query(
      'SELECT montant FROM comptes WHERE type_compte = ?', ['caisse']
    );
    if (!caisseRows.length || parseFloat(caisseRows[0].montant) < montantF)
      throw new Error('Solde caisse insuffisant');

    const txId = `TX_${Date.now()}`;

    await conn.query(
      "INSERT INTO transactions (id, user_id, type, montant, categorie, notes, statut) VALUES (?, ?, 'depense', ?, ?, ?, 'committed')",
      [txId, user.id, montantF, categorie, description || null]
    );
    await conn.query(
      'UPDATE comptes SET montant = montant - ? WHERE type_compte = ?',
      [montantF, 'caisse']
    );
    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'depense', ?, ?)",
      [`LOG_${Date.now()}`, `Dépense: ${categorie} — ${montantF} XAF`, user.id]
    );

    return { success: true, message: 'Dépense enregistrée', transaction_id: txId };
  });
}

// ─── RETRAIT ──────────────────────────────────────────────────
async function handleRetrait(data, user) {
  const { montant, beneficiaire } = data;
  if (!montant || !beneficiaire) throw new Error('Montant et bénéficiaire requis');

  const montantF = parseFloat(montant);

  return await dbTransaction(async (conn) => {
    const [caisseRows] = await conn.query(
      'SELECT montant FROM comptes WHERE type_compte = ?', ['caisse']
    );
    if (!caisseRows.length || parseFloat(caisseRows[0].montant) < montantF)
      throw new Error('Solde caisse insuffisant');

    const txId = `TX_${Date.now()}`;

    await conn.query(
      "INSERT INTO transactions (id, user_id, type, montant, beneficiaire, statut) VALUES (?, ?, 'retrait', ?, ?, 'committed')",
      [txId, user.id, montantF, beneficiaire]
    );
    await conn.query(
      'UPDATE comptes SET montant = montant - ? WHERE type_compte = ?',
      [montantF, 'caisse']
    );
    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'retrait', ?, ?)",
      [`LOG_${Date.now()}`, `Retrait: ${beneficiaire} — ${montantF} XAF`, user.id]
    );

    return { success: true, message: 'Retrait enregistré', transaction_id: txId };
  });
}

// ─── VERSEMENT (alimentation caisse) ─────────────────────────
async function handleVersement(data, user) {
  const { montant } = data;
  if (!montant) throw new Error('Montant requis');

  const montantF = parseFloat(montant);

  return await dbTransaction(async (conn) => {
    const txId = `TX_${Date.now()}`;

    await conn.query(
      "INSERT INTO transactions (id, user_id, type, montant, statut) VALUES (?, ?, 'versement', ?, 'committed')",
      [txId, user.id, montantF]
    );
    await conn.query(
      'UPDATE comptes SET montant = montant + ? WHERE type_compte = ?',
      [montantF, 'caisse']
    );
    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'versement', ?, ?)",
      [`LOG_${Date.now()}`, `Versement caisse: ${montantF} XAF`, user.id]
    );

    return { success: true, message: 'Versement enregistré', transaction_id: txId };
  });
}

export default router;
