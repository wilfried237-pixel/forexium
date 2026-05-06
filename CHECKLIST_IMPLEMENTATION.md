# FOREXIUM v5.6.0+ — Checklist d'implémentation

## 📋 Phase 1: Setup Base de données (15 min)

- [ ] Sauvegarde actuelle de la BD
  ```bash
  mysqldump -u root -p forexium_v7 > backup_v5.6.0.sql
  ```

- [ ] Exécuter migration
  ```bash
  mysql -u root -p forexium_v7 < database/migrate-v5.6.1.sql
  ```

- [ ] Vérifier colonnes ajoutées
  ```sql
  DESCRIBE comptes_clients;  -- Doit avoir quartier
  DESCRIBE transactions;     -- Doit avoir payment_status
  ```

- [ ] Redémarrer backend
  ```bash
  npm restart  # ou npm start
  ```

---

## 📋 Phase 2: Tests API (30 min)

- [ ] Tester suppression devise
  ```bash
  bash test-api.sh
  # Ou manuellement via Postman/Insomnia
  ```

- [ ] Créer client avec quartier
  ```bash
  POST /api/accounts/clients
  {
    "nom": "TestClient",
    "prenom": "Test",
    "quartier": "TestQtrr",
    "telephone": "+237000000000",
    "ville": "TestCity"
  }
  ```

- [ ] Valider vente avec paiement
  ```bash
  PUT /api/transactions/TX_ID/valider
  {
    "payment_status": "partial",
    "montant_paye": 50000
  }
  ```

- [ ] Vérifier extrait de compte client
  ```bash
  GET /api/accounts/clients/1/transactions
  ```

---

## 📋 Phase 3: Frontend (4-6 heures)

### 3.1 - Onglet Clients (1-2h)

- [ ] Créer section "Clients" dans Dashboard
  - Voir: `FRONTEND_MODIFICATIONS.md` section "Ajouter onglet Clients"
  
- [ ] Afficher tableau clients
  - Colonnes: Nom, Prénom, Ville, Quartier, Téléphone, Solde
  
- [ ] Ajouter bouton "Nouveau client"
  
- [ ] Voir extrait de compte
  - Click sur client → Modal avec historique
  
- [ ] Tester:
  - [ ] Affichage clients
  - [ ] Quartier visible
  - [ ] Clic affiche historique
  - [ ] Solde correct

### 3.2 - Infos client dans vente (1-2h)

- [ ] Modifier TransactionModal
  - Voir: `FRONTEND_MODIFICATIONS.md` section "TransactionModal"
  
- [ ] Ajouter affichage infos client
  - Prénom, Téléphone, Ville, Quartier
  
- [ ] Afficher dynamiquement au sélection client
  
- [ ] Tester:
  - [ ] Infos apparaissent
  - [ ] Quartier affiché
  - [ ] Synchronisation client ↔ infos

### 3.3 - Boutons paiement redesigned (1-2h)

- [ ] Ajouter 3 boutons (Payé | Partiel | Non payé)
  - Voir: `FRONTEND_MODIFICATIONS.md` section "Boutons paiement redesigned"
  
- [ ] Champ montant payé si partiel
  
- [ ] Afficher montant dû
  
- [ ] Code couleur:
  - 🟢 Vert = Payé
  - 🟡 Jaune = Partiel
  - 🔴 Rouge = Non payé
  
- [ ] Tester:
  - [ ] Boutons visibles
  - [ ] Couleurs correctes
  - [ ] Champ montant partiel
  - [ ] Montant dû calculé
  - [ ] Validation enregistre payment_status

### 3.4 - Intégration paiement (30 min)

- [ ] Lors de validation vente
  - Appeler `apiValiderTransaction(txId, paymentStatus, montantPaye)`
  
- [ ] Toast de confirmation
  
- [ ] Recharger transactions
  
- [ ] Tester:
  - [ ] Transaction enregistrée
  - [ ] Payment_status en DB ✓
  - [ ] Montant payé en DB ✓

---

## 📋 Phase 4: Tests utilisateur (1h)

### Scénario 1: Vente complète payée
- [ ] Créer client avec quartier
- [ ] Créer vente
- [ ] Sélectionner client → infos visibles
- [ ] Cliquer "Payé"
- [ ] Valider
- [ ] Vérifier extrait de compte client

### Scénario 2: Vente partielle
- [ ] Créer vente
- [ ] Cliquer "Partiel"
- [ ] Saisir montant (ex: 50%)
- [ ] Valider
- [ ] Vérifier montant_paye + montant_reste en DB

### Scénario 3: Gestion clients
- [ ] Créer client
- [ ] Modifier quartier
- [ ] Voir extrait de compte
- [ ] Vérifier historique transactions

### Scénario 4: Devise (fix)
- [ ] Créer devise test
- [ ] Supprimer devise
- [ ] ✅ Doit fonctionner (fix appliqué)

---

## 📋 Phase 5: Déploiement (30 min)

- [ ] Backup production
  ```bash
  mysqldump -u root -p forexium_v7 > backup_prod_v5.6.0.sql
  ```

- [ ] Appliquer migration
  ```bash
  mysql -u root -p forexium_v7 < database/migrate-v5.6.1.sql
  ```

- [ ] Redémarrer services
  ```bash
  npm restart       # Backend
  npm run dev       # Frontend (dev) ou build (prod)
  ```

- [ ] Tests finaux
  - Vente simple
  - Vente avec paiement partiel
  - Client avec quartier
  - Extrait de compte

- [ ] Release notes
  ```
  FOREXIUM v5.6.1 — Released
  
  Fixes:
  ✅ Suppression devise (erreur DB corrigée)
  
  Features:
  ✅ Champ quartier pour clients
  ✅ Gestion paiements partiels
  ✅ Statuts paiement (Payé/Partiel/Non payé)
  ✅ Onglet clients avec extrait de compte
  ✅ Interface vente redesignée
  ```

---

## 🔍 Vérifications finales

### Base de données
```sql
-- Vérifier migration appliquée
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME='comptes_clients' AND COLUMN_NAME='quartier';
-- Doit retourner 'quartier'

-- Vérifier paiements
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME='transactions' AND COLUMN_NAME='payment_status';
-- Doit retourner 'payment_status'
```

### Backend (npm logs)
```bash
# Pas d'erreur pour devises.delete
# Pas d'erreur pour accounts.post/put
# Pas d'erreur pour transactions.put /valider
```

### Frontend (console)
```bash
# Pas d'erreur webpack
# API calls réussis (200 status)
# Traductions chargées (FR/EN)
```

---

## 📞 Support & Rollback

### Si erreur migration
```bash
# Restaurer backup
mysql -u root -p forexium_v7 < backup_v5.6.0.sql
```

### Si erreur frontend
- Consulter console browser (F12)
- Consulter logs backend
- Voir `MODIFICATIONS_V5.6.1.md` section Dépannage

### Contacts
- Docs: `MODIFICATIONS_V5.6.1.md`
- Guides: `FRONTEND_MODIFICATIONS.md`
- Tests: `test-api.sh`

---

## ✅ Signature validation finale

Une fois tout complété:

```
Validé par: ________________  Date: __________

✅ Backend tests passés
✅ Frontend UI implémentée  
✅ Tests utilisateur OK
✅ Base de données OK
✅ Prêt pour production

Notes: _________________________________
_____________________________________
```

---

**Durée estimée**: 6-8 heures  
**Complexité**: Moyen  
**Risque**: Bas (migration simple, rétrocompatible)  
**Rollback**: Facile (1 minute)

Bon travail! 🚀
