-- ═══════════════════════════════════════════════════════════════
-- TABLES POUR LE SUIVI DES PAIEMENTS
-- ═══════════════════════════════════════════════════════════════

-- Table d'historique des paiements clients
CREATE TABLE IF NOT EXISTS payment_history (
  id VARCHAR(50) PRIMARY KEY,
  transaction_id VARCHAR(50) NOT NULL,
  client_id INT NOT NULL,
  montant DECIMAL(15, 2) NOT NULL,
  devise VARCHAR(10) DEFAULT 'XAF',
  date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (client_id) REFERENCES comptes_clients(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_transaction (transaction_id),
  INDEX idx_client (client_id),
  INDEX idx_date (date_paiement)
);

-- Table d'historique des paiements fournisseurs
CREATE TABLE IF NOT EXISTS payment_history_fournisseurs (
  id VARCHAR(50) PRIMARY KEY,
  fournisseur_id INT NOT NULL,
  transaction_id VARCHAR(50),
  montant DECIMAL(15, 2) NOT NULL,
  devise VARCHAR(10) DEFAULT 'XAF',
  date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fournisseur_id) REFERENCES comptes_fournisseurs(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_fournisseur (fournisseur_id),
  INDEX idx_transaction (transaction_id),
  INDEX idx_date (date_paiement)
);

-- Ajouter les colonnes manquantes si elles n'existent pas
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS montant_paye DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS montant_reste DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Ajouter les colonnes au fournisseur si elles n'existent pas
ALTER TABLE comptes_fournisseurs ADD COLUMN IF NOT EXISTS solde_xaf DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE comptes_fournisseurs ADD COLUMN IF NOT EXISTS solde_usdt DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE comptes_fournisseurs ADD COLUMN IF NOT EXISTS dette_usdt DECIMAL(15, 2) DEFAULT 0;

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_transactions_montant_paye ON transactions(montant_paye);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_solde ON comptes_fournisseurs(solde_usdt, solde_xaf);

-- Table pour l'historique des paiements clients
CREATE TABLE IF NOT EXISTS payment_history (
  id VARCHAR(64) PRIMARY KEY,
  transaction_id VARCHAR(64),
  client_id INT,
  montant DECIMAL(15,2) DEFAULT 0,
  devise VARCHAR(10) DEFAULT 'XAF',
  date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(64),
  notes TEXT,
  INDEX idx_payment_history_client (client_id),
  INDEX idx_payment_history_tx (transaction_id)
);

-- Table pour l'historique des paiements fournisseurs
CREATE TABLE IF NOT EXISTS payment_history_fournisseurs (
  id VARCHAR(64) PRIMARY KEY,
  fournisseur_id INT,
  montant DECIMAL(15,2) DEFAULT 0,
  devise VARCHAR(10) DEFAULT 'XAF',
  date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(64),
  notes TEXT,
  transaction_id VARCHAR(64),
  INDEX idx_payment_history_fournisseur (fournisseur_id),
  INDEX idx_payment_history_fournisseur_tx (transaction_id)
);
