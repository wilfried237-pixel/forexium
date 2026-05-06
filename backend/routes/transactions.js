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
      "SELECT * FROM transactions WHERE id = ? AND statut IN ('assoc_pending','porteur_pending','pending')", [id]
    );
    if (!rows || rows.length === 0)
      throw new Error('Transaction introuvable ou déjà validée (statut committed)');

    const tx = rows[0];

    await conn.query(
      "UPDATE transactions SET statut = 'committed', date_modification = NOW() WHERE id = ?", [id]
    );

    // Si c'est un achat en attente → mettre à jour le stock et débiter le compte maintenant
    if (tx.type === 'achat' && tx.devise === 'USDT') {
      const qte       = parseFloat(tx.quantite || 0);
      const prixTotal = parseFloat(tx.prix_achat_total || 0);
      const nouveauCmup = parseFloat(tx.nouveau_cmup || 0);
      const source    = tx.use_caisse ? 'caisse' : 'depot';

      await conn.query(
        'UPDATE stock SET quantite = quantite + ?, cmup = ? WHERE devise = ?',
        [qte, nouveauCmup, 'USDT']
      );
      await conn.query(
        'UPDATE comptes SET montant = montant - ? WHERE type_compte = ?',
        [prixTotal, source]
      );
    }

    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'validation', ?, ?)",
      [`LOG_${Date.now()}`, `Transaction validée par porteur: ${id} (type: ${tx.type})`, req.user.id]
    );
  });

  res.json({ success: true, transaction_id: id });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/transactions/:id/valider
// Validation générique d'une transaction (vente/achat)
// ─────────────────────────────────────────────────────────────
router.put('/:id/valider', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { payment_status, montant_paye } = req.body || {};

  await dbTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!rows || rows.length === 0) throw new Error('Transaction introuvable');
    const tx = rows[0];
    if (tx.statut === 'committed') throw new Error('Transaction déjà validée');

    // Mettre à committed
    await conn.query("UPDATE transactions SET statut = 'committed', date_modification = NOW() WHERE id = ?", [id]);

    // Si achat USDT : mise à jour stock et comptes
    if (tx.type === 'achat' && tx.devise === 'USDT') {
      const qte       = parseFloat(tx.quantite || 0);
      const prixTotal = parseFloat(tx.prix_achat_total || 0);
      const nouveauCmup = parseFloat(tx.nouveau_cmup || 0);
      const source    = tx.use_caisse ? 'caisse' : 'depot';

      await conn.query(
        'UPDATE stock SET quantite = quantite + ?, cmup = ? WHERE devise = ?',
        [qte, nouveauCmup, 'USDT']
      );
      await conn.query(
        'UPDATE comptes SET montant = montant - ? WHERE type_compte = ?',
        [prixTotal, source]
      );
    }

    // Si paiement partiel fourni, mettre à jour montants
    if (montant_paye !== undefined || payment_status !== undefined) {
      const montantPayeActuel = parseFloat(tx.montant_paye || 0);
      const nouveauMontantPaye = montant_paye !== undefined ? montantPayeActuel + parseFloat(montant_paye) : montantPayeActuel;
      const montantTotal = parseFloat(tx.montant || tx.valeur_vente_visible || 0);
      const montantReste = Math.max(0, montantTotal - nouveauMontantPaye);
      await conn.query(
        'UPDATE transactions SET montant_paye = ?, montant_reste = ?, payment_status = ? WHERE id = ?',
        [nouveauMontantPaye, montantReste, payment_status || tx.payment_status || null, id]
      );
    }

    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'validation', ?, ?)",
      [`LOG_${Date.now()}`, `Validation transaction: ${id} (type: ${tx.type})`, req.user.id]
    );
  });

  res.json({ success: true, transaction_id: id });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/transactions/:id/finaliser
// Finaliser une vente avec le taux caché réel
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

    // (NOTE) Tables `distribution` et `distribution_partenaires` SUPPRIMÉES.
    // Les bénéfices visible/caché et parts porteur/associé sont stockés
    // directement dans la table `transactions` ; les totaux sont calculés
    // par agrégation SQL dans /api/stats.

    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'finalisation', ?, ?)",
      [`LOG_${Date.now()}`, `Vente finalisée: ${id} — taux caché: ${tc}`, req.user.id]
    );
  });

  res.json({ success: true, transaction_id: id });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/transactions/:id/payment  — Paiement partiel client
// ─────────────────────────────────────────────────────────────
router.put('/:id/payment', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { montant_paye, surplus_client = 0 } = req.body;

  if (!montant_paye)
    return res.status(400).json({ error: 'Montant requis' });

  const [rows] = await query('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!rows || rows.length === 0)
    return res.status(404).json({ error: 'Transaction non trouvée' });

  const tx = rows[0];
  const montantPayeActuel  = parseFloat(tx.montant_paye || 0);
  const nouveauMontantPaye = montantPayeActuel + parseFloat(montant_paye);
  const montantTotal       = parseFloat(tx.montant || tx.valeur_vente_visible || 0);
  const montantReste       = Math.max(0, montantTotal - nouveauMontantPaye);

  await query(
    'UPDATE transactions SET montant_paye = ?, montant_reste = ?, surplus_client = ?, date_modification = NOW() WHERE id = ?',
    [nouveauMontantPaye, montantReste, parseFloat(surplus_client), id]
  );

  res.json({
    success: true,
    montant_paye: nouveauMontantPaye,
    montant_reste: montantReste,
    surplus_client: parseFloat(surplus_client),
  });
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
    idFournisseur:    'id_fournisseur',
    modePaiement:     'mode_paiement',
    montantPaye:      'montant_paye',
    montantReste:     'montant_reste',
    surplusClient:    'surplus_client',
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

  await dbTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!rows.length) throw new Error('Transaction introuvable');
    const original = rows[0];

    setClauses.push('date_modification = NOW()');
    params.push(id);
    await conn.query(`UPDATE transactions SET ${setClauses.join(', ')} WHERE id = ?`, params);

    if (original.type === 'vente' && changes.usdtConsomme !== undefined) {
      const ancienConso  = parseFloat(original.usdt_consomme || 0);
      const nouveauConso = parseFloat(changes.usdtConsomme);
      const deltaQte = ancienConso - nouveauConso;
      await conn.query(
        'UPDATE stock SET quantite = quantite + ? WHERE devise = ?',
        [deltaQte, 'USDT']
      );
    }

    if (original.type === 'achat' && original.devise === 'USDT' && changes.quantite !== undefined) {
      const ancienneQte  = parseFloat(original.quantite || 0);
      const nouvelleQte  = parseFloat(changes.quantite);
      const deltaQte     = nouvelleQte - ancienneQte;
      const nouveauTaux  = parseFloat(changes.taux || original.taux_achat_unitaire || 0);
      const nouveauPrix  = nouvelleQte * nouveauTaux;

      const [stockRows] = await conn.query(
        'SELECT quantite, cmup FROM stock WHERE devise = ?', ['USDT']
      );
      const stockActuel = parseFloat(stockRows[0]?.quantite || 0);
      const cmupActuel  = parseFloat(stockRows[0]?.cmup || 0);

      const valeurSansAncien = (stockActuel * cmupActuel) - (ancienneQte * parseFloat(original.taux_achat_unitaire || 0));
      const nouveauStockQte  = stockActuel + deltaQte;
      const nouveauCmup      = nouveauStockQte > 0
        ? (valeurSansAncien + nouveauPrix) / nouveauStockQte
        : 0;

      await conn.query(
        'UPDATE stock SET quantite = quantite + ?, cmup = ? WHERE devise = ?',
        [deltaQte, Math.max(0, nouveauCmup), 'USDT']
      );
      await conn.query(
        'UPDATE transactions SET nouveau_cmup = ?, prix_achat_total = ? WHERE id = ?',
        [Math.max(0, nouveauCmup), nouveauPrix, id]
      );
    }

    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'edition', ?, ?)",
      [`LOG_${Date.now()}`, `Transaction modifiée: ${id}`, req.user.id]
    );
  });

  res.json({ success: true, transaction_id: id });
}));

// ═════════════════════════════════════════════════════════════
// HANDLERS MÉTIER
// ═════════════════════════════════════════════════════════════

// ─── ACHAT USDT ───────────────────────────────────────────────
async function handleAchat(data, user) {
  const { quantite, taux_unitaire, use_caisse = false, fournisseur } = data;
  if (!quantite || !taux_unitaire)
    throw new Error('Quantité et taux unitaire requis');

  const qte       = parseFloat(quantite);
  const taux      = parseFloat(taux_unitaire);
  const prixTotal = qte * taux;
  const source    = use_caisse ? 'caisse' : 'depot';

  return await dbTransaction(async (conn) => {
    if (use_caisse) {
      const [caisseRows] = await conn.query(
        'SELECT montant FROM comptes WHERE type_compte = ?', ['caisse']
      );
      if (!caisseRows.length || parseFloat(caisseRows[0].montant) < prixTotal)
        throw new Error('Solde caisse insuffisant');
    }

    const [stockRows] = await conn.query(
      'SELECT quantite, cmup FROM stock WHERE devise = ?', ['USDT']
    );
    const stockActuel = stockRows.length ? parseFloat(stockRows[0].quantite) : 0;
    const cmupActuel  = stockRows.length ? parseFloat(stockRows[0].cmup)     : 0;

    const nouveauCmup = stockActuel <= 0
      ? taux
      : ((stockActuel * cmupActuel) + (qte * taux)) / (stockActuel + qte);

    const txId = `TX_${Date.now()}`;

    // Statut : porteur → committed immédiat; associé → assoc_pending (attente validation porteur)
    const isPorteurUser = user.role === 'porteur';
    const achatStatut   = isPorteurUser ? 'committed' : 'assoc_pending';

    await conn.query(`
      INSERT INTO transactions
        (id, user_id, type, devise, quantite, taux_achat_unitaire,
         prix_achat_total, use_caisse, ancien_cmup, nouveau_cmup, fournisseur, statut)
      VALUES (?, ?, 'achat', 'USDT', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, user.id, qte, taux, prixTotal, use_caisse ? 1 : 0,
       cmupActuel, nouveauCmup, fournisseur || null, achatStatut]
    );

    // Mettre à jour le stock et débiter le compte seulement si committed (porteur)
    if (isPorteurUser) {
      await conn.query(
        'UPDATE stock SET quantite = quantite + ?, cmup = ? WHERE devise = ?',
        [qte, nouveauCmup, 'USDT']
      );
      await conn.query(
        'UPDATE comptes SET montant = montant - ? WHERE type_compte = ?',
        [prixTotal, source]
      );
    }

    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'achat', ?, ?)",
      [`LOG_${Date.now()}`, `Achat USDT: ${qte} @ ${taux} XAF — Source: ${source}`, user.id]
    );

    return {
      success: true,
      message: achatStatut === 'committed' ? 'Achat enregistré' : 'Achat soumis — en attente de validation',
      transaction_id: txId,
      statut: achatStatut,
      nouveau_cmup: isPorteurUser ? nouveauCmup : null,
    };
  });
}

// ─── VENTE ────────────────────────────────────────────────────
async function handleVente(data, user) {
  const {
    devise_vente, taux_conversion, quantite_vente,
    taux_vente_visible, pct_porteur = 70, pct_associe = 30,
    client, taux_vente_cache = null,
    // Nouveaux champs v5.6.0+
    id_fournisseur  = null,
    mode_paiement   = 'xaf',
    montant_paye    = 0,
    surplus_client  = 0,
  } = data;

  if (!devise_vente || !taux_conversion || !quantite_vente || !taux_vente_visible || !client)
    throw new Error('Champs manquants pour la vente');

  return await dbTransaction(async (conn) => {
    const [stockRows] = await conn.query(
      'SELECT quantite, cmup FROM stock WHERE devise = ?', ['USDT']
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
    const montantPayeF = parseFloat(montant_paye);
    const montantReste = Math.max(0, valVenteV - montantPayeF);

    if (stockDispo < usdtConso)
      throw new Error(
        `Stock USDT insuffisant (disponible: ${stockDispo.toFixed(4)}, requis: ${usdtConso.toFixed(4)})`
      );

    const statut = taux_vente_cache
      ? 'committed'
      : (user.role === 'porteur' ? 'porteur_pending' : 'assoc_pending');

    const txId = `TX_${Date.now()}`;

    // Vérifier si les colonnes v5.6.0+ existent pour l'insertion
    // On essaie d'abord avec les nouvelles colonnes, fallback vers l'ancien INSERT
    try {
      await conn.query(`
        INSERT INTO transactions (
          id, user_id, type, devise_vente, taux_conversion, taux_achat_xaf,
          quantite_vente, taux_vente_visible, valeur_achat_xaf, valeur_vente_visible,
          benefice_visible, part_porteur_visible, part_associe_visible,
          pourcentage_porteur, pourcentage_associe, usdt_consomme, client,
          taux_vente_cache, statut,
          id_fournisseur, mode_paiement, montant_paye, montant_reste, surplus_client
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          txId, user.id, 'vente', devise_vente, conv, tauxAchatXAF,
          qteDevise, tvV, valAchat, valVenteV,
          benV, partPorteur, partAssocie,
          pctP, pctA, usdtConso, client,
          taux_vente_cache ? parseFloat(taux_vente_cache) : null, statut,
          id_fournisseur || null, mode_paiement,
          montantPayeF, montantReste, parseFloat(surplus_client),
        ]
      );
    } catch (colErr) {
      // Fallback: colonnes v5.6.0+ pas encore en base → INSERT sans elles
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
    }

    // Déduire le stock USDT immédiatement
    await conn.query(
      'UPDATE stock SET quantite = quantite - ? WHERE devise = ?',
      [usdtConso, 'USDT']
    );

    // (NOTE) Tables `distribution` / `distribution_partenaires` supprimées :
    // les parts porteur/associé sont déjà persistées dans `transactions`.

    // ── Gestion fournisseur USDT (paiement) ──
    if (id_fournisseur && mode_paiement === 'usdt') {
      try {
        const [fournRows] = await conn.query(
          'SELECT solde_usdt, dette_usdt FROM comptes_fournisseurs WHERE id = ?', [id_fournisseur]
        );
        if (fournRows.length) {
          const montantUsdt = usdtConso; // on utilise l'USDT consommé
          const soldeFourn  = parseFloat(fournRows[0].solde_usdt || 0);
          if (soldeFourn >= montantUsdt) {
            await conn.query(
              'UPDATE comptes_fournisseurs SET solde_usdt = solde_usdt - ? WHERE id = ?',
              [montantUsdt, id_fournisseur]
            );
          } else {
            const dette = montantUsdt - soldeFourn;
            await conn.query(
              'UPDATE comptes_fournisseurs SET solde_usdt = 0, dette_usdt = dette_usdt + ? WHERE id = ?',
              [dette, id_fournisseur]
            );
          }
        }
      } catch (fournErr) {
        console.warn('fournisseurs non disponible:', fournErr.message);
      }
    }

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
      // Tables distribution / distribution_partenaires supprimées :
      // les parts cachées sont stockées dans `transactions` ci-dessus.
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
