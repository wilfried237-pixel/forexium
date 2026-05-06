-- ============================================================
-- PATCH v9 — Correctifs complets (remplace PATCH v8)
-- À exécuter UNE SEULE FOIS sur la base de données
-- ============================================================

-- ── 1. Ajouter colonne prenom + telephone aux tables si manquant ──
ALTER TABLE comptes_clients
  ADD COLUMN prenom VARCHAR(100) DEFAULT NULL,
  ADD COLUMN telephone VARCHAR(30) DEFAULT NULL;

ALTER TABLE comptes_fournisseurs
  ADD COLUMN prenom VARCHAR(100) DEFAULT NULL,
  ADD COLUMN telephone VARCHAR(30) DEFAULT NULL;

-- Migrer numero → telephone si telephone vide
UPDATE comptes_clients SET telephone = numero WHERE telephone IS NULL AND numero IS NOT NULL;
UPDATE comptes_fournisseurs SET telephone = numero WHERE telephone IS NULL AND numero IS NOT NULL;

-- ── 2. Ajouter colonne date_operation ─────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS date_operation DATE DEFAULT NULL
  COMMENT 'Date réelle de l opération (peut différer de l enregistrement)';

UPDATE transactions SET date_operation = DATE(date) WHERE date_operation IS NULL AND date IS NOT NULL;

-- ── 3. S'assurer que montant_paye / montant_reste existent ────
ALTER TABLE transactions
  MODIFY COLUMN montant_paye DECIMAL(15,2) DEFAULT 0,
  MODIFY COLUMN montant_reste DECIMAL(15,2) DEFAULT 0;

-- ── 4. Corriger payment_status NULL ──────────────────────────
UPDATE transactions SET payment_status = 'paid'
WHERE payment_status IS NULL AND statut IN ('valide','committed');

-- ── 5. Reconstruire vue extrait clients (corrige amount_paid) ─
DROP VIEW IF EXISTS vue_extrait_clients;
CREATE VIEW vue_extrait_clients AS
SELECT
  cc.id,
  cc.nom,
  cc.prenom,
  cc.ville,
  cc.telephone,
  cc.solde,
  COUNT(t.id)  AS nb_transactions,
  SUM(CASE WHEN t.type='vente' THEN COALESCE(t.valeur_vente_visible,0) ELSE 0 END) AS total_ventes,
  SUM(COALESCE(t.montant_paye,0))  AS total_montant_paye,
  SUM(COALESCE(t.montant_reste,0)) AS total_montant_reste
FROM comptes_clients cc
LEFT JOIN transactions t ON cc.id = t.client_id
GROUP BY cc.id, cc.nom, cc.prenom, cc.ville, cc.telephone, cc.solde;

-- ── 6. Reconstruire vue extrait fournisseurs ──────────────────
DROP VIEW IF EXISTS vue_extrait_fournisseurs;
CREATE VIEW vue_extrait_fournisseurs AS
SELECT
  cf.id,
  cf.nom,
  cf.prenom,
  cf.ville,
  cf.telephone,
  cf.solde_xaf,
  cf.solde_usdt,
  cf.dette_usdt,
  COUNT(t.id)  AS nb_transactions,
  SUM(CASE WHEN t.type='achat' THEN COALESCE(t.prix_achat_total,0) ELSE 0 END) AS total_achats_xaf,
  SUM(CASE WHEN t.type='achat' THEN COALESCE(t.quantite,0) ELSE 0 END) AS total_achats_usdt
FROM comptes_fournisseurs cf
LEFT JOIN transactions t ON cf.id = t.id_fournisseur
GROUP BY cf.id, cf.nom, cf.prenom, cf.ville, cf.telephone,
         cf.solde_xaf, cf.solde_usdt, cf.dette_usdt;

SELECT 'PATCH v9 appliqué avec succès ✓' AS status;
