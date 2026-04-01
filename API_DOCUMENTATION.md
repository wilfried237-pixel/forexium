# 📡 FOREXIUM API - Documentation Complète

## 🌐 Base URL

```
Development: http://localhost:3000/api
Production:  https://votre-domaine.com/api
```

## 🔑 Authentification

Toutes les routes sauf `/api/auth/login` nécessitent un token JWT.

**Header requis :**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📚 Endpoints

### **1. AUTHENTIFICATION**

#### **POST /api/auth/login**

Connexion utilisateur

**Request:**
```json
{
  "email": "porteur@forexium.com",
  "password": "1234"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u1",
    "email": "porteur@forexium.com",
    "role": "porteur",
    "name": "Marcus"
  }
}
```

**Response Error (401):**
```json
{
  "error": "Email ou mot de passe incorrect"
}
```

---

### **2. STOCK USDT**

#### **GET /api/stock**

Obtenir le stock USDT actuel

**Headers:** `Authorization: Bearer TOKEN`

**Response (200):**
```json
{
  "devise": "USDT",
  "quantite": 1250.5678,
  "cmup": 653.25,
  "valeur_totale": 816890.63
}
```

#### **GET /api/stock/history?limit=50**

Historique des achats USDT

**Query Params:**
- `limit` (optionnel) : Nombre de résultats (défaut: 50)

**Response (200):**
```json
{
  "history": [
    {
      "id": "TX_1234567890",
      "date": "2026-03-14T10:30:00.000Z",
      "type": "achat",
      "quantite": 100.0,
      "taux_achat_unitaire": 655.0,
      "ancien_cmup": 650.0,
      "nouveau_cmup": 653.25,
      "fournisseur": "Binance"
    }
  ]
}
```

---

### **3. TRANSACTIONS**

#### **GET /api/transactions?limit=100&type=vente&statut=committed**

Liste des transactions

**Query Params:**
- `limit` (optionnel) : Nombre de résultats (défaut: 100)
- `type` (optionnel) : achat, vente, depense, retrait, versement
- `statut` (optionnel) : pending, committed

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "TX_1234567890",
      "user_id": "u1",
      "type": "vente",
      "date": "2026-03-14T10:30:00.000Z",
      "statut": "committed",
      "devise_vente": "USD",
      "quantite_vente": 500.0,
      "taux_conversion": 0.98,
      "taux_achat_xaf": 666.58,
      "taux_vente_visible": 680.0,
      "taux_vente_cache": 685.0,
      "valeur_achat_xaf": 333290.0,
      "valeur_vente_visible": 340000.0,
      "valeur_vente_cachee": 342500.0,
      "benefice_visible": 6710.0,
      "benefice_cache": 9210.0,
      "client": "Jean Dupont",
      "user_name": "Marcus",
      "user_role": "porteur"
    }
  ]
}
```

#### **POST /api/transactions**

Créer une transaction

**Request Body - ACHAT USDT:**
```json
{
  "type": "achat",
  "quantite": 100.0,
  "taux_unitaire": 655.0,
  "use_caisse": false,
  "fournisseur": "Binance"
}
```

**Request Body - VENTE:**
```json
{
  "type": "vente",
  "devise_vente": "USD",
  "taux_conversion": 0.98,
  "quantite_vente": 500.0,
  "taux_vente_visible": 680.0,
  "pct_porteur": 70,
  "pct_associe": 30,
  "client": "Jean Dupont"
}
```

**Request Body - DÉPENSE:**
```json
{
  "type": "depense",
  "montant": 50000,
  "categorie": "Loyer/Rent",
  "description": "Loyer bureau Mars 2026"
}
```

**Request Body - RETRAIT:**
```json
{
  "type": "retrait",
  "montant": 100000,
  "beneficiaire": "Marcus"
}
```

**Request Body - VERSEMENT:**
```json
{
  "type": "versement",
  "montant": 500000
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Vente initiée (en attente finalisation)",
  "transaction_id": "TX_1234567890",
  "status": "pending"
}
```

#### **PUT /api/transactions/:id/finaliser**

Finaliser une vente avec données cachées

**URL Params:**
- `id` : ID de la transaction

**Request Body:**
```json
{
  "taux_vente_cache": 685.0,
  "pct_porteur": 70,
  "pct_associe": 30
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vente finalisée avec succès",
  "transaction_id": "TX_1234567890"
}
```

---

### **4. STATISTIQUES**

#### **GET /api/stats**

Statistiques globales

**Response (200):**
```json
{
  "depot": 2500000.0,
  "caisse": 850000.0,
  "stock_usdt": 1250.5678,
  "cmup_usdt": 653.25,
  "total_ventes": 45,
  "total_achats": 12,
  "benefices_visibles_total": 250000.0,
  "benefices_caches_total": 350000.0
}
```

#### **GET /api/stats/daily?days=30**

Statistiques journalières

**Query Params:**
- `days` (optionnel) : Nombre de jours (défaut: 30)

**Response (200):**
```json
{
  "stats": [
    {
      "jour": "2026-03-14",
      "nb_transactions": 8,
      "nb_ventes": 5,
      "nb_achats": 2,
      "benefices_visibles_jour": 35000.0,
      "benefices_caches_jour": 48000.0,
      "ventes_cachees": 3
    }
  ]
}
```

#### **GET /api/stats/repartition**

Répartition des profits

**Response (200):**
```json
{
  "repartition": [
    {
      "role": "porteur",
      "pourcentage_defaut": 70.0,
      "total_accumule_visible": 175000.0,
      "total_accumule_cache": 245000.0
    },
    {
      "role": "associe",
      "pourcentage_defaut": 30.0,
      "total_accumule_visible": 75000.0,
      "total_accumule_cache": 105000.0
    }
  ]
}
```

#### **GET /api/stats/comptes**

État des comptes

**Response (200):**
```json
{
  "depot": 2500000.0,
  "caisse": 850000.0
}
```

---

### **5. PARAMÈTRES**

#### **GET /api/settings**

Tous les paramètres

**Response (200):**
```json
{
  "hidden_password": "1234",
  "profit_share_porteur": "70",
  "profit_share_associe": "30",
  "devise_stock": "USDT",
  "devises_vente": "[\"RMB\",\"USD\"]",
  "app_version": "5.1.0"
}
```

#### **GET /api/settings/:key**

Un paramètre spécifique

**URL Params:**
- `key` : Clé du paramètre

**Response (200):**
```json
{
  "cle": "hidden_password",
  "valeur": "1234",
  "description": "Mot de passe pour vente cachée"
}
```

#### **PUT /api/settings/:key**

Modifier un paramètre

**Request Body:**
```json
{
  "valeur": "5678"
}
```

**Response (200):**
```json
{
  "success": true,
  "cle": "hidden_password",
  "valeur": "5678"
}
```

---

## ⚠️ Codes d'Erreur

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Paramètres manquants ou invalides |
| 401 | Unauthorized | Token manquant ou invalide |
| 403 | Forbidden | Permissions insuffisantes |
| 404 | Not Found | Ressource non trouvée |
| 500 | Internal Server Error | Erreur serveur |

---

## 📝 Exemples avec cURL

### **Login**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"porteur@forexium.com","password":"1234"}'
```

### **Obtenir stock USDT**

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:3000/api/stock \
  -H "Authorization: Bearer $TOKEN"
```

### **Créer un achat USDT**

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "achat",
    "quantite": 100,
    "taux_unitaire": 655,
    "use_caisse": false,
    "fournisseur": "Binance"
  }'
```

### **Créer une vente**

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "vente",
    "devise_vente": "USD",
    "taux_conversion": 0.98,
    "quantite_vente": 500,
    "taux_vente_visible": 680,
    "client": "Jean Dupont"
  }'
```

### **Finaliser une vente**

```bash
curl -X PUT http://localhost:3000/api/transactions/TX_1234567890/finaliser \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taux_vente_cache": 685,
    "pct_porteur": 70,
    "pct_associe": 30
  }'
```

---

## 🔐 Sécurité

- ✅ Tous les endpoints (sauf login) nécessitent un JWT valide
- ✅ Les tokens expirent après 24h (configurable)
- ✅ Les mots de passe sont hashés avec bcrypt
- ✅ Protection CORS activée
- ✅ Headers sécurisés avec Helmet
- ✅ Validation des entrées
- ✅ Requêtes SQL préparées (protection injection)

---

## 📊 Rate Limiting

Pas de rate limiting actuellement. En production, recommandé d'ajouter :

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requêtes max
});

app.use('/api/', limiter);
```

---

**📞 Questions ?** Consultez le README.md principal ou contactez le support.
