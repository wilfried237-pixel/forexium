-- ============================================================
-- MIGRATION v5.6.0 → v5.6.1
-- Ajout champ quartier + paiements partiels
-- ============================================================

-- Vérifier et ajouter le champ quartier à comptes_clients
ALTER TABLE comptes_clients ADD COLUMN IF NOT EXISTS quartier VARCHAR(100) DEFAULT NULL;

-- Vérifier que les champs paiement existent (normalement déjà dans la v5.6.0)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_status ENUM('unpaid','partial','paid','overpaid') DEFAULT 'paid';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS montant_paye DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS montant_reste DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS surplus_client DECIMAL(15,2) DEFAULT 0;

-- Index pour recherche rapide par quartier
CREATE INDEX IF NOT EXISTS idx_client_quartier ON comptes_clients(quartier);

-- Mettre à jour les transactions existantes (pas de paiements partiels enregistrés)
UPDATE transactions SET payment_status = 'paid', montant_paye = valeur_vente_visible WHERE type = 'vente' AND payment_status = 'paid';

-- ============================================================
-- FIN MIGRATION
-- ============================================================
