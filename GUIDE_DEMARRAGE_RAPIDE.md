# ⚡ FOREXIUM v5.5.0 — Guide de démarrage rapide (WAMP + MySQL)

## Architecture

```
Frontend (React/Vite)  ←→  Backend (Node.js/Express)  ←→  MySQL (WAMP)
  port 5173                    port 3000                   port 3306
```

---

## ÉTAPE 1 — Base de données MySQL (WAMP)

1. **Démarrer WAMP** — icône verte dans la barre des tâches
2. Ouvrir **phpMyAdmin** → http://localhost/phpmyadmin
3. Cliquer **"Nouvelle base de données"** → nommer `forexium_v5` → **Créer**
4. Cliquer sur `forexium_v5` → onglet **SQL**
5. Coller le contenu de `database/database_setup.sql` → **Exécuter**

✅ Vous devez voir 8 tables créées.

---

## ÉTAPE 2 — Backend

```bash
cd backend

# 1. Créer le fichier .env
copy .env.example .env
```

Ouvrir `.env` et vérifier :
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=          ← laisser vide si WAMP sans mot de passe
DB_NAME=forexium_v5
```

```bash
# 2. Installer les dépendances
npm install

# 3. Démarrer
npm run dev
```

**Résultat attendu :**
```
🚀 FOREXIUM v5.5.0  |  Port 3000
✅ MySQL connecté
```

---

## ÉTAPE 3 — Frontend

```bash
cd frontend

# 1. Créer le fichier .env
copy .env.example .env

# 2. Installer les dépendances
npm install

# 3. Démarrer
npm run dev
```

Ouvrir **http://localhost:5173**

---

## Comptes de connexion

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Porteur d'affaire | porteur@forexium.com | 1234 |
| Associé | associe@forexium.com | 1234 |

---

## Dépannage

| Problème | Solution |
|----------|----------|
| `ECONNREFUSED 3306` | Démarrer WAMP (icône verte) |
| `Access denied for root` | Laisser DB_PASSWORD vide dans .env |
| `Unknown database forexium_v5` | Créer la base dans phpMyAdmin d'abord |
| Erreur CORS | Vérifier que le backend tourne sur le port 3000 |
| Page blanche | Vérifier VITE_API_URL=http://localhost:3000/api dans frontend/.env |
