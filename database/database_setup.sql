-- ============================================================
-- FOREXIUM V5.6.0+ - BASE DE DONNÉES MySQL
-- MODIFICATIONS: Comptes, Devises, Paiements
-- ============================================================

-- Créer la base
CREATE DATABASE IF NOT EXISTS forexium_v5 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE forexium_v5;

-- ============================================================
-- TABLE 1: USERS (Utilisateurs)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('porteur', 'associe') NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 2: COMPTES_CLIENTS (Clients)
-- ============================================================

CREATE TABLE IF NOT EXISTS comptes_clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    numero VARCHAR(50) UNIQUE NOT NULL,
    adresse TEXT,
    solde DECIMAL(18,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_numero (numero),
    INDEX idx_nom (nom)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 3: COMPTES_FOURNISSEURS (Fournisseurs)
-- ============================================================

CREATE TABLE IF NOT EXISTS comptes_fournisseurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    numero VARCHAR(50) UNIQUE NOT NULL,
    adresse TEXT,
    solde_xaf DECIMAL(18,2) DEFAULT 0,
    solde_usdt DECIMAL(18,8) DEFAULT 0,
    dette_usdt DECIMAL(18,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_numero (numero),
    INDEX idx_nom (nom)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 4: DEVISES_PERSONNALISEES (Devises du client)
-- ============================================================

CREATE TABLE IF NOT EXISTS devises_personnalisees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    nom VARCHAR(100),
    taux_conversion DECIMAL(18,8) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code)
) ENGINE=InnoDB;

-- Initialisation devises par défaut
INSERT IGNORE INTO devises_personnalisees (code, nom, taux_conversion, is_default) VALUES
('RMB', 'Yuan Chinois', 0.15, TRUE),
('USD', 'Dollar Américain', 1.00, TRUE);

-- ============================================================
-- TABLE 5: STOCK_DEVISES (Stock USDT uniquement)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_devises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    devise VARCHAR(10) UNIQUE NOT NULL DEFAULT 'USDT',
    quantite DECIMAL(18,8) DEFAULT 0,
    cmup DECIMAL(18,8) DEFAULT 0,
    valeur_totale DECIMAL(18,2) AS (quantite * cmup) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_devise (devise)
) ENGINE=InnoDB;

-- Initialisation USDT
INSERT IGNORE INTO stock_devises (devise, quantite, cmup) VALUES ('USDT', 0, 0);

-- ============================================================
-- TABLE 6: COMPTES (Dépôt et Caisse)
-- ============================================================

CREATE TABLE IF NOT EXISTS comptes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_compte ENUM('depot', 'caisse') UNIQUE NOT NULL,
    montant DECIMAL(18,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Initialisation
INSERT IGNORE INTO comptes (type_compte, montant) VALUES
('depot', 0),
('caisse', 500000);

-- ============================================================
-- TABLE 7: TRANSACTIONS (MODIFIÉE)
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50),
    type ENUM('achat', 'vente', 'depense', 'retrait', 'versement') NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_enregistrement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP NULL,
    
    -- Champs communs
    montant DECIMAL(18,2),
    client VARCHAR(255),
    fournisseur VARCHAR(255),
    beneficiaire VARCHAR(255),
    categorie VARCHAR(100),
    notes TEXT,
    statut ENUM('pending', 'porteur_pending', 'assoc_pending', 'committed') DEFAULT 'pending',
    
    -- Champs ACHAT USDT
    devise VARCHAR(10),
    quantite DECIMAL(18,8),
    taux_achat_unitaire DECIMAL(18,8),
    prix_achat_total DECIMAL(18,2),
    use_caisse BOOLEAN DEFAULT FALSE,
    ancien_cmup DECIMAL(18,8),
    nouveau_cmup DECIMAL(18,8),
    
    -- Champs VENTE (V5.1.0)
    devise_vente VARCHAR(10),
    taux_conversion DECIMAL(18,8),
    taux_achat_xaf DECIMAL(18,8),
    quantite_vente DECIMAL(18,8),
    taux_vente_visible DECIMAL(18,2),
    
    -- Vente cachée
    taux_vente_cache DECIMAL(18,2),
    valeur_achat_xaf DECIMAL(18,2),
    valeur_vente_visible DECIMAL(18,2),
    valeur_vente_cachee DECIMAL(18,2),
    
    -- Bénéfices et répartition
    benefice_visible DECIMAL(18,2),
    benefice_cache DECIMAL(18,2),
    part_porteur_visible DECIMAL(18,2),
    part_associe_visible DECIMAL(18,2),
    part_porteur_cachee DECIMAL(18,2),
    part_associe_cachee DECIMAL(18,2),
    pourcentage_porteur INT DEFAULT 70,
    pourcentage_associe INT DEFAULT 30,
    
    -- Stock USDT
    usdt_consomme DECIMAL(18,8),
    
    -- NOUVEAU: Paiements partiels
    montant_paye DECIMAL(18,2) DEFAULT 0,
    montant_reste DECIMAL(18,2) DEFAULT 0,
    surplus_client DECIMAL(18,2) DEFAULT 0,
    
    -- NOUVEAU: Fournisseur et mode paiement
    id_fournisseur INT,
    mode_paiement ENUM('xaf', 'usdt') DEFAULT 'xaf',
    
    -- Métadonnées
    metadata JSON,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (id_fournisseur) REFERENCES comptes_fournisseurs(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_date (date DESC),
    INDEX idx_statut (statut),
    INDEX idx_devise_vente (devise_vente),
    INDEX idx_fournisseur (id_fournisseur)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 8: REPARTITION_PROFITS (Cumul porteurs/associés)
-- ============================================================

CREATE TABLE IF NOT EXISTS repartition_profits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('porteur', 'associe') UNIQUE NOT NULL,
    pourcentage_defaut DECIMAL(5,2) DEFAULT 70.00,
    total_accumule_visible DECIMAL(18,2) DEFAULT 0,
    total_accumule_cache DECIMAL(18,2) DEFAULT 0,
    distribution_active BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- Initialisation
INSERT IGNORE INTO repartition_profits (role, pourcentage_defaut) VALUES
('porteur', 70.00),
('associe', 30.00);

-- ============================================================
-- TABLE 9: DISTRIBUTION_PARTENAIRES (Détails des bénéfices par vente)
-- ============================================================

CREATE TABLE IF NOT EXISTS distribution_partenaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL,
    role ENUM('porteur', 'associe') NOT NULL,
    benefice_visible DECIMAL(18,2) DEFAULT 0,
    benefice_cache DECIMAL(18,2) DEFAULT 0,
    pourcentage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    INDEX idx_transaction (transaction_id),
    INDEX idx_role (role),
    UNIQUE KEY unique_tx_role (transaction_id, role)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 10: LOGS (Journal des activités)
-- ============================================================

CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(100) PRIMARY KEY,
    date_heure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type_evenement VARCHAR(50) NOT NULL,
    description TEXT,
    user_id VARCHAR(50),
    metadata JSON,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type_evenement),
    INDEX idx_date (date_heure DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 11: SETTINGS (Paramètres système)
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cle (cle)
) ENGINE=InnoDB;

-- Paramètres initiaux
INSERT IGNORE INTO settings (cle, valeur, description) VALUES
('hidden_password', '1234', 'Mot de passe pour vente cachée'),
('profit_share_porteur', '70', 'Pourcentage porteur par défaut'),
('profit_share_associe', '30', 'Pourcentage associé par défaut'),
('devise_stock', 'USDT', 'Devise unique pour le stock'),
('devises_vente', '["RMB","USD"]', 'Devises de vente disponibles'),
('pourcentage_caché', '100', 'Pourcentage caché par défaut'),
('app_version', '5.6.0+', 'Version de l\'application');

-- ============================================================
-- TABLE 12: SESSIONS (Gestion des sessions)
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- VUES
-- ============================================================

-- Vue 1: Transactions complètes avec calculs
CREATE OR REPLACE VIEW vue_transactions_completes AS
SELECT 
    t.*,
    u.name as user_name,
    u.role as user_role,
    u.email as user_email,
    cf.nom as fournisseur_nom,
    CASE 
        WHEN t.type = 'vente' AND t.taux_vente_cache IS NOT NULL 
        THEN t.valeur_vente_cachee
        ELSE t.valeur_vente_visible
    END as valeur_vente_finale,
    CASE 
        WHEN t.type = 'vente'
        THEN (t.montant_paye / NULLIF(t.montant, 0) * 100)
        ELSE NULL
    END as pourcentage_paye
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN comptes_fournisseurs cf ON t.id_fournisseur = cf.id;

-- Vue 2: Stock USDT actuel
CREATE OR REPLACE VIEW vue_stock_usdt AS
SELECT 
    devise,
    quantite,
    cmup,
    valeur_totale,
    CONCAT(ROUND(quantite, 4), ' ', devise, ' à ', ROUND(cmup, 2), ' XAF') as stock_resume,
    updated_at
FROM stock_devises 
WHERE devise = 'USDT';

-- Vue 3: Statistiques globales
CREATE OR REPLACE VIEW vue_stats_globales AS
SELECT 
    (SELECT montant FROM comptes WHERE type_compte = 'depot') as depot,
    (SELECT montant FROM comptes WHERE type_compte = 'caisse') as caisse,
    (SELECT quantite FROM stock_devises WHERE devise = 'USDT') as stock_usdt,
    (SELECT cmup FROM stock_devises WHERE devise = 'USDT') as cmup_usdt,
    (SELECT COUNT(*) FROM transactions WHERE type = 'vente' AND statut = 'committed') as total_ventes,
    (SELECT COUNT(*) FROM transactions WHERE type = 'achat' AND statut = 'committed') as total_achats,
    (SELECT SUM(benefice_cache) FROM transactions WHERE type = 'vente' AND benefice_cache IS NOT NULL AND statut = 'committed') as benefices_caches_total,
    (SELECT SUM(benefice_visible) FROM transactions WHERE type = 'vente' AND statut = 'committed') as benefices_visibles_total;

-- Vue 4: Statistiques par jour
CREATE OR REPLACE VIEW vue_stats_journalier AS
SELECT 
    DATE(date) as jour,
    COUNT(*) as nb_transactions,
    SUM(CASE WHEN type = 'vente' THEN 1 ELSE 0 END) as nb_ventes,
    SUM(CASE WHEN type = 'achat' THEN 1 ELSE 0 END) as nb_achats,
    SUM(CASE WHEN type = 'vente' THEN benefice_visible ELSE 0 END) as benefices_visibles_jour,
    SUM(CASE WHEN type = 'vente' THEN benefice_cache ELSE 0 END) as benefices_caches_jour,
    SUM(CASE WHEN type = 'vente' AND taux_vente_cache IS NOT NULL THEN 1 ELSE 0 END) as ventes_cachees
FROM transactions
WHERE statut = 'committed'
GROUP BY DATE(date)
ORDER BY jour DESC;

-- Vue 5: Distribution des partenaires avec détails
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
    (dp.benefice_visible + COALESCE(dp.benefice_cache, 0)) as benefice_total
FROM distribution_partenaires dp
LEFT JOIN transactions t ON dp.transaction_id = t.id
ORDER BY t.date DESC;

-- Vue 6: Extraits de compte clients
CREATE OR REPLACE VIEW vue_extrait_clients AS
SELECT 
    cc.id,
    cc.nom,
    cc.numero,
    cc.adresse,
    cc.solde,
    COUNT(t.id) as nb_transactions,
    SUM(CASE WHEN t.type = 'vente' THEN 1 ELSE 0 END) as nb_ventes,
    SUM(CASE WHEN t.type = 'achat' THEN 1 ELSE 0 END) as nb_achats,
    cc.created_at,
    cc.updated_at
FROM comptes_clients cc
LEFT JOIN transactions t ON FIND_IN_SET(cc.nom, t.client) > 0
GROUP BY cc.id;

-- Vue 7: Extraits de compte fournisseurs
CREATE OR REPLACE VIEW vue_extrait_fournisseurs AS
SELECT 
    cf.id,
    cf.nom,
    cf.numero,
    cf.adresse,
    cf.solde_xaf,
    cf.solde_usdt,
    cf.dette_usdt,
    COUNT(t.id) as nb_transactions,
    SUM(CASE WHEN t.type = 'vente' THEN 1 ELSE 0 END) as nb_ventes,
    SUM(CASE WHEN t.type = 'achat' THEN 1 ELSE 0 END) as nb_achats,
    cf.created_at,
    cf.updated_at
FROM comptes_fournisseurs cf
LEFT JOIN transactions t ON t.id_fournisseur = cf.id
GROUP BY cf.id;

-- ============================================================
-- PROCÉDURES STOCKÉES
-- ============================================================

-- Procédure 1: Achat USDT
DROP PROCEDURE IF EXISTS proc_achat_usdt;
DELIMITER $$
CREATE PROCEDURE proc_achat_usdt(
    IN p_transaction_id VARCHAR(100),
    IN p_user_id VARCHAR(50),
    IN p_quantite DECIMAL(18,8),
    IN p_taux_unitaire DECIMAL(18,8),
    IN p_use_caisse BOOLEAN,
    IN p_fournisseur VARCHAR(255)
)
BEGIN
    DECLARE v_stock_actuel DECIMAL(18,8);
    DECLARE v_cmup_actuel DECIMAL(18,8);
    DECLARE v_nouveau_cmup DECIMAL(18,8);
    DECLARE v_prix_total DECIMAL(18,2);
    DECLARE v_compte_source VARCHAR(10);
    DECLARE v_solde_source DECIMAL(18,2);
    
    -- Récupérer stock et CMUP actuels
    SELECT quantite, cmup INTO v_stock_actuel, v_cmup_actuel
    FROM stock_devises WHERE devise = 'USDT';
    
    -- Calculer prix total et nouveau CMUP
    SET v_prix_total = p_quantite * p_taux_unitaire;
    
    IF v_stock_actuel <= 0 THEN
        SET v_nouveau_cmup = p_taux_unitaire;
    ELSE
        SET v_nouveau_cmup = ((v_stock_actuel * v_cmup_actuel) + (p_quantite * p_taux_unitaire)) 
                            / (v_stock_actuel + p_quantite);
    END IF;
    
    -- Déterminer compte source
    SET v_compte_source = IF(p_use_caisse, 'caisse', 'depot');
    
    -- Vérifier solde
    SELECT montant INTO v_solde_source FROM comptes WHERE type_compte = v_compte_source;
    
    IF v_solde_source < v_prix_total THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Solde insuffisant';
    END IF;
    
    -- Mettre à jour stock USDT
    UPDATE stock_devises 
    SET quantite = quantite + p_quantite,
        cmup = v_nouveau_cmup
    WHERE devise = 'USDT';
    
    -- Diminuer compte source
    UPDATE comptes 
    SET montant = montant - v_prix_total
    WHERE type_compte = v_compte_source;
    
    -- Créer transaction
    INSERT INTO transactions (
        id, user_id, type, devise, quantite, 
        taux_achat_unitaire, prix_achat_total, use_caisse,
        ancien_cmup, nouveau_cmup, fournisseur, statut
    ) VALUES (
        p_transaction_id, p_user_id, 'achat', 'USDT', p_quantite,
        p_taux_unitaire, v_prix_total, p_use_caisse,
        v_cmup_actuel, v_nouveau_cmup, p_fournisseur, 'committed'
    );
END$$
DELIMITER ;

-- Procédure 2: Finaliser une vente (ajouter données cachées)
DROP PROCEDURE IF EXISTS proc_finaliser_vente;
DELIMITER $$
CREATE PROCEDURE proc_finaliser_vente(
    IN p_transaction_id VARCHAR(100),
    IN p_taux_vente_cache DECIMAL(18,2),
    IN p_pct_porteur INT,
    IN p_pct_associe INT
)
BEGIN
    DECLARE v_quantite DECIMAL(18,8);
    DECLARE v_valeur_achat DECIMAL(18,2);
    DECLARE v_valeur_vente_cachee DECIMAL(18,2);
    DECLARE v_benefice_cache DECIMAL(18,2);
    DECLARE v_part_porteur DECIMAL(18,2);
    DECLARE v_part_associe DECIMAL(18,2);
    DECLARE v_benefice_visible DECIMAL(18,2);
    
    -- Récupérer données transaction
    SELECT quantite_vente, valeur_achat_xaf, benefice_visible
    INTO v_quantite, v_valeur_achat, v_benefice_visible
    FROM transactions
    WHERE id = p_transaction_id AND type = 'vente' AND statut = 'pending';
    
    IF v_quantite IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Transaction non trouvée ou déjà finalisée';
    END IF;
    
    -- Calculer avec taux caché
    SET v_valeur_vente_cachee = v_quantite * p_taux_vente_cache;
    SET v_benefice_cache = v_valeur_vente_cachee - v_valeur_achat;
    SET v_part_porteur = v_benefice_cache * (p_pct_porteur / 100);
    SET v_part_associe = v_benefice_cache * (p_pct_associe / 100);
    
    -- Mettre à jour transaction
    UPDATE transactions SET
        taux_vente_cache = p_taux_vente_cache,
        valeur_vente_cachee = v_valeur_vente_cachee,
        benefice_cache = v_benefice_cache,
        part_porteur_cachee = v_part_porteur,
        part_associe_cachee = v_part_associe,
        pourcentage_porteur = p_pct_porteur,
        pourcentage_associe = p_pct_associe,
        statut = 'committed'
    WHERE id = p_transaction_id;
    
    -- Ajouter différence à la caisse (différence entre caché et visible)
    UPDATE comptes 
    SET montant = montant + (v_valeur_vente_cachee - (v_quantite * (SELECT taux_vente_visible FROM transactions WHERE id = p_transaction_id)))
    WHERE type_compte = 'caisse';
    
    -- Mettre à jour répartition
    UPDATE repartition_profits 
    SET total_accumule_cache = total_accumule_cache + v_part_porteur
    WHERE role = 'porteur';
    
    UPDATE repartition_profits 
    SET total_accumule_cache = total_accumule_cache + v_part_associe
    WHERE role = 'associe';
    
    -- Créer entrée dans distribution_partenaires
    INSERT INTO distribution_partenaires (transaction_id, role, benefice_visible, benefice_cache, pourcentage)
    VALUES 
        (p_transaction_id, 'porteur', v_benefice_visible * (p_pct_porteur / 100), v_part_porteur, p_pct_porteur),
        (p_transaction_id, 'associe', v_benefice_visible * (p_pct_associe / 100), v_part_associe, p_pct_associe);
END$$
DELIMITER ;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Après insertion transaction vente (pending)
DROP TRIGGER IF EXISTS after_transaction_vente_insert;
DELIMITER $$
CREATE TRIGGER after_transaction_vente_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.type = 'vente' AND NEW.statut = 'pending' THEN
        -- Mettre à jour stock USDT
        UPDATE stock_devises 
        SET quantite = quantite - NEW.usdt_consomme
        WHERE devise = 'USDT';
        
        -- Ajouter valeur visible à la caisse
        UPDATE comptes 
        SET montant = montant + NEW.valeur_vente_visible
        WHERE type_compte = 'caisse';
        
        -- Mettre à jour répartition visible
        UPDATE repartition_profits 
        SET total_accumule_visible = total_accumule_visible + NEW.part_porteur_visible
        WHERE role = 'porteur';
        
        UPDATE repartition_profits 
        SET total_accumule_visible = total_accumule_visible + NEW.part_associe_visible
        WHERE role = 'associe';
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- INDEX SUPPLÉMENTAIRES POUR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transactions_date_type ON transactions(date, type);
CREATE INDEX IF NOT EXISTS idx_transactions_statut_type ON transactions(statut, type);
CREATE INDEX IF NOT EXISTS idx_logs_date_type ON logs(date_heure, type_evenement);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
