# 🧪 Guide de Test — FOREXIUM v5.6.0 Modifications

## 1️⃣ Démarrer MySQL (Prérequis)

### Option A: Via WAMP Manager (Recommandé)
```
1. Allez à: C:\wamp64
2. Double-cliquez: wampmanager.exe
3. Cliquez sur l'icône "Démarrer tous les services"
4. Attendez que l'icône devienne verte
```

### Option B: Via PowerShell (Admin required)
```powershell
Start-Service wampmysqld64
Start-Sleep -Seconds 3
Get-Service wampmysqld64 | Select-Object Status
# Devrait afficher: Status: Running
```

---

## 2️⃣ Exécuter la Migration DB

```powershell
cd c:\Users\USER\FOREXIUM-v5.6.0\backend
npm run migrate
```

**Sortie attendue**:
```
✅ Connecté à MySQL

📋 Vérification des colonnes comptes_clients:

  ✅ quartier - VARCHAR(100)
  ✅ adresse - VARCHAR(255)
  ✅ telephone - VARCHAR(20)
  ✅ prenom - VARCHAR(100)

✅ Migration successful! All fields present.
```

---

## 3️⃣ Lancer l'Application

```powershell
cd c:\Users\USER\FOREXIUM-v5.6.0
npm start
```

Attendez:
- Backend: `✅ MySQL connecté` + `🚀 Serveur lancé sur port 3000`
- Frontend: `VITE v4.x.x ready in xxx ms`
- Ouvrez: `http://localhost:5173`

---

## 4️⃣ Tests Fonctionnels

### Test 1: Onglet Clients ✅
**Chemin**: Dashboard → 👥 Clients tab

**À vérifier**:
- [ ] Liste des clients s'affiche à gauche
- [ ] Cliquer sur un client charge l'extrait
- [ ] Extrait affiche: nom, prénom, téléphone, adresse
- [ ] KPIs affichent: Transactions, Ventes, Impayés
- [ ] Tableau transactions montre date, type, montant, payé, reste
- [ ] Statuts colorés: ✅ Validé (vert), ⏳ En attente (orange), Impayé (gris)

### Test 2: Création Client avec Données Étendues ✅
**Chemin**: Nouvelle transaction → Section Client → "+ Enregistrer nouveau client"

**À vérifier**:
- [ ] Formulaire demande: Nom*, Prénom, Téléphone, Ville, Quartier, Adresse
- [ ] Validation fonctionne:
  - Nom requis avec lettres uniquement
  - Téléphone format +237XXXXXXXXX
  - Autres champs optionnels
- [ ] Client sauvegardé dans la liste

### Test 3: Affichage Infos Client Étendues ✅
**Chemin**: Formulaire Vente → Sélection Client

**À vérifier**:
- [ ] Après sélection client, bloc bleu apparaît
- [ ] Titre: "📋 Infos client"
- [ ] Affiche en grid 2 colonnes:
  - Prénom: [valeur]
  - Tél: [valeur]
  - Ville: [valeur]
  - Quartier: [valeur]
  - Adresse: [valeur] (full width)
- [ ] Mise à jour quand client change

### Test 4: Paiements Partiels ✅
**Chemin**: Formulaire Vente → Section Paiement Client

**À vérifier**:
- [ ] 3 boutons: ✅ Payé (vert) | ⚡ Partiel (orange) | ⏳ Non payé (rouge)
- [ ] Chaque bouton a une description:
  - Payé: "Montant total"
  - Partiel: "Acompte versé"
  - Non payé: "À recouvrer"
- [ ] Cliquer sur "Partiel" affiche input "Montant reçu"
- [ ] Input accepte uniquement chiffres
- [ ] Le bouton sélectionné affiche fond coloré
- [ ] Boutons sont responsive

### Test 5: Suppression Devise ✅
**Chemin**: Dashboard → 💱 Devises tab → Supprimer devise

**À vérifier**:
- [ ] Pas d'erreur "table not found"
- [ ] Devise supprimée avec succès
- [ ] Message: "Devise supprimée ✓"

### Test 6: Validation Transaction ✅
**Chemin**: 📋 Transactions tab → Cliquer sur transaction → Valider paiement

**À vérifier**:
- [ ] Boutons paiement disponibles
- [ ] Sélection statut paiement enregistre en DB
- [ ] Extrait client affiche le nouveau statut
- [ ] Montant paye/reste calculé correctement

---

## 🔍 Debug Commands

### Vérifier Migration
```powershell
cd c:\Users\USER\FOREXIUM-v5.6.0\backend
npm run migrate
```

### Vérifier Connexion DB
```powershell
# Dans le terminal de l'app, cherchez:
✅ MySQL connecté
✅ Tables: users, devises_personnalisees, comptes_clients, transactions...
```

### Vérifier API Endpoints
```powershell
# Terminal séparé, depuis http://localhost:3000

# Récupérer clients
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/accounts/clients

# Valider transaction
curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"payment_status":"partial","montant_paye":50000}' \
  http://localhost:3000/api/transactions/TRANSACTION_ID/valider
```

---

## 📋 Checklist Complète

### Backend
- [ ] Migration DB exécutée sans erreur
- [ ] Colonne `quartier` existante
- [ ] Endpoint POST /clients accepte quartier
- [ ] Endpoint PUT /transactions/:id/valider fonctionne
- [ ] Devise peut être supprimée

### Frontend
- [ ] Onglet Clients affiche la liste
- [ ] Infos client affichées dans formulaire vente
- [ ] Quartier visible dans bloc infos client
- [ ] Boutons paiement redesignés avec 3 options
- [ ] Input montant partiel fonctionne
- [ ] Création client avec tous champs

### UX/Intégration
- [ ] Interface intuitive et claire
- [ ] Responsive sur mobile et desktop
- [ ] Pas d'erreur console (F12)
- [ ] Langue FR/EN fonctionne
- [ ] Theme dark/light fonctionne

---

## 🐛 Troubleshooting

| Problème | Solution |
|----------|----------|
| "Connection refused" | Vérifier MySQL est lancé: `Get-Service wampmysqld64` |
| "Table not found" | Exécuter migration: `npm run migrate` |
| Infos client non affichées | Vérifier client a nom + prenom enregistrés |
| Boutons paiement pas visibles | Vérifier type transaction est "vente" |
| Onglet Clients vide | Créer d'abord une transaction avec un client |
| Erreur quartier requis | Laisser quartier optionnel (pas de validation '*') |

---

## ✅ Validation Finale

Si tous les tests passent, l'application est **PRODUCTION READY**! 🚀

Sinon, vérifiez:
1. MySQL est en cours d'exécution
2. Migration a été exécutée
3. Console du navigateur (F12) pour erreurs
4. Logs du backend pour erreurs API

Bon testing! 🧪
