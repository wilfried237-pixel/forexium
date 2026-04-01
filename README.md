# 🚀 FOREXIUM V5.1.0 - PACKAGE COMPLET

## 📦 Contenu du Package

Ce package contient l'application complète FOREXIUM avec :
- ✅ **Frontend** : React 18 + Vite + Tailwind CSS
- ✅ **Backend** : Node.js + Express + MySQL
- ✅ **Base de données** : MySQL avec procédures stockées et triggers
- ✅ **Documentation** : Guide complet d'installation et déploiement

---

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐        ┌──────────┐
│   FRONTEND  │ ◄────── │   BACKEND    │ ◄────► │  MySQL   │
│  React/Vite │  HTTP   │ Node/Express │  SQL   │ Database │
│   Port 5173 │  JSON   │   Port 3000  │        │ Port 3306│
└─────────────┘         └──────────────┘        └──────────┘
```

---

## 📋 Prérequis

### Logiciels nécessaires :
- **Node.js** 18+
- **MySQL** 8.0+ ou **MariaDB** 10.6+
- **npm** ou **yarn**

---

## 🚀 Installation Rapide (3 étapes)

### ÉTAPE 1 : Base de données

```bash
mysql -u root -p < database/database_setup.sql
```

### ÉTAPE 2 : Backend

```bash
cd backend
npm install
cp .env.example .env
# Éditer .env avec vos paramètres MySQL
npm run dev
```

### ÉTAPE 3 : Frontend

```bash
cd frontend
npm install
npm run dev
```

**🎉 Accéder à l'application : http://localhost:5173**

---

## 👤 Comptes de test

**Porteur :**
- Email : `porteur@forexium.com`
- Mot de passe : `1234`

**Associé :**
- Email : `associe@forexium.com`
- Mot de passe : `1234`

---

## 📡 API Endpoints

```
POST /api/auth/login          - Connexion
GET  /api/transactions        - Liste transactions
POST /api/transactions        - Créer transaction
PUT  /api/transactions/:id/finaliser - Finaliser vente
GET  /api/stock              - Stock USDT
GET  /api/stats              - Statistiques
GET  /api/settings           - Paramètres
```

---

## 🛠️ Structure du projet

```
FOREXIUM-PACKAGE-COMPLET/
├── frontend/           # Application React (3738 lignes)
├── backend/            # API Node.js/Express
│   ├── routes/         # Routes API
│   ├── middleware/     # Auth, ErrorHandler
│   ├── config/         # Database config
│   └── server.js       # Point d'entrée
├── database/           # Scripts SQL
│   └── database_setup.sql
└── README.md
```

---

## 🚀 Déploiement Production

**Backend + MySQL : Railway.app**
**Frontend : Vercel**

Documentation complète dans `/docs/DEPLOYMENT.md`

---

**Développeur :** MOMENE NGOUFFO Dérick  
**Version :** 5.1.0  
**Licence :** Propriétaire - EXPERT-3DEV © 2026
