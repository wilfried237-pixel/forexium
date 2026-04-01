-- ============================================================
-- FOREXIUM V5.6.0 - BASE DE DONNÉES MySQL
-- ============================================================

-- Créer la base
CREATE DATABASE IF NOT EXISTS forexium_v5 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE forexium_v5;

-- ============================================================
-- TABLE 1: USERS (Utilisateurs)
-- ============================================================

CREATE TABLE users (
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

-- Aucun utilisateur par défaut — inscription via l'interface

-- ============================================================
-- TABLE 2: STOCK_DEVISES (Stock USDT uniquement)
-- ============================================================

CREATE TABLE stock_devises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    devise VARCHAR(10) UNIQUE NOT NULL DEFAULT 'USDT',
    quantite DECIMAL(18,8) DEFAULT 0,
    cmup DECIMAL(18,8) DEFAULT 0,
    valeur_totale DECIMAL(18,2) AS (quantite * cmup) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_devise (devise)
) ENGINE=InnoDB;

-- Initialisation USDT
INSERT INTO stock_devises (devise, quantite, cmup) VALUES ('USDT', 0, 0);

-- ============================================================
-- TABLE 3: COMPTES (Dépôt et Caisse)
-- ============================================================

CREATE TABLE comptes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_compte ENUM('depot', 'caisse') UNIQUE NOT NULL,
    montant DECIMAL(18,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Initialisation
INSERT INTO comptes (type_compte, montant) VALUES
('depot', 0),
('caisse', 500000);

-- ============================================================
-- TABLE 4: TRANSACTIONS
-- ============================================================

CREATE TABLE transactions (
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
    statut ENUM('pending', 'porteur_pending', 'committed') DEFAULT 'pending',
    
    -- Champs ACHAT USDT
    devise VARCHAR(10),
    quantite DECIMAL(18,8),
    taux_achat_unitaire DECIMAL(18,8),
    prix_achat_total DECIMAL(18,2),
    use_caisse BOOLEAN DEFAULT FALSE,
    ancien_cmup DECIMAL(18,8),
    nouveau_cmup DECIMAL(18,8),
    
    -- Champs VENTE (V5.1.0)
    devise_vente VARCHAR(10), -- RMB ou USD
    taux_conversion DECIMAL(18,8), -- Combien pour 1 USDT
    taux_achat_xaf DECIMAL(18,8), -- CMUP / taux_conversion
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
    usdt_restant DECIMAL(18,8),
    
    -- Métadonnées
    metadata JSON,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_date (date DESC),
    INDEX idx_statut (statut),
    INDEX idx_devise_vente (devise_vente)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE 5: REPARTITION_PROFITS (Cumul porteurs/associés)
-- ============================================================

CREATE TABLE repartition_profits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('porteur', 'associe') UNIQUE NOT NULL,
    pourcentage_defaut DECIMAL(5,2) DEFAULT 70.00,
    total_accumule_visible DECIMAL(18,2) DEFAULT 0,
    total_accumule_cache DECIMAL(18,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- Initialisation
INSERT INTO repartition_profits (role, pourcentage_defaut) VALUES
('porteur', 70.00),
('associe', 30.00);

-- ============================================================
-- TABLE 6: LOGS (Journal des activités)
-- ============================================================

CREATE TABLE logs (
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
-- TABLE 7: SETTINGS (Paramètres système)
-- ============================================================

CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cle (cle)
) ENGINE=InnoDB;

-- Paramètres initiaux
INSERT INTO settings (cle, valeur, description) VALUES
('hidden_password', '1234', 'Mot de passe pour vente cachée'),
('profit_share_porteur', '70', 'Pourcentage porteur par défaut'),
('profit_share_associe', '30', 'Pourcentage associé par défaut'),
('devise_stock', 'USDT', 'Devise unique pour le stock'),
('devises_vente', '["RMB","USD"]', 'Devises de vente disponibles'),
('app_version', '5.6.0', 'Version de l\'application');

-- ============================================================
-- TABLE 8: SESSIONS (Gestion des sessions)
-- ============================================================

CREATE TABLE sessions (
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
    CASE 
        WHEN t.type = 'vente' AND t.taux_vente_cache IS NOT NULL 
        THEN t.valeur_vente_cachee
        ELSE t.valeur_vente_visible
    END as valeur_vente_finale,
    CASE 
        WHEN t.type = 'vente' AND t.benefice_cache IS NOT NULL 
        THEN t.benefice_cache
        ELSE t.benefice_visible
    END as benefice_final
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id;

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

-- ============================================================
-- PROCÉDURES STOCKÉES
-- ============================================================

-- Procédure 1: Achat USDT
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
END$$
DELIMITER ;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Après insertion transaction vente (pending)
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

CREATE INDEX idx_transactions_date_type ON transactions(date, type);
CREATE INDEX idx_transactions_statut_type ON transactions(statut, type);
CREATE INDEX idx_logs_date_type ON logs(date_heure, type_evenement);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
