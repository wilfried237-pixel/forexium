# FOREXIUM v5.6.0 — Guide de démarrage complet

=======================================================
  ÉTAPE 1 — Base de données (une seule fois)
=======================================================

1. Ouvrir WAMP → cliquer sur l'icône verte dans la barre des tâches
2. Ouvrir le navigateur → aller sur : http://localhost/phpmyadmin
3. Cliquer sur "Nouvelle base de données" (colonne de gauche)
4. Nom : forexium_v5 → cliquer "Créer"
5. Cliquer sur la base "forexium_v5" dans la liste à gauche
6. Cliquer sur l'onglet "SQL" (en haut)
7. Ouvrir le fichier "database/database_setup.sql" avec Notepad
8. Tout sélectionner (Ctrl+A) → Copier (Ctrl+C)
9. Coller dans la zone SQL de phpMyAdmin (Ctrl+V)
10. Cliquer "Exécuter"

✅ Toutes les tables sont créées en une seule fois.

=======================================================
  ÉTAPE 2 — Fichiers de configuration (une seule fois)
=======================================================

1. Aller dans le dossier "backend"
2. Copier le fichier ".env.example" → renommer la copie en ".env"
   (si tu ne vois pas l'extension, active "Afficher les extensions" dans l'explorateur)
3. Aller dans le dossier "frontend"
4. Copier le fichier ".env.example" → renommer la copie en ".env"

✅ Les fichiers .env sont prêts (les valeurs par défaut fonctionnent avec WAMP).

=======================================================
  ÉTAPE 3 — Installer les dépendances (une seule fois)
=======================================================

1. Ouvrir un terminal dans le dossier FOREXIUM-v5.6.0
   (clic droit sur le dossier → "Ouvrir dans le terminal" ou "Git Bash")

2. Taper ces commandes une par une :

   npm install

   (attendre que ça finisse)

   cd backend
   npm install
   cd ..

   (attendre que ça finisse)

   cd frontend
   npm install
   cd ..

   (attendre que ça finisse)

✅ Toutes les dépendances sont installées.

=======================================================
  ÉTAPE 4 — Lancement quotidien (chaque jour)
=======================================================

1. Démarrer WAMP (icône verte dans la barre des tâches)
2. Ouvrir un terminal dans le dossier FOREXIUM-v5.6.0
3. Taper :

   npm start

4. Attendre que les deux serveurs démarrent (5-10 secondes)
5. Ouvrir le navigateur → http://localhost:5173

✅ L'application est ouverte.

=======================================================
  Pour arrêter l'application
=======================================================

Dans le terminal → appuyer sur Ctrl+C

=======================================================
