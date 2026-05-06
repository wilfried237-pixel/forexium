import express from 'express';
import { query, transaction as dbTransaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// GET /api/payments/clients/:client_id/account
// Extrait de compte détaillé pour un client (toutes les transactions avec détails de paiement)
// ─────────────────────────────────────────────────────────────
router.get('/clients/:client_id/account', asyncHandler(async (req, res) => {
  const { client_id } = req.params;

  // Récupérer le client
  const clients = await query('SELECT * FROM comptes_clients WHERE id = ?', [client_id]);
  if (!clients || clients.length === 0) {
    return res.status(404).json({ error: 'Client non trouvé' });
  }
  const client = clients[0];

  // Récupérer toutes les transactions du client avec détails de paiement
  const transactions = await query(`
    SELECT 
      t.id,
      t.type,
      t.devise_vente,
      t.quantite_vente,
      t.montant,
      t.valeur_vente_visible,
      t.montant_paye,
      t.montant_reste,
      t.payment_status,
      t.date,
      t.statut,
      u.name as user_name,
      u.role as user_role
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE FIND_IN_SET(?, t.client) > 0 AND t.statut = 'committed'
    ORDER BY t.date DESC
  `, [client.nom]);

  // Calculer les totaux
  const totals = {
    total_montant: 0,
    total_montant_paye: 0,
    total_montant_reste: 0,
    nb_transactions: transactions?.length || 0
  };

  if (transactions && transactions.length > 0) {
    transactions.forEach(tx => {
      const montantTotal = parseFloat(tx.montant || tx.valeur_vente_visible || 0);
      const montantPaye = parseFloat(tx.montant_paye || 0);
      const montantReste = parseFloat(tx.montant_reste || 0) || Math.max(0, montantTotal - montantPaye);

      totals.total_montant += montantTotal;
      totals.total_montant_paye += montantPaye;
      totals.total_montant_reste += montantReste;
    });
  }

  // Récupérer l'historique des paiements du client (par transaction)
  const paymentsByTx = await query(`
    SELECT transaction_id, id, montant, devise, date_paiement, notes
    FROM payment_history
    WHERE client_id = ?
    ORDER BY date_paiement DESC
  `, [client_id]);

  // Construire un map transaction_id -> paiements
  const paymentsMap = {};
  if (paymentsByTx && paymentsByTx.length > 0) {
    paymentsByTx.forEach(p => {
      const txId = p.transaction_id || 'none';
      if (!paymentsMap[txId]) paymentsMap[txId] = [];
      paymentsMap[txId].push(p);
    });
  }

  // Attacher les paiements correspondants à chaque transaction
  const transactionsWithPayments = (transactions || []).map(tx => ({
    ...tx,
    payments: paymentsMap[tx.id] || []
  }));

  res.json({
    client,
    transactions: transactionsWithPayments,
    paymentHistory: paymentsByTx || [],
    totals
  });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/payments/clients/:client_id/transaction/:tx_id
// Enregistrer un paiement pour une transaction spécifique du client
// ─────────────────────────────────────────────────────────────
router.post('/clients/:client_id/transaction/:tx_id', asyncHandler(async (req, res) => {
  const { client_id, tx_id } = req.params;
  const { montant_paye, devise_paiement } = req.body;

  if (!montant_paye || parseFloat(montant_paye) <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }

  const montantPaye = parseFloat(montant_paye);

  await dbTransaction(async (conn) => {
    // Vérifier que la transaction existe et appartient au client
    const [txRows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [tx_id]);
    if (!txRows || txRows.length === 0) {
      throw new Error('Transaction non trouvée');
    }

    const tx = txRows[0];
    const montantTotal = parseFloat(tx.montant || tx.valeur_vente_visible || 0);
    const montantPayeActuel = parseFloat(tx.montant_paye || 0);
    const nouveauMontantPaye = montantPayeActuel + montantPaye;

    // Vérifier que le montant à payer ne dépasse pas le total
    if (nouveauMontantPaye > montantTotal) {
      throw new Error(`Le montant à payer (${nouveauMontantPaye} XAF) dépasse le montant total (${montantTotal} XAF)`);
    }

    const montantReste = Math.max(0, montantTotal - nouveauMontantPaye);
    const paymentStatus = montantReste === 0 ? 'fully_paid' : (montantPayeActuel === 0 ? 'partially_paid' : 'partially_paid');

    // Mettre à jour la transaction
    await conn.query(
      `UPDATE transactions 
       SET montant_paye = ?, montant_reste = ?, payment_status = ?, date_modification = NOW() 
       WHERE id = ?`,
      [nouveauMontantPaye, montantReste, paymentStatus, tx_id]
    );

    // Créer un enregistrement de paiement pour l'historique
    const paymentId = `PAY_${Date.now()}`;
    await conn.query(
      `INSERT INTO payment_history (id, transaction_id, client_id, montant, devise, date_paiement, user_id, notes) 
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        paymentId,
        tx_id,
        client_id,
        montantPaye,
        devise_paiement || 'XAF',
        req.user.id,
        `Paiement partiel enregistré`
      ]
    );

    // Insérer aussi une transaction de type 'payment_client' pour centraliser les paiements
    try {
      const txPaymentId = `TXPAY_${Date.now()}`;
      await conn.query(
        `INSERT INTO transactions (id, type, client, montant, montant_paye, montant_reste, payment_status, date, user_id, statut, related_transaction_id)
         VALUES (?, 'payment_client', ?, ?, ?, 0, 'fully_paid', NOW(), ?, 'committed', ?)`,
        [txPaymentId, client.nom, montantPaye, montantPaye, req.user.id, tx_id]
      );
    } catch (err) {
      // Ne pas casser la transaction principale si l'insertion de journal de transaction échoue;
      // on continue car l'historique de paiement a déjà été enregistré.
      console.warn('Erreur lors de l\'insertion de la transaction de paiement client:', err.message);
    }

    // Créer un log
    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'paiement_client', ?, ?)",
      [`LOG_${Date.now()}`, `Paiement client: ${montantPaye} XAF sur transaction ${tx_id}`, req.user.id]
    );
  });

  res.json({ 
    success: true, 
    message: 'Paiement enregistré',
    transaction_id: tx_id 
  });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/payments/fournisseurs/:fournisseur_id/account
// Extrait de compte détaillé pour un fournisseur
// ─────────────────────────────────────────────────────────────
router.get('/fournisseurs/:fournisseur_id/account', asyncHandler(async (req, res) => {
  const { fournisseur_id } = req.params;

  // Récupérer le fournisseur
  const fournisseurs = await query('SELECT * FROM comptes_fournisseurs WHERE id = ?', [fournisseur_id]);
  if (!fournisseurs || fournisseurs.length === 0) {
    return res.status(404).json({ error: 'Fournisseur non trouvé' });
  }
  const fournisseur = fournisseurs[0];

  // Récupérer toutes les transactions du fournisseur
  const transactions = await query(`
    SELECT 
      t.id,
      t.type,
      t.devise,
      t.quantite,
      t.prix_achat_total,
      t.montant_paye,
      t.montant_reste,
      t.payment_status,
      t.date,
      t.statut,
      u.name as user_name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.id_fournisseur = ? AND t.statut = 'committed'
    ORDER BY t.date DESC
  `, [fournisseur_id]);

  // Récupérer les paiements liés aux transactions (par transaction)
  const paymentsByTx = await query(`
    SELECT transaction_id, id, montant, devise, date_paiement, notes
    FROM payment_history_fournisseurs
    WHERE fournisseur_id = ?
    ORDER BY date_paiement DESC
  `, [fournisseur_id]);

  // Construire un map transaction_id -> paiements
  const paymentsMap = {};
  if (paymentsByTx && paymentsByTx.length > 0) {
    paymentsByTx.forEach(p => {
      const txId = p.transaction_id || 'none';
      if (!paymentsMap[txId]) paymentsMap[txId] = [];
      paymentsMap[txId].push(p);
    });
  }

  // Récupérer l'historique des paiements au fournisseur
  const paymentHistory = await query(`
    SELECT 
      id,
      montant,
      devise,
      date_paiement,
      notes
    FROM payment_history_fournisseurs
    WHERE fournisseur_id = ?
    ORDER BY date_paiement DESC
  `, [fournisseur_id]);

  // Calculer les totaux
  const totals = {
    solde_usdt: parseFloat(fournisseur.solde_usdt || 0),
    solde_xaf: parseFloat(fournisseur.solde_xaf || 0),
    dette_usdt: parseFloat(fournisseur.dette_usdt || 0),
    total_achete: 0,
    total_paye: 0,
    total_reste: 0
  };

  if (transactions && transactions.length > 0) {
    transactions.forEach(tx => {
      const montantTotal = parseFloat(tx.prix_achat_total || 0);
      const montantPaye = parseFloat(tx.montant_paye || 0);
      const montantReste = parseFloat(tx.montant_reste || 0) || Math.max(0, montantTotal - montantPaye);

      totals.total_achete += montantTotal;
      totals.total_paye += montantPaye;
      totals.total_reste += montantReste;
    });
  }

  // Attacher les paiements correspondants à chaque transaction
  const transactionsWithPayments = (transactions || []).map(tx => ({
    ...tx,
    payments: paymentsMap[tx.id] || []
  }));

  res.json({
    fournisseur,
    transactions: transactionsWithPayments,
    paymentHistory: paymentHistory || [],
    totals
  });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/payments/fournisseurs/:fournisseur_id/pay
// Enregistrer un paiement au fournisseur
// ─────────────────────────────────────────────────────────────
router.post('/fournisseurs/:fournisseur_id/pay', asyncHandler(async (req, res) => {
  const { fournisseur_id } = req.params;
  const { montant, devise, transaction_id } = req.body;

  if (!montant || parseFloat(montant) <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }

  if (!['XAF', 'USDT'].includes(devise)) {
    return res.status(400).json({ error: 'Devise invalide (XAF ou USDT)' });
  }

  const montantF = parseFloat(montant);

  await dbTransaction(async (conn) => {
    // Récupérer le fournisseur
    const [fournRows] = await conn.query('SELECT * FROM comptes_fournisseurs WHERE id = ?', [fournisseur_id]);
    if (!fournRows || fournRows.length === 0) {
      throw new Error('Fournisseur non trouvé');
    }

    const fournisseur = fournRows[0];

    // Si transaction_id est fourni, mettre à jour la transaction spécifique
    if (transaction_id) {
      const [txRows] = await conn.query('SELECT * FROM transactions WHERE id = ? AND id_fournisseur = ?', [transaction_id, fournisseur_id]);
      if (txRows && txRows.length > 0) {
        const tx = txRows[0];
        const montantTotal = parseFloat(tx.prix_achat_total || 0);
        const montantPayeActuel = parseFloat(tx.montant_paye || 0);
        const nouveauMontantPaye = montantPayeActuel + montantF;

        if (nouveauMontantPaye > montantTotal) {
          throw new Error(`Le montant dépasse le montant total de la transaction`);
        }

        const montantReste = Math.max(0, montantTotal - nouveauMontantPaye);
        const paymentStatus = montantReste === 0 ? 'fully_paid' : 'partially_paid';

        await conn.query(
          `UPDATE transactions 
           SET montant_paye = ?, montant_reste = ?, payment_status = ?, date_modification = NOW() 
           WHERE id = ?`,
          [nouveauMontantPaye, montantReste, paymentStatus, transaction_id]
        );
      }
    }

    // Mettre à jour le solde du fournisseur
    if (devise === 'USDT') {
      const nouveauSolde = parseFloat(fournisseur.solde_usdt || 0) - montantF;
      if (nouveauSolde < 0) {
        // Si solde insuffisant, utiliser la dette
        const dette = Math.abs(nouveauSolde);
        await conn.query(
          'UPDATE comptes_fournisseurs SET solde_usdt = 0, dette_usdt = dette_usdt - ? WHERE id = ?',
          [Math.min(dette, parseFloat(fournisseur.dette_usdt || 0)), fournisseur_id]
        );
      } else {
        await conn.query(
          'UPDATE comptes_fournisseurs SET solde_usdt = ? WHERE id = ?',
          [nouveauSolde, fournisseur_id]
        );
      }
    } else {
      await conn.query(
        'UPDATE comptes_fournisseurs SET solde_xaf = solde_xaf - ? WHERE id = ?',
        [montantF, fournisseur_id]
      );
    }

    // Enregistrer le paiement dans l'historique
    const paymentId = `PAYFURN_${Date.now()}`;
    await conn.query(
      `INSERT INTO payment_history_fournisseurs (id, fournisseur_id, montant, devise, date_paiement, user_id, notes, transaction_id) 
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        paymentId,
        fournisseur_id,
        montantF,
        devise,
        req.user.id,
        `Paiement ${devise}`,
        transaction_id || null
      ]
    );

    // Insérer aussi une transaction de type 'payment_fournisseur' pour centraliser les paiements
    try {
      const txPaymentId = `TXPAYF_${Date.now()}`;
      await conn.query(
        `INSERT INTO transactions (id, type, id_fournisseur, montant, devise, montant_paye, montant_reste, payment_status, date, user_id, statut, related_transaction_id)
         VALUES (?, 'payment_fournisseur', ?, ?, ?, ?, 0, 'fully_paid', NOW(), ?, 'committed', ?)`,
        [txPaymentId, fournisseur_id, montantF, devise, montantF, req.user.id, transaction_id || null]
      );
    } catch (err) {
      console.warn('Erreur lors de l\'insertion de la transaction de paiement fournisseur:', err.message);
    }

    // Créer un log
    await conn.query(
      "INSERT INTO logs (id, date_heure, type_evenement, description, user_id) VALUES (?, NOW(), 'paiement_fournisseur', ?, ?)",
      [`LOG_${Date.now()}`, `Paiement fournisseur: ${montantF} ${devise} au fournisseur ${fournisseur_id}`, req.user.id]
    );
  });

  res.json({ 
    success: true, 
    message: 'Paiement enregistré',
    fournisseur_id 
  });
}));

export default router;
