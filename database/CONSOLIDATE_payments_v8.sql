-- ============================================================
-- FOREXIUM v8 — CONSOLIDATION DES PAIEMENTS
-- ============================================================
-- Objectif :
--   1. Supprimer les tables redondantes (distribution, distribution_partenaires,
--      payment_history, payment_history_fournisseurs)
--   2. Tout centraliser dans `transactions` avec :
--        - type = 'payement_client'         pour les paiements clients
--        - type = 'payement_fournisseur'    pour les paiements fournisseurs
--        - montant         = montant à payer
--        - montant_paye    = montant effectivement payé
--        - reste           = montant - montant_paye  (calculé, NON stocké)
--
-- ⚠️  À EXÉCUTER DANS phpMyAdmin SUR LA BASE forexium_v7 (ou équivalente)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) SUPPRIMER LES OBJETS DÉPENDANTS (vue + trigger)
-- ─────────────────────────────────────────────────────────────
DROP VIEW    IF EXISTS vue_distribution_details;
DROP TRIGGER IF EXISTS after_vente_distribution;

-- ─────────────────────────────────────────────────────────────
-- 2) SUPPRIMER LES TABLES OBSOLÈTES
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS payment_history_fournisseurs;
DROP TABLE IF EXISTS payment_history;
DROP TABLE IF EXISTS distribution_partenaires;
DROP TABLE IF EXISTS distribution;

-- ─────────────────────────────────────────────────────────────
-- 3) METTRE À JOUR L'ENUM DE LA COLONNE `type` DE `transactions`
--    pour inclure 'payement_client' et 'payement_fournisseur'
-- ─────────────────────────────────────────────────────────────
ALTER TABLE transactions
  MODIFY COLUMN type ENUM(
    'achat',
    'vente',
    'depense',
    'retrait',
    'versement',
    'payement_client',
    'payement_fournisseur'
  ) NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 4) S'ASSURER QUE LES COLONNES NÉCESSAIRES EXISTENT
--    (paiements partiels v5.6.0+)
-- ─────────────────────────────────────────────────────────────
-- montant_paye
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'transactions'
    AND COLUMN_NAME  = 'montant_paye'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE transactions ADD COLUMN montant_paye DECIMAL(15,2) DEFAULT 0',
  'SELECT "montant_paye OK"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- montant_reste (gardé pour traçabilité, mais recalculable)
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'transactions'
    AND COLUMN_NAME  = 'montant_reste'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE transactions ADD COLUMN montant_reste DECIMAL(15,2) DEFAULT 0',
  'SELECT "montant_reste OK"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment_status
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'transactions'
    AND COLUMN_NAME  = 'payment_status'
);
SET @sql := IF(@col_exists = 0,
  "ALTER TABLE transactions ADD COLUMN payment_status ENUM('unpaid','partial','paid') DEFAULT 'unpaid'",
  'SELECT "payment_status OK"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mode_paiement
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'transactions'
    AND COLUMN_NAME  = 'mode_paiement'
);
SET @sql := IF(@col_exists = 0,
  "ALTER TABLE transactions ADD COLUMN mode_paiement ENUM('XAF','USDT','xaf','usdt') DEFAULT 'xaf'",
  'SELECT "mode_paiement OK"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notes
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'transactions'
    AND COLUMN_NAME  = 'notes'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE transactions ADD COLUMN notes TEXT DEFAULT NULL',
  'SELECT "notes OK"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─────────────────────────────────────────────────────────────
-- 5) RECRÉER UN TRIGGER MINIMAL POUR `repartition_profits`
--    (ancienne version mettait aussi à jour `distribution`,
--     supprimée ci-dessus)
-- ─────────────────────────────────────────────────────────────
DELIMITER $$

DROP TRIGGER IF EXISTS after_vente_repartition$$
CREATE TRIGGER after_vente_repartition
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
  IF NEW.type = 'vente' AND NEW.statut IN ('valide','committed') THEN
    UPDATE repartition_profits
       SET total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_porteur_visible, 0),
           total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_porteur_cachee,  0)
     WHERE role = 'porteur';

    UPDATE repartition_profits
       SET total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_associe_visible, 0),
           total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_associe_cachee,  0)
     WHERE role = 'associe';
  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- 6) VÉRIFICATIONS
-- ─────────────────────────────────────────────────────────────
SELECT '✅ Migration v8 terminée — tables redondantes supprimées' AS statut;

SELECT
  TABLE_NAME AS table_restante
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

SELECT COLUMN_TYPE AS type_enum
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'transactions'
  AND COLUMN_NAME  = 'type';
