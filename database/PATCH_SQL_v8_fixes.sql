-- ============================================================
-- PATCH v8 — Correctifs critiques
-- 1. Correction erreur SQL 'amount_paid' inconnu
-- 2. Ajout colonne date_operation (date réelle de l'opération)
-- 3. Mise à jour vue extrait clients/fournisseurs
-- À exécuter UNE SEULE FOIS sur la base de données
-- ============================================================

USE forexium_v7;

-- ── 1. Corriger l'alias amount_paid dans les vues extraits ──────────────
-- Le champ s'appelle montant_paye dans la table, pas amount_paid

DROP VIEW IF EXISTS vue_extrait_clients;
CREATE VIEW vue_extrait_clients AS
SELECT
  cc.id,
  cc.nom,
  cc.prenom,
  cc.ville,
  cc.telephone,
  cc.solde,
  COUNT(t.id)    AS nb_transactions,
  SUM(CASE WHEN t.type='vente' THEN COALESCE(t.valeur_vente_visible,0) ELSE 0 END) AS total_ventes,
  SUM(CASE WHEN t.type='achat' THEN COALESCE(t.prix_achat_total,0)    ELSE 0 END) AS total_achats,
  SUM(COALESCE(t.montant_paye,0))  AS total_montant_paye,
  SUM(COALESCE(t.montant_reste,0)) AS total_montant_reste
FROM comptes_clients cc
LEFT JOIN transactions t ON cc.id = t.client_id
GROUP BY cc.id, cc.nom, cc.prenom, cc.ville, cc.telephone, cc.solde;

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
  SUM(CASE WHEN t.type='vente' THEN 1 ELSE 0 END) AS nb_ventes,
  SUM(CASE WHEN t.type='achat' THEN 1 ELSE 0 END) AS nb_achats,
  SUM(CASE WHEN t.type='achat' THEN COALESCE(t.prix_achat_total,0) ELSE 0 END) AS total_achats_xaf,
  SUM(CASE WHEN t.type='achat' THEN COALESCE(t.quantite,0) ELSE 0 END) AS total_achats_usdt
FROM comptes_fournisseurs cf
LEFT JOIN transactions t ON cf.id = t.id_fournisseur
GROUP BY cf.id, cf.nom, cf.prenom, cf.ville, cf.telephone,
         cf.solde_xaf, cf.solde_usdt, cf.dette_usdt;

-- ── 2. Ajouter colonne date_operation si elle n'existe pas ─────────────
-- Cette colonne permet d'enregistrer la date réelle de l'opération
-- (différente de date_enregistrement qui est automatique)

ALTER TABLE transactions
  ADD COLUMN date_operation DATE DEFAULT NULL
  COMMENT 'Date réelle de l\'opération (peut différer de l\'enregistrement)';

-- Remplir date_operation depuis la date existante pour les anciennes transactions
UPDATE transactions
SET date_operation = DATE(date)
WHERE date_operation IS NULL AND date IS NOT NULL;

-- ── 3. S'assurer que montant_paye et montant_reste existent ────────────
ALTER TABLE transactions
  MODIFY COLUMN montant_paye DECIMAL(15,2) DEFAULT 0,
  MODIFY COLUMN montant_reste DECIMAL(15,2) DEFAULT 0;

-- ── 4. Corriger payment_status NULL → 'paid' ───────────────────────────
UPDATE transactions
SET payment_status = 'paid'
WHERE payment_status IS NULL AND statut IN ('valide','committed');

SELECT 'PATCH v8 appliqué avec succès ✓' AS status;
