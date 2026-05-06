-- ============================================================
--  FOREXIUM — SCRIPT DE RÉINITIALISATION DES DONNÉES
--  Compatible MySQL 5.6 / 5.7
--  Efface toutes les données, conserve la structure et les users
--  Exécuter : mysql -u root -p forexium_v7 < reset_forexium.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── Transactions & mouvements ────────────────────────────────
TRUNCATE TABLE transactions;
TRUNCATE TABLE logs;

-- ── Stock USDT remis à zéro ──────────────────────────────────
UPDATE stock SET quantite = 0, cmup = 0;

-- ── Comptes (dépôt & caisse) : valeurs initiales ────────────
UPDATE comptes SET montant = 1000000 WHERE type_compte = 'depot';
UPDATE comptes SET montant = 500000  WHERE type_compte = 'caisse';

-- ── Distribution des profits remise à zéro ──────────────────
UPDATE repartition_profits
   SET total_accumule_visible = 0,
       total_accumule_cache   = 0;

-- (Tables `distribution` et `distribution_partenaires` SUPPRIMÉES —
--  toutes les répartitions vivent désormais dans la table `transactions`.)

-- ── Clients : soldes remis à zéro ───────────────────────────
-- (les fiches clients sont CONSERVÉES, seulement les soldes)
UPDATE comptes_clients SET solde = 0;

-- ── Fournisseurs : soldes remis à zéro ──────────────────────
-- (les fiches fournisseurs sont CONSERVÉES)
UPDATE comptes_fournisseurs
   SET solde_xaf  = 0,
       solde_usdt = 0,
       dette_usdt = 0;

-- ── Devises personnalisées : garder seulement les défauts ───
DELETE FROM devises_personnalisees WHERE is_default = 0;
DELETE FROM devises WHERE is_default = 0;

-- ── Anciennes tables (si présentes) ─────────────────────────
DELETE FROM clients      WHERE 1=1;
DELETE FROM fournisseurs WHERE 1=1;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Confirmation ─────────────────────────────────────────────
SELECT 'RESET OK' AS statut,
       (SELECT COUNT(*) FROM transactions)   AS transactions,
       (SELECT quantite FROM stock LIMIT 1)  AS stock_usdt,
       (SELECT montant FROM comptes WHERE type_compte = 'depot')   AS depot,
       (SELECT montant FROM comptes WHERE type_compte = 'caisse')  AS caisse;
