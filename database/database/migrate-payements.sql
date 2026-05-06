-- ============================================================
--  FOREXIUM — Migration : Paiements Client / Fournisseur
--  À exécuter dans phpMyAdmin (onglet SQL de votre base)
--  Compatible MySQL 5.7 / 8.0 / MariaDB 10+
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1) Suppression des tables remplacées par `transactions` ─
DROP TABLE IF EXISTS distribution;
DROP TABLE IF EXISTS distribution_partenaires;
DROP TABLE IF EXISTS distribution_partenaire;
DROP TABLE IF EXISTS payement_history;
DROP TABLE IF EXISTS payement_history_fournisseur;
DROP TABLE IF EXISTS paiement_history;
DROP TABLE IF EXISTS paiement_history_fournisseur;

-- ── 2) Extension de l'ENUM `type` de la table transactions ──
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

-- ── 3) Colonnes de paiement (procédure idempotente) ─────────
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
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

CALL forexium_add_col('transactions', 'montant_paye',      'DECIMAL(18,2) DEFAULT 0');
CALL forexium_add_col('transactions', 'montant_reste',     'DECIMAL(18,2) DEFAULT 0');
CALL forexium_add_col('transactions', 'payment_status',    "ENUM('unpaid','partial','paid') DEFAULT 'unpaid'");
CALL forexium_add_col('transactions', 'mode_paiement',     'VARCHAR(20) DEFAULT NULL');
CALL forexium_add_col('transactions', 'client_id',         'INT DEFAULT NULL');
CALL forexium_add_col('transactions', 'id_fournisseur',    'INT DEFAULT NULL');
CALL forexium_add_col('transactions', 'notes',             'TEXT DEFAULT NULL');
CALL forexium_add_col('transactions', 'date_modification', 'TIMESTAMP NULL DEFAULT NULL');

DROP PROCEDURE IF EXISTS forexium_add_col;

-- ── 4) Index pour accélérer les agrégats ────────────────────
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
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$
DELIMITER ;

CALL forexium_add_idx('transactions', 'idx_client_id',      '`client_id`');
CALL forexium_add_idx('transactions', 'idx_id_fournisseur', '`id_fournisseur`');
CALL forexium_add_idx('transactions', 'idx_type_statut',    '`type`, `statut`');

DROP PROCEDURE IF EXISTS forexium_add_idx;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Confirmation ────────────────────────────────────────────
SELECT 'MIGRATION OK' AS statut,
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name   = 'transactions'
       AND column_name IN ('montant_paye','montant_reste','payment_status',
                           'mode_paiement','client_id','id_fournisseur'))
   AS colonnes_paiement_presentes,
  (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name IN ('distribution','distribution_partenaires',
                          'payement_history','payement_history_fournisseur'))
   AS tables_supprimees_restantes;
