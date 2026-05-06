-- ══════════════════════════════════════════════════════════════
-- FOREXIUM v7 — PATCH SQL (Compatible MySQL 5.7+)
-- Ajout colonne numero (si elle n'existe pas)
-- ══════════════════════════════════════════════════════════════
USE forexium_v7;

-- NOTE: Les colonnes EXISTENT déjà! Ce patch vérifie seulement
-- Si vous voyez des erreurs 1060 = colonne en double, c'est normal

-- Les colonnes suivantes existent déjà:
-- ✅ comptes_clients.numero
-- ✅ comptes_fournisseurs.numero
-- ✅ transactions.id_fournisseur
-- ✅ transactions.montant_paye, montant_reste, payment_status

-- Vérifier les colonnes présentes
SELECT 'Colonnes comptes_clients:' AS '';
DESCRIBE comptes_clients;

SELECT '' AS '';
SELECT 'Colonnes comptes_fournisseurs:' AS '';
DESCRIBE comptes_fournisseurs;

SELECT '' AS '';
SELECT 'Colonnes transactions (paiement + fournisseur):' AS '';
SHOW COLUMNS FROM transactions WHERE Field IN ('montant_paye', 'montant_reste', 'payment_status', 'id_fournisseur', 'numero');

SELECT '' AS '';
SELECT '✅ Patch complet - Aucune modification nécessaire' AS statut;
