-- ============================================================
--  FOREXIUM v7 — SCRIPT DE RÉINITIALISATION COMPLÈTE
--  Compatible MySQL 5.6 / 5.7
--  ⚠️  IRRÉVERSIBLE — faire une sauvegarde avant !
--
--  Exécuter dans phpMyAdmin → onglet SQL
--  ou en ligne de commande :
--    mysql -u root -p forexium_v7 < RESET_donnees.sql
-- ============================================================

USE forexium_v7;

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. Tables enfants d'abord (évite erreur FK #1701) ────────
DELETE FROM distribution_partenaires;
DELETE FROM logs;

-- ── 2. Toutes les transactions ───────────────────────────────
DELETE FROM transactions;

-- ── 3. Stock USDT remis à zéro ───────────────────────────────
UPDATE stock
   SET quantite      = 0,
       cmup          = 0,
       valeur_totale = 0
 WHERE devise = 'USDT';

-- ── 4. Comptes (caisse + banque) remis à zéro ────────────────
UPDATE comptes SET montant = 0 WHERE type_compte = 'caisse';
UPDATE comptes SET montant = 0 WHERE type_compte = 'banque';

-- ── 5. Distribution & répartition profits remises à zéro ─────
UPDATE distribution
   SET total_accumule_visible = 0,
       total_accumule_cache   = 0;

UPDATE repartition_profits
   SET total_accumule_visible = 0,
       total_accumule_cache   = 0;

-- ── 6. Soldes clients remis à zéro (fiches conservées) ───────
UPDATE comptes_clients SET solde = 0;

-- ── 7. Soldes fournisseurs remis à zéro (fiches conservées) ──
UPDATE comptes_fournisseurs
   SET solde_xaf  = 0,
       solde_usdt = 0,
       dette_usdt = 0;

-- ── 8. Devises personnalisées : garder uniquement les défauts ─
DELETE FROM devises_personnalisees WHERE is_default = 0;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Vérification ─────────────────────────────────────────────
SELECT
  'RESET OK ✅'                                               AS statut,
  (SELECT COUNT(*) FROM transactions)                         AS transactions,
  (SELECT COUNT(*) FROM distribution_partenaires)             AS dist_partenaires,
  (SELECT COUNT(*) FROM logs)                                 AS logs,
  (SELECT quantite      FROM stock WHERE devise = 'USDT')     AS stock_usdt,
  (SELECT montant FROM comptes WHERE type_compte = 'caisse')  AS caisse,
  (SELECT montant FROM comptes WHERE type_compte = 'banque')  AS banque;
