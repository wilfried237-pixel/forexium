# FOREXIUM v5.6.0+ — Guide Modifications

## 📋 Résumé des modifications apportées

### ✅ BACKEND

#### 1. **Correction suppression devise** ✔️
- **Fichier**: `backend/routes/devises.js`
- **Problème**: La route DELETE utilisait la table `devises` au lieu de `devises_personnalisees`
- **Solution**: Corrigé ligne 182
```javascript
// AVANT
await query('DELETE FROM devises WHERE id = ?', [id]);
// APRÈS
await query('DELETE FROM devises_personnalisees WHERE id = ?', [id]);
```

#### 2. **API Clients étendue** ✔️
- **Fichier**: `backend/routes/accounts.js`
- **Nouveau champ**: `quartier` VARCHAR(100)
- **Routes modifiées**:
  - `POST /api/accounts/clients` - Accepte nom, prenom, ville, adresse, **quartier**, telephone
  - `PUT /api/accounts/clients/:id` - Permet modifier **quartier**
- **Validation**: Même pattern que ville (lettres uniquement)

#### 3. **Validation de transaction** ✔️
- **Fichier**: `backend/routes/transactions.js`
- **Nouveau endpoint**: `PUT /api/transactions/:id/valider`
- **Payload**:
```json
{
  "payment_status": "paid|partial|unpaid",
  "montant_paye": 123456 // optionnel, requis si partial
}
```
- **Comportement**:
  - `paid`: Montant payé = montant total, montant reste = 0
  - `unpaid`: Montant payé = 0, montant reste = montant total
  - `partial`: Montant payé = valeur saisie, montant reste = total - payé
  - Si montant_paye > total → surplus_client = différence

#### 4. **Base de données** ✔️
- **Fichier**: `database/database_setup.sql`
- **Ajout**: Champ `quartier` à table `comptes_clients`
- **Fichier migration**: `database/migrate-v5.6.1.sql`

### ✅ FRONTEND

#### 1. **API client** ✔️
- **Fichier**: `frontend/src/api.js`
- **Nouvelle fonction**: `apiValiderTransaction(txId, paymentStatus, montantPaye)`
```javascript
export const apiValiderTransaction = async (txId, paymentStatus, montantPaye = null) => {
  // Valide une transaction avec statut paiement
}
```

#### 2. **Import API** ✔️
- **Fichier**: `frontend/src/App.jsx` (ligne 6)
- **Ajout**: `apiValiderTransaction` dans les imports

#### 3. **Traductions** ✔️
- **Fichier**: `frontend/src/App.jsx` (TRANSLATIONS)
- **FR** (lignes ~150-160): Ajout termes clients/paiements
- **EN** (lignes ~260-270): Ajout termes équivalents en anglais

### 🔧 Configuration requise

#### Migration base de données
```bash
cd database/
mysql -u root -p forexium_v7 < migrate-v5.6.1.sql
```

#### Ou manuellement dans MySQL:
```sql
ALTER TABLE comptes_clients ADD COLUMN IF NOT EXISTS quartier VARCHAR(100) DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_status ENUM('unpaid','partial','paid','overpaid') DEFAULT 'paid';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS montant_paye DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS montant_reste DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS surplus_client DECIMAL(15,2) DEFAULT 0;
```

---

## 📝 Guide d'utilisation

### 1. Gestion clients

**Créer un client avec quartier**:
```javascript
POST /api/accounts/clients
{
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "+237680123456",
  "ville": "Yaoundé",
  "quartier": "Bastos",
  "adresse": "Rue 123, Immeuble XYZ"
}
```

**Voir tous les clients**:
```javascript
GET /api/accounts/clients
```
Retour: Array de clients avec `nom`, `prenom`, `ville`, `quartier`, `telephone`, `solde`

**Voir transactions d'un client**:
```javascript
GET /api/accounts/clients/:id/transactions
```

### 2. Validation des transactions avec paiement

**Valider une vente comme complètement payée**:
```javascript
PUT /api/transactions/{tx_id}/valider
{
  "payment_status": "paid"
}
```

**Enregistrer un paiement partiel**:
```javascript
PUT /api/transactions/{tx_id}/valider
{
  "payment_status": "partial",
  "montant_paye": 500000
}
```

**Marquer comme non payée**:
```javascript
PUT /api/transactions/{tx_id}/valider
{
  "payment_status": "unpaid"
}
```

### 3. Statuts de paiement

| Statut | Couleur | Signification |
|--------|--------|---------------|
| `paid` | 🟢 Vert | Complètement payé |
| `partial` | 🟡 Jaune | Paiement partiel |
| `unpaid` | 🔴 Rouge | Non payé |
| `overpaid` | 🟣 Violet | Trop-payé (surplus) |

---

## 🖼️ Interface recommandée (à implémenter au frontend)

### Onglet Clients
- Liste clients avec: Nom, Prénom, Ville, Quartier, Téléphone
- Extrait de compte: Solde, Dernières transactions
- Actions: Modifier, Ajouter transaction, Voir historique

### Section Vente (redesigned)
1. **Infos client** (nouvelle section)
   - Dropdown client existant OU formulaire rapide création
   - Affiche: Nom, Prénom, Téléphone, Ville, Quartier
   
2. **Calculs transaction** (existing)
   - Devise, Taux, Quantité, etc.
   
3. **Statut paiement** (NEW - repositionné bas-droit)
   - Trois boutons: ✅ Payé | ⚡ Partiel | ❌ Non payé
   - Si partiel: champ montant payé
   - Montant dû = montant_total - montant_paye
   
4. **Actions**
   - Bouton "Enregistrer et valider" → POST transaction + PUT valider

---

## 🐛 Dépannage

### Erreur: "Devise supprimée" ne fonctionne pas
→ Vérifier que la table est bien `devises_personnalisees` en base

### Les quartiers ne s'affichent pas
→ Vérifier que la colonne `quartier` existe: 
```sql
DESCRIBE comptes_clients;
```

### Paiements partiels non enregistrés
→ S'assurer que le frontend envoie `payment_status` et `montant_paye`

### API retourne erreur 500
→ Vérifier les logs backend pour la trace complète

---

## 🚀 Prochaines étapes recommandées

1. **Frontend UI/UX**
   - Créer onglet "Clients" avec extrait de compte
   - Redesigner formulaire vente avec champs client visibles
   - Ajouter boutons paiement intuitifs (bas-droit)
   - Ajouter codes couleur pour statuts paiement

2. **Améliorations**
   - Recherche clients par nom/téléphone
   - Rapport clients avec soldes
   - Export liste clients CSV
   - Historique paiements par client

3. **Optionnel**
   - SMS notification paiement
   - Formulaire paiement rapide (modal)
   - Dashboard client (solde, dernières transactions)

---

## 📞 Support

Pour toute question, consulter:
- `API_DOCUMENTATION.md` — Endpoints complets
- `README.md` — Configuration générale
- Code source: `backend/routes/`, `frontend/src/`
