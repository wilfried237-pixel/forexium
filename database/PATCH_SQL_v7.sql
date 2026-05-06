-- ══════════════════════════════════════════════════════════════
-- FOREXIUM v7 — PATCH SQL compatible MySQL 5.7
-- (sans ADD COLUMN IF NOT EXISTS — non supporté en MySQL 5.7)
-- ══════════════════════════════════════════════════════════════
USE forexium_v7;

-- ─── 1. comptes_clients — numero unique CLI-XXXXX ────────────
SET @exist1 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='forexium_v7' AND TABLE_NAME='comptes_clients' AND COLUMN_NAME='numero');
SET @q1 = IF(@exist1=0,
  'ALTER TABLE comptes_clients ADD COLUMN numero VARCHAR(20) DEFAULT NULL AFTER id',
  'SELECT "OK: numero existe dans comptes_clients" AS info');
PREPARE s FROM @q1; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 2. comptes_fournisseurs — numero unique FRN-XXXXX ───────
SET @exist2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='forexium_v7' AND TABLE_NAME='comptes_fournisseurs' AND COLUMN_NAME='numero');
SET @q2 = IF(@exist2=0,
  'ALTER TABLE comptes_fournisseurs ADD COLUMN numero VARCHAR(20) DEFAULT NULL AFTER id',
  'SELECT "OK: numero existe dans comptes_fournisseurs" AS info');
PREPARE s FROM @q2; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 3. transactions — montant_reste ─────────────────────────
SET @exist3 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='forexium_v7' AND TABLE_NAME='transactions' AND COLUMN_NAME='montant_reste');
SET @q3 = IF(@exist3=0,
  'ALTER TABLE transactions ADD COLUMN montant_reste DECIMAL(15,2) DEFAULT 0 AFTER amount_paid',
  'SELECT "OK: montant_reste existe" AS info');
PREPARE s FROM @q3; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 4. transactions — id_fournisseur ────────────────────────
SET @exist4 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='forexium_v7' AND TABLE_NAME='transactions' AND COLUMN_NAME='id_fournisseur');
SET @q4 = IF(@exist4=0,
  'ALTER TABLE transactions ADD COLUMN id_fournisseur INT DEFAULT NULL AFTER client_id',
  'SELECT "OK: id_fournisseur existe" AS info');
PREPARE s FROM @q4; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 5. Index ────────────────────────────────────────────────
SET @idx1 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA='forexium_v7' AND TABLE_NAME='comptes_clients' AND INDEX_NAME='idx_cli_numero');
SET @q5 = IF(@idx1=0,
  'CREATE INDEX idx_cli_numero ON comptes_clients(numero)',
  'SELECT "OK: index idx_cli_numero existe" AS info');
PREPARE s FROM @q5; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx2 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA='forexium_v7' AND TABLE_NAME='comptes_fournisseurs' AND INDEX_NAME='idx_fourn_numero');
SET @q6 = IF(@idx2=0,
  'CREATE INDEX idx_fourn_numero ON comptes_fournisseurs(numero)',
  'SELECT "OK: index idx_fourn_numero existe" AS info');
PREPARE s FROM @q6; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── Vérification finale ──────────────────────────────────────
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA='forexium_v7'
  AND TABLE_NAME IN ('comptes_clients','comptes_fournisseurs','transactions')
  AND COLUMN_NAME IN ('numero','montant_reste','id_fournisseur','amount_paid')
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT '✅ Patch MySQL 5.7 appliqué avec succès' AS statut;
