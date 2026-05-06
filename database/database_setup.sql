-- ============================================================
-- FOREXIUM v7 — BASE DE DONNÉES COMPLÈTE ET CORRIGÉE
-- Tables alignées avec le backend (accounts.js, transactions.js)
-- comptes_clients + comptes_fournisseurs (nom, prenom, ville, adresse, telephone)
-- ============================================================

DROP DATABASE IF EXISTS forexium_v7;

CREATE DATABASE forexium_v7
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE forexium_v7;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('porteur', 'associe') NOT NULL,
  last_login TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: devises_personnalisees
-- (nom utilisé dans le backend /api/devises)
-- ============================================================
CREATE TABLE devises_personnalisees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  nom VARCHAR(50) NOT NULL,
  taux_conversion DECIMAL(15,6) NOT NULL DEFAULT 1.000000,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: comptes_clients
-- Champs: nom, prenom, ville, adresse, quartier, telephone
-- ============================================================
CREATE TABLE comptes_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) DEFAULT NULL,
  ville VARCHAR(100) DEFAULT NULL,
  adresse TEXT DEFAULT NULL,
  quartier VARCHAR(100) DEFAULT NULL,
  telephone VARCHAR(20) DEFAULT NULL,
  solde DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: comptes_fournisseurs
-- Champs: nom, prenom, ville, adresse, telephone (PAS de numero)
-- ============================================================
CREATE TABLE comptes_fournisseurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) DEFAULT NULL,
  ville VARCHAR(100) DEFAULT NULL,
  adresse TEXT DEFAULT NULL,
  telephone VARCHAR(20) DEFAULT NULL,
  solde_xaf DECIMAL(15,2) DEFAULT 0,
  solde_usdt DECIMAL(15,6) DEFAULT 0,
  dette_usdt DECIMAL(15,6) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: transactions (COMPLÈTE)
-- ============================================================
CREATE TABLE transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_enregistrement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP NULL DEFAULT NULL,
  type ENUM('achat', 'vente', 'depense', 'retrait', 'versement') NOT NULL,

  -- Statut
  statut ENUM('valide', 'pending', 'porteur_pending', 'assoc_pending', 'committed') DEFAULT 'valide',

  -- Commun
  montant DECIMAL(15,2) DEFAULT NULL,
  notes TEXT DEFAULT NULL,

  -- ACHAT USDT
  devise VARCHAR(10) DEFAULT NULL,
  quantite DECIMAL(15,6) DEFAULT NULL,
  taux_achat_unitaire DECIMAL(15,6) DEFAULT NULL,
  prix_achat_total DECIMAL(15,2) DEFAULT NULL,
  use_caisse BOOLEAN DEFAULT FALSE,
  ancien_cmup DECIMAL(15,6) DEFAULT NULL,
  nouveau_cmup DECIMAL(15,6) DEFAULT NULL,
  fournisseur VARCHAR(100) DEFAULT NULL,
  id_fournisseur INT DEFAULT NULL,

  -- VENTE
  devise_vente VARCHAR(10) DEFAULT NULL,
  taux_conversion DECIMAL(15,6) DEFAULT NULL,
  taux_achat_xaf DECIMAL(15,6) DEFAULT NULL,
  quantite_vente DECIMAL(15,6) DEFAULT NULL,
  taux_vente_visible DECIMAL(15,6) DEFAULT NULL,
  taux_vente_cache DECIMAL(15,6) DEFAULT NULL,
  valeur_achat_xaf DECIMAL(15,2) DEFAULT NULL,
  valeur_vente_visible DECIMAL(15,2) DEFAULT NULL,
  valeur_vente_cachee DECIMAL(15,2) DEFAULT NULL,
  benefice_visible DECIMAL(15,2) DEFAULT NULL,
  benefice_cache DECIMAL(15,2) DEFAULT NULL,
  part_porteur_visible DECIMAL(15,2) DEFAULT NULL,
  part_porteur_cachee DECIMAL(15,2) DEFAULT NULL,
  part_associe_visible DECIMAL(15,2) DEFAULT NULL,
  part_associe_cachee DECIMAL(15,2) DEFAULT NULL,
  pourcentage_porteur DECIMAL(5,2) DEFAULT NULL,
  pourcentage_associe DECIMAL(5,2) DEFAULT NULL,
  usdt_consomme DECIMAL(15,6) DEFAULT NULL,
  client VARCHAR(100) DEFAULT NULL,
  client_id INT DEFAULT NULL,

  -- DÉPENSE
  categorie VARCHAR(50) DEFAULT NULL,

  -- RETRAIT
  beneficiaire VARCHAR(100) DEFAULT NULL,

  -- PAIEMENTS PARTIELS (v5.6.0+)
  mode_paiement ENUM('XAF','USDT','xaf','usdt') DEFAULT 'XAF',
  montant_paye DECIMAL(15,2) DEFAULT 0,
  montant_reste DECIMAL(15,2) DEFAULT 0,
  surplus_client DECIMAL(15,2) DEFAULT 0,
  payment_status ENUM('unpaid','partial','paid','overpaid') DEFAULT 'paid',

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES comptes_clients(id) ON DELETE SET NULL,
  FOREIGN KEY (id_fournisseur) REFERENCES comptes_fournisseurs(id) ON DELETE SET NULL,
  INDEX idx_date_type (date, type),
  INDEX idx_statut_type (statut, type),
  INDEX idx_client (client),
  INDEX idx_fournisseur_id (id_fournisseur)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: stock
-- ============================================================
CREATE TABLE stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  devise VARCHAR(10) UNIQUE NOT NULL,
  quantite DECIMAL(15,6) NOT NULL DEFAULT 0,
  cmup DECIMAL(15,6) NOT NULL DEFAULT 0,
  valeur_totale DECIMAL(15,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: comptes (caisse / banque)
-- ============================================================
CREATE TABLE comptes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_compte ENUM('caisse','banque') UNIQUE NOT NULL,
  montant DECIMAL(15,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: settings
-- ============================================================
CREATE TABLE settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  valeur TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: logs  (sans FK stricte sur user_id)
-- ============================================================
CREATE TABLE logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT DEFAULT NULL,
  type_evenement VARCHAR(50) NOT NULL,
  description TEXT,
  date_heure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date_type (date_heure, type_evenement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: distribution
-- ============================================================
CREATE TABLE distribution (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('porteur','associe') UNIQUE NOT NULL,
  pourcentage_defaut DECIMAL(5,2) DEFAULT 0,
  total_accumule_visible DECIMAL(15,2) DEFAULT 0,
  total_accumule_cache DECIMAL(15,2) DEFAULT 0,
  distribution_active BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: distribution_partenaires
-- ============================================================
CREATE TABLE distribution_partenaires (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(50),
  role ENUM('porteur','associe') NOT NULL,
  benefice_visible DECIMAL(15,2) DEFAULT 0,
  benefice_cache DECIMAL(15,2) DEFAULT 0,
  pourcentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  INDEX idx_tx (transaction_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: repartition_profits
-- (utilisée par /api/stats/repartition dans stats.js)
-- ============================================================
CREATE TABLE repartition_profits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('porteur','associe') UNIQUE NOT NULL,
  pourcentage_defaut DECIMAL(5,2) DEFAULT 70.00,
  total_accumule_visible DECIMAL(15,2) DEFAULT 0,
  total_accumule_cache DECIMAL(15,2) DEFAULT 0,
  distribution_active BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

-- Devises par défaut
INSERT INTO devises_personnalisees (code, nom, taux_conversion, is_default) VALUES
  ('RMB', 'Yuan Chinois', 1.000000, TRUE),
  ('USD', 'Dollar US',    1.000000, TRUE);

-- Stock initial
INSERT INTO stock (devise, quantite, cmup, valeur_totale) VALUES
  ('USDT', 0, 0, 0);

-- Paramètres
INSERT INTO settings (setting_key, valeur, description) VALUES
  ('profit_share_porteur',  '70',    'Part du porteur (%)'),
  ('profit_share_associe',  '30',    'Part de l\'associé (%)'),
  ('hidden_password',       '1234',  'Mot de passe section cachée'),
  ('distribution_active',   'false', 'Distribution activée');

-- Répartition profits
INSERT INTO repartition_profits (role, pourcentage_defaut) VALUES
  ('porteur', 70.00),
  ('associe', 30.00);

-- Distribution
INSERT INTO distribution (role, pourcentage_defaut, distribution_active) VALUES
  ('porteur', 70, FALSE),
  ('associe', 30, FALSE);

-- Comptes (caisse + banque)
INSERT INTO comptes (type_compte, montant) VALUES
  ('caisse', 0),
  ('banque', 0);

-- ============================================================
-- VUES
-- ============================================================

-- Vue 1: Transactions complètes
CREATE OR REPLACE VIEW vue_transactions_completes AS
SELECT
  t.*,
  u.name  AS user_name,
  u.role  AS user_role,
  cc.nom  AS client_nom,
  CONCAT(COALESCE(cc.prenom,''),' ',cc.nom) AS client_nom_complet,
  cf.nom  AS fournisseur_nom
FROM transactions t
LEFT JOIN users          u  ON t.user_id        = u.id
LEFT JOIN comptes_clients    cc ON t.client_id      = cc.id
LEFT JOIN comptes_fournisseurs cf ON t.id_fournisseur = cf.id;

-- Vue 2: Stock USDT
CREATE OR REPLACE VIEW vue_stock_usdt AS
SELECT devise, quantite, cmup, valeur_totale, updated_at
FROM stock;

-- Vue 3: Stats globales
CREATE OR REPLACE VIEW vue_stats_globales AS
SELECT
  (SELECT montant FROM comptes WHERE type_compte = 'caisse') AS caisse,
  (SELECT montant FROM comptes WHERE type_compte = 'banque') AS depot,
  (SELECT quantite     FROM stock WHERE devise = 'USDT') AS stock_usdt,
  (SELECT cmup         FROM stock WHERE devise = 'USDT') AS cmup_usdt,
  COUNT(*)                              AS total_transactions,
  SUM(CASE WHEN type='achat' THEN 1 ELSE 0 END) AS total_achats,
  SUM(CASE WHEN type='vente' THEN 1 ELSE 0 END) AS total_ventes,
  SUM(COALESCE(benefice_visible, 0))    AS benefices_visibles_total,
  SUM(COALESCE(benefice_cache,   0))    AS benefices_caches_total
FROM transactions
WHERE statut IN ('valide','committed');

-- Vue 4: Stats journalier
CREATE OR REPLACE VIEW vue_stats_journalier AS
SELECT
  DATE(date)                             AS jour,
  COUNT(*)                               AS nb_transactions,
  SUM(CASE WHEN type='vente' THEN 1 ELSE 0 END) AS nb_ventes,
  SUM(CASE WHEN type='achat' THEN 1 ELSE 0 END) AS nb_achats,
  SUM(COALESCE(benefice_visible, 0))     AS benefices_visibles_jour,
  SUM(COALESCE(benefice_cache,   0))     AS benefices_caches_jour,
  SUM(CASE WHEN taux_vente_cache IS NOT NULL AND taux_vente_cache > 0 THEN 1 ELSE 0 END) AS ventes_cachees
FROM transactions
WHERE statut IN ('valide','committed')
GROUP BY DATE(date)
ORDER BY jour DESC;

-- Vue 5: Distribution des partenaires (utilisée par stats.js)
CREATE OR REPLACE VIEW vue_distribution_details AS
SELECT
  dp.id,
  dp.transaction_id,
  t.date,
  t.type,
  t.devise_vente,
  t.quantite_vente,
  t.taux_vente_visible,
  t.taux_vente_cache,
  dp.role,
  dp.benefice_visible,
  dp.benefice_cache,
  dp.pourcentage,
  (dp.benefice_visible + COALESCE(dp.benefice_cache, 0)) AS benefice_total,
  u.name AS user_name,
  t.client,
  COALESCE(cf.nom, t.fournisseur) AS fournisseur_nom
FROM distribution_partenaires dp
LEFT JOIN transactions         t  ON dp.transaction_id = t.id
LEFT JOIN users                u  ON t.user_id         = u.id
LEFT JOIN comptes_fournisseurs cf ON t.id_fournisseur  = cf.id
WHERE t.statut IN ('valide','committed')
ORDER BY t.date DESC;

-- Vue 6: Extraits clients
CREATE OR REPLACE VIEW vue_extrait_clients AS
SELECT
  cc.id,
  cc.nom,
  cc.prenom,
  cc.ville,
  cc.telephone,
  cc.solde,
  COUNT(t.id)  AS nb_transactions,
  SUM(CASE WHEN t.type='vente' THEN COALESCE(t.valeur_vente_visible,0) ELSE 0 END) AS total_ventes,
  SUM(CASE WHEN t.type='achat' THEN COALESCE(t.prix_achat_total,0)    ELSE 0 END) AS total_achats
FROM comptes_clients cc
LEFT JOIN transactions t ON cc.id = t.client_id
GROUP BY cc.id, cc.nom, cc.prenom, cc.ville, cc.telephone, cc.solde;

-- Vue 7: Extraits fournisseurs
CREATE OR REPLACE VIEW vue_extrait_fournisseurs AS
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
  SUM(CASE WHEN t.type='achat' THEN 1 ELSE 0 END) AS nb_achats
FROM comptes_fournisseurs cf
LEFT JOIN transactions t ON cf.id = t.id_fournisseur
GROUP BY cf.id, cf.nom, cf.prenom, cf.ville, cf.telephone,
         cf.solde_xaf, cf.solde_usdt, cf.dette_usdt;

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$

-- Trigger: stock après achat
DROP TRIGGER IF EXISTS after_achat_insert$$
CREATE TRIGGER after_achat_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
  IF NEW.type = 'achat' AND NEW.statut IN ('valide','committed') AND NEW.devise IS NOT NULL THEN
    INSERT INTO stock (devise, quantite, cmup, valeur_totale)
    VALUES (NEW.devise, COALESCE(NEW.quantite,0), COALESCE(NEW.taux_achat_unitaire,0), COALESCE(NEW.prix_achat_total,0))
    ON DUPLICATE KEY UPDATE
      cmup          = (valeur_totale + COALESCE(NEW.prix_achat_total,0)) / (quantite + COALESCE(NEW.quantite,0)),
      quantite      = quantite      + COALESCE(NEW.quantite,0),
      valeur_totale = valeur_totale + COALESCE(NEW.prix_achat_total,0);
  END IF;
END$$

-- Trigger: stock après vente
DROP TRIGGER IF EXISTS after_vente_insert$$
CREATE TRIGGER after_vente_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
  IF NEW.type = 'vente' AND NEW.statut IN ('valide','committed') AND NEW.usdt_consomme IS NOT NULL THEN
    UPDATE stock
    SET
      quantite      = GREATEST(0, quantite - COALESCE(NEW.usdt_consomme,0)),
      valeur_totale = GREATEST(0, valeur_totale - (cmup * COALESCE(NEW.usdt_consomme,0)))
    WHERE devise = 'USDT';
  END IF;
END$$

-- Trigger: distribution après vente
DROP TRIGGER IF EXISTS after_vente_distribution$$
CREATE TRIGGER after_vente_distribution
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
  IF NEW.type = 'vente' AND NEW.statut IN ('valide','committed') THEN
    UPDATE repartition_profits
    SET
      total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_porteur_visible, 0),
      total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_porteur_cachee,  0)
    WHERE role = 'porteur';

    UPDATE repartition_profits
    SET
      total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_associe_visible, 0),
      total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_associe_cachee,  0)
    WHERE role = 'associe';

    -- Même chose pour la table distribution (double cible)
    UPDATE distribution
    SET
      total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_porteur_visible, 0),
      total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_porteur_cachee,  0)
    WHERE role = 'porteur';

    UPDATE distribution
    SET
      total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_associe_visible, 0),
      total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_associe_cachee,  0)
    WHERE role = 'associe';
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
SELECT '✅ Base forexium_v7 créée avec succès' AS statut;