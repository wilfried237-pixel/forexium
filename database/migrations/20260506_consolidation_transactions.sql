-- ============================================================
--  FOREXIUM — Consolidation des paiements dans `transactions`
--  À exécuter dans phpMyAdmin (onglet SQL de votre base)
--  Compatible MySQL 5.7 / 8.0 / MariaDB 10+
--
--  Effets :
--   1. Supprime les tables : distribution, distribution_partenaire(s),
--      payement_history, payement_history_fournisseur(s),
--      payment_history, payment_history_fournisseurs.
--   2. Ajoute les types 'payement_client' et 'payement_fournisseur'
--      à la colonne `transactions.type`.
--   3. Garantit la présence des colonnes de paiement dans `transactions`
--      (montant_paye, montant_reste, payment_status, mode_paiement,
--       client_id, id_fournisseur, notes, date_modification).
--   4. Recrée le trigger `after_vente_distribution` sans référence à
--      la table `distribution` (les parts sont déjà dans `transactions`,
--      les cumuls sont gardés dans `repartition_profits`).
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1) Supprimer les triggers qui référencent les tables à supprimer
DROP TRIGGER IF EXISTS after_vente_distribution;

-- ── 2) Supprimer les tables remplacées par `transactions`
DROP TABLE IF EXISTS distribution_partenaires;
DROP TABLE IF EXISTS distribution_partenaire;
DROP TABLE IF EXISTS distribution;
DROP TABLE IF EXISTS payement_history;
DROP TABLE IF EXISTS payement_history_fournisseur;
DROP TABLE IF EXISTS payement_history_fournisseurs;
DROP TABLE IF EXISTS payment_history;
DROP TABLE IF EXISTS payment_history_fournisseurs;

-- ── 3) Étendre l'ENUM `type` de `transactions`
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

-- ── 4) Ajouter les colonnes de paiement (idempotent)
DROP PROCEDURE IF EXISTS forexium_add_col;

DELIMITER $$
CREATE PROCEDURE forexium_add_col(
  IN p_table VARCHAR(64),
  IN p_col   VARCHAR(64),
  IN p_def   VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name   = p_table
       AND column_name  = p_col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_def);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

CALL forexium_add_col('transactions', 'montant',           'DECIMAL(15,2) DEFAULT 0');
CALL forexium_add_col('transactions', 'montant_paye',      'DECIMAL(15,2) DEFAULT 0');
CALL forexium_add_col('transactions', 'montant_reste',     'DECIMAL(15,2) DEFAULT 0');
CALL forexium_add_col('transactions', 'payment_status',    "ENUM('unpaid','partial','paid','overpaid','fully_paid','partially_paid') DEFAULT 'unpaid'");
CALL forexium_add_col('transactions', 'mode_paiement',     "VARCHAR(20) DEFAULT 'xaf'");
CALL forexium_add_col('transactions', 'client_id',         'INT DEFAULT NULL');
CALL forexium_add_col('transactions', 'id_fournisseur',    'INT DEFAULT NULL');
CALL forexium_add_col('transactions', 'notes',             'TEXT DEFAULT NULL');
CALL forexium_add_col('transactions', 'date_modification', 'TIMESTAMP NULL DEFAULT NULL');
CALL forexium_add_col('transactions', 'surplus_client',    'DECIMAL(15,2) DEFAULT 0');

DROP PROCEDURE IF EXISTS forexium_add_col;

-- ── 5) Index utiles pour les agrégats / extraits
DROP PROCEDURE IF EXISTS forexium_add_idx;

DELIMITER $$
CREATE PROCEDURE forexium_add_idx(
  IN p_table VARCHAR(64),
  IN p_idx   VARCHAR(64),
  IN p_cols  VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name   = p_table
       AND index_name   = p_idx
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_idx, '` (', p_cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

CALL forexium_add_idx('transactions', 'idx_client_id',      '`client_id`');
CALL forexium_add_idx('transactions', 'idx_id_fournisseur', '`id_fournisseur`');
CALL forexium_add_idx('transactions', 'idx_type_statut',    '`type`, `statut`');
CALL forexium_add_idx('transactions', 'idx_date_type',      '`date`, `type`');

DROP PROCEDURE IF EXISTS forexium_add_idx;

-- ── 6) Recréer le trigger `after_vente_distribution`
--      sans référence à la table `distribution` (supprimée).
DELIMITER $$
CREATE TRIGGER after_vente_distribution
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
END $$
DELIMITER ;

-- ── 7) Supprimer la vue qui référençait `distribution_partenaires`
DROP VIEW IF EXISTS vue_distribution_details;

SET FOREIGN_KEY_CHECKS = 1;

-- ── 8) Confirmation
SELECT 'MIGRATION OK' AS statut,
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name   = 'transactions'
       AND column_name IN ('montant','montant_paye','montant_reste','payment_status',
                           'mode_paiement','client_id','id_fournisseur','notes',
                           'date_modification')) AS colonnes_paiement_presentes,
  (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name IN ('distribution','distribution_partenaires','distribution_partenaire',
                          'payement_history','payement_history_fournisseur','payement_history_fournisseurs',
                          'payment_history','payment_history_fournisseurs')) AS tables_a_supprimer_restantes;
