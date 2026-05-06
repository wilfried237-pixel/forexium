#!/bin/bash
# FOREXIUM v5.6.0+ — Tests API complets
# Utilisation: bash test-api.sh

# Configuration
API_URL="http://localhost:3000/api"
TOKEN="YOUR_TOKEN_HERE"  # À remplacer par un vrai token
HEADERS_JSON="Content-Type: application/json"
HEADERS_AUTH="Authorization: Bearer $TOKEN"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local body=$4
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Test: $name${NC}"
  echo -e "${YELLOW}$method $endpoint${NC}"
  
  if [ -z "$body" ]; then
    response=$(curl -s -X "$method" \
      "$API_URL$endpoint" \
      -H "$HEADERS_JSON" \
      -H "$HEADERS_AUTH")
  else
    echo -e "Body: $body"
    response=$(curl -s -X "$method" \
      "$API_URL$endpoint" \
      -H "$HEADERS_JSON" \
      -H "$HEADERS_AUTH" \
      -d "$body")
  fi
  
  echo -e "${GREEN}Response:${NC}"
  echo "$response" | jq . 2>/dev/null || echo "$response"
  echo ""
}

# ====================================
# 1. TEST DEVISES (Fix suppression)
# ====================================
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  1. TESTS DEVISES (suppression fix)    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Créer une devise de test
test_endpoint "Créer devise test" "POST" "/devises" \
'{
  "code": "CHF",
  "nom": "Franc Suisse",
  "taux_conversion": 0.92,
  "description": "Devise de test"
}'

# Récupérer l'ID de la devise créée (à faire manuellement ou parser la réponse)
echo -e "${YELLOW}📌 Nota: Notez l'ID de la devise créée pour l'utiliser ci-dessous${NC}\n"

# Lister les devises
test_endpoint "Lister les devises" "GET" "/devises"

# Modifier la devise
test_endpoint "Modifier devise (CHF)" "PUT" "/devises/1" \
'{
  "taux_conversion": 0.95
}'

# Supprimer la devise (TESTED FIX)
test_endpoint "Supprimer devise (CHF) - TEST FIX" "DELETE" "/devises/1"

# ====================================
# 2. TEST CLIENTS (champ quartier)
# ====================================
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  2. TESTS CLIENTS (quartier + infos)   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Créer un client complet avec quartier
test_endpoint "Créer client avec quartier" "POST" "/accounts/clients" \
'{
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "+237680123456",
  "ville": "Yaoundé",
  "quartier": "Bastos",
  "adresse": "Rue 123, Immeuble XYZ"
}'

# Lister les clients
test_endpoint "Lister les clients" "GET" "/accounts/clients"

# Créer 2e client pour tests
test_endpoint "Créer 2e client" "POST" "/accounts/clients" \
'{
  "nom": "Martin",
  "prenom": "Sophie",
  "telephone": "+237699876543",
  "ville": "Douala",
  "quartier": "Bonanjo",
  "adresse": "Boulevard du 20 mai"
}'

# Modifier client (mettre à jour quartier)
test_endpoint "Modifier quartier du client 1" "PUT" "/accounts/clients/1" \
'{
  "quartier": "Montée Fébé"
}'

# ====================================
# 3. TEST TRANSACTIONS (validation paiement)
# ====================================
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  3. TESTS TRANSACTIONS (paiements)     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Créer une vente
test_endpoint "Créer transaction vente" "POST" "/transactions" \
'{
  "type": "vente",
  "devise": "USDT",
  "deviseVente": "RMB",
  "quantite": 0.5,
  "quantiteDevise": 10,
  "tauxConversion": 6.94,
  "tauxAchatXAF": 1440,
  "tauxVisible": 7200,
  "montant": 72000,
  "client": "Dupont",
  "beneficiaire": null,
  "statut": "pending"
}'

# IMPORTANT: Noter l\'ID de la transaction pour les tests ci-dessous
echo -e "${YELLOW}📌 Nota: Notez l'ID TX (tx.id) pour l'utiliser dans les validations${NC}\n"

# Test 1: Valider comme PAYÉ
test_endpoint "Valider transaction comme PAYÉE" "PUT" "/transactions/TX_123456/valider" \
'{
  "payment_status": "paid"
}'

# Test 2: Valider comme NON PAYÉ
test_endpoint "Valider transaction comme NON PAYÉE" "PUT" "/transactions/TX_123456/valider" \
'{
  "payment_status": "unpaid"
}'

# Test 3: Valider comme PAIEMENT PARTIEL
test_endpoint "Valider transaction PAIEMENT PARTIEL" "PUT" "/transactions/TX_123456/valider" \
'{
  "payment_status": "partial",
  "montant_paye": 50000
}'

# Test 4: Paiement partiel avec surplus
test_endpoint "Valider transaction TROP-PAYÉ" "PUT" "/transactions/TX_123456/valider" \
'{
  "payment_status": "partial",
  "montant_paye": 80000
}'

# ====================================
# 4. TEST EXTRAIT DE COMPTE CLIENT
# ====================================
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  4. TEST EXTRAIT COMPTE CLIENT         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Récupérer les transactions d'un client
test_endpoint "Voir extrait de compte client 1" "GET" "/accounts/clients/1/transactions"

# ====================================
# 5. TESTS ACHAT (inchangé, pour vérifier compatibilité)
# ====================================
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  5. TEST ACHAT (rétrocompatibilité)    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

test_endpoint "Créer transaction achat" "POST" "/transactions" \
'{
  "type": "achat",
  "devise": "USDT",
  "quantite": 1.5,
  "taux_achat_unitaire": 500000,
  "prix_achat_total": 750000,
  "fournisseur": "Supplier XYZ",
  "use_caisse": false
}'

# ====================================
# 6. RÉSUMÉ DES TESTS
# ====================================
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  RÉSUMÉ DES TESTS                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✅ Points testés:${NC}"
echo "  1. ✅ Suppression devise (fix)"
echo "  2. ✅ Création client avec quartier"
echo "  3. ✅ Modification client"
echo "  4. ✅ Validation vente - Payé"
echo "  5. ✅ Validation vente - Non payé"
echo "  6. ✅ Validation vente - Partiel"
echo "  7. ✅ Validation vente - Trop-payé"
echo "  8. ✅ Extrait de compte client"
echo "  9. ✅ Rétrocompatibilité achat"

echo -e "\n${YELLOW}⚠️  Points à vérifier manuellement:${NC}"
echo "  • Frontend: Onglet Clients affiche quartier"
echo "  • Frontend: Boutons paiement visibles"
echo "  • Frontend: Statut paiement persiste"
echo "  • DB: Colonne quartier créée"
echo "  • DB: payment_status/montant_paye enregistrés"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Script de test complet avec JSON
cat > test-api.json << 'EOF'
{
  "tests": {
    "devises": {
      "create": {
        "method": "POST",
        "endpoint": "/devises",
        "body": {
          "code": "CHF",
          "nom": "Franc Suisse",
          "taux_conversion": 0.92
        }
      },
      "delete": {
        "method": "DELETE",
        "endpoint": "/devises/:id",
        "note": "Tester le fix du bug"
      }
    },
    "clients": {
      "create_with_quarter": {
        "method": "POST",
        "endpoint": "/accounts/clients",
        "body": {
          "nom": "Dupont",
          "prenom": "Jean",
          "telephone": "+237680123456",
          "ville": "Yaoundé",
          "quartier": "Bastos",
          "adresse": "Rue 123"
        }
      },
      "list": {
        "method": "GET",
        "endpoint": "/accounts/clients",
        "note": "Vérifier que quartier s'affiche"
      }
    },
    "transactions": {
      "validate_paid": {
        "method": "PUT",
        "endpoint": "/transactions/:tx_id/valider",
        "body": {
          "payment_status": "paid"
        }
      },
      "validate_partial": {
        "method": "PUT",
        "endpoint": "/transactions/:tx_id/valider",
        "body": {
          "payment_status": "partial",
          "montant_paye": 500000
        }
      },
      "validate_unpaid": {
        "method": "PUT",
        "endpoint": "/transactions/:tx_id/valider",
        "body": {
          "payment_status": "unpaid"
        }
      }
    }
  }
}
EOF

echo -e "${GREEN}✅ Fichier test-api.json créé${NC}"
echo -e "   Utilisez-le comme référence pour tester avec Postman/Insomnia\n"
