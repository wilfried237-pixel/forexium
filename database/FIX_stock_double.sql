-- ============================================================
--  FOREXIUM v7 — CORRECTIF STOCK × 2
--  Compatible MySQL 5.6 / 5.7
--
--  PROBLÈME : quand un achat est enregistré, le stock USDT
--  est mis à jour deux fois :
--    1) par le trigger  after_achat_insert  (dans la BD)
--    2) par le backend  transactions.js     (UPDATE stock …)
--  → résultat : 1000 USDT achetés → 2000 USDT en stock.
--
--  SOLUTION : supprimer les triggers stock/vente/distribution
--  et laisser uniquement le backend gérer ces mises à jour.
--
--  À exécuter UNE SEULE FOIS dans phpMyAdmin → onglet SQL.
-- ============================================================

USE forexium_v7;

-- Supprimer le trigger qui double le stock à l'achat
DROP TRIGGER IF EXISTS after_achat_insert;

-- Supprimer le trigger qui double la déduction à la vente
DROP TRIGGER IF EXISTS after_vente_insert;

-- Supprimer le trigger qui double la distribution des profits
DROP TRIGGER IF EXISTS after_vente_distribution;

-- Vérification : les triggers ne doivent plus apparaître
SHOW TRIGGERS LIKE 'after_%';

SELECT 'Correctif stock × 2 appliqué ✅' AS statut;
