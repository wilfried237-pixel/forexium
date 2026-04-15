import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// CONTEXTE GLOBAL POUR LA VISIBILITÉ DES DONNÉES CACHÉES
const HiddenDataContext = createContext();
function useHiddenData() { return useContext(HiddenDataContext); }
import {
  apiLogin, apiLogout, apiLoadAll,
  apiCreateTransaction, apiFinaliserVente, apiEditTransaction,
  apiUpdateCmup, apiUpdateProfitShare, apiRegister, apiCheckSlots,
  apiValiderAssoc,
} from './api.js';
import {
  DollarSign, TrendingUp, Users, LogOut, Plus, ArrowUpRight, ArrowDownLeft,
  Download, Settings, FileText, BarChart3, X, Moon, Sun, Globe,
  ShieldCheck, AlertCircle, RefreshCw, Warehouse, Banknote, Clock,
  CheckCircle2, XCircle, AlertTriangle, Filter, Edit2, Info, Lock,
  TrendingDown, Activity, ChevronDown, ChevronUp, Search, Package,
  ArrowRight, ChevronsUpDown, Layers, PenLine, Shield, Zap
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr as dateFr, enUS } from 'date-fns/locale';
import jsPDF from 'jspdf';
import qrcode from 'qrcode-generator';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─────────────────────────────────────────────────────────────
// UTILITAIRES — Séparateurs de milliers
// ─────────────────────────────────────────────────────────────
// Formate un nombre entier avec espaces : 1000000 → "1 000 000"
const fmtThousands = (v) => {
  const s = String(v).replace(/\s/g, '');
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
};
// Parse un champ formaté vers float : "1 000 500,5" → 1000500.5
const parseThousands = (v) => parseFloat(String(v).replace(/[\s\u00A0]/g, '').replace(',', '.')) || 0;
// Handler onChange pour champs entiers XAF (montants, taux entiers)
const handleIntInput = (setter) => (e) => {
  const raw = e.target.value.replace(/[\s\u00A0]/g, '').replace(/[^0-9]/g, '');
  setter(raw === '' ? '' : fmtThousands(raw));
};
// Handler onChange pour champs décimaux (quantité USDT, taux avec virgule)
const handleDecInput = (setter) => (e) => {
  const raw = e.target.value.replace(/[\s\u00A0]/g, '').replace(/[^0-9.]/g, '');
  setter(raw);
};
const TRANSLATIONS = {
  fr: {
    appSubtitle: 'Plateforme Professionnelle de Change',
    login: 'Se connecter', email: 'Adresse email', password: 'Mot de passe',
    logout: 'Déconnexion', newTransaction: 'Nouvelle Transaction',
    transactions: 'Transactions', quickActions: 'Actions Rapides',
    profitShare: 'Répartition des Profits', settings: 'Paramètres',
    save: 'Enregistrer', cancel: 'Annuler',
    all: 'Tous', sale: 'Vente', purchase: 'Achat', expense: 'Dépense', withdrawal: 'Retrait',
    sellCurrency: 'Vendre une devise', buyCurrency: 'Acheter une devise',
    recordExpense: 'Enregistrer dépense', makeWithdrawal: 'Effectuer un retrait',
    cashClient: 'Encaisser un client', stockSupply: 'Approvisionner le stock',
    operationalCosts: "Frais d'exploitation", partnerWithdrawal: 'Retrait caisse',
    depot: 'Dépôt', caisse: 'Caisse',
    myShare: 'Ma Part', currencyStock: 'Stock de Devises',
    updatedRealTime: 'Mis à jour en temps réel', noTransactions: 'Aucune transaction trouvée',
    connectedAs: 'Connecté en tant que', partner: "Porteur d'affaire", associate: 'Associé',
    currency: 'Devise', quantity: 'Quantité',
    purchaseRate: "Taux d'achat calculé (XAF/USDT)", client: 'Client *', supplier: 'Fournisseur',
    clientPlaceholder: 'Nom du client (obligatoire)',
    amount: 'Montant (XAF)', category: 'Catégorie', description: 'Description',
    beneficiary: 'Bénéficiaire', reason: 'Motif (optionnel)',
    autoCalc: 'Calculs automatiques', clientAmount: 'Montant client :',
    cost: 'Coût :', profit: 'Bénéfice :', distribution: 'Répartition :',
    totalProfit: 'Profit total', totalTransactions: 'Transactions', totalRecorded: 'Total enregistrées',
    invoicePDF: 'Reçu PDF',
    noteSettings: "S'applique aux nouvelles transactions uniquement.",
    loginNote: 'Email "porteur@..." → Porteur  |  Autre email → Associé',
    insufficientStock: 'Stock insuffisant !',
    insufficientCaisse: 'Solde caisse insuffisant !',
    allFieldsRequired: 'Champs obligatoires manquants',
    saleSuccess: 'Vente initiée — En attente finalisation', purchaseSuccess: 'Achat enregistré !',
    expenseSuccess: 'Dépense enregistrée !', withdrawalSuccess: 'Retrait enregistré !',
    settingsUpdated: 'Paramètres mis à jour !', logoutSuccess: 'Déconnexion réussie', welcome: 'Bienvenue',
    filterByDate: 'Par date', searchByType: 'Par type',
    journalLog: 'Journal des activités', journalEmpty: 'Aucune activité enregistrée',
    sourceAccount: "Source de l'achat", useCaisse: 'Payer depuis la Caisse',
    restock: 'Alimenter la Caisse', restockDesc: 'Transférer du Dépôt vers la Caisse',
    restockAmount: 'Montant à transférer', transferSuccess: 'Transfert effectué !',
    clientRequired: 'Le nom du client est obligatoire',
    globalShare: 'Répartition globale (par défaut)',
    customShare: 'Personnaliser pour cette vente',
    depotDesc: 'Fonds propres (dépôt)', caisseDesc: 'Fonds opérationnels',
    loginFailed: 'Email ou mot de passe incorrect',
    sessionDuration: 'Durée de session',
    logTypes: {
      connexion: 'Connexion', deconnexion: 'Déconnexion', vente: 'Vente',
      achat: 'Achat', depense: 'Dépense', retrait: 'Retrait',
      restock: 'Alimentation caisse', settings: 'Paramètres', error: 'Erreur',
      connexion_echouee: 'Tentative échouée', finalisation: 'Finalisation', edition: 'Édition',
      pdf: 'Reçu PDF', filtre: 'Filtrage', cmup: 'Ajust. CMUP'
    },
    deviseVente: 'Devise de vente', tauxConversion: 'Taux de conversion',
    tauxConversionHint: 'Combien d\'unités pour 1 USDT ?',
    tauxAchatCalc: 'Taux d\'achat XAF (CMUP ÷ conversion)',
    tauxVenteVisible: 'Taux de vente (XAF)',
    tauxVenteCache: 'Taux de vente CACHÉ (XAF)', afficherCachee: 'Voir données cachées 🔒', masquerCachee: 'Masquer',
    valeurAchatXAF: 'Valeur d\'achat (XAF)', valeurVenteVisible: 'Valeur vente (XAF)',
    valeurVenteCachee: 'Valeur CACHÉE (XAF)', beneficeVisible: 'Bénéfice',
    beneficeCachee: 'Bénéfice CACHÉ', stockUsdtConsomme: 'USDT consommé',
    stockUsdtRestant: 'USDT restant', repartitionVisible: 'Répartition',
    repartitionCachee: 'Répartition CACHÉE', incorrectPassword: 'Mot de passe incorrect',
    passwordPromptTitle: 'Données cachées', passwordLabel: 'Mot de passe',
    customShareCache: 'Personnaliser répartition cachée',
    manageCurrencies: 'Devises', addCurrency: 'Ajouter', currencyCode: 'Code',
    currencyName: 'Nom complet', currencySymbol: 'Symbole', currencyAdded: 'Devise ajoutée !',
    currencyDeleted: 'Devise supprimée !', defaultCurrencies: 'Devises par défaut',
    customCurrencies: 'Devises ajoutées', restockTip: 'Versement ajouté à la Caisse',
    currentCaisse: 'Caisse actuelle', obligatoire: 'obligatoire',
    profitShareInSale: 'Répartition pour cette vente',
    pending: 'En attente', committed: 'Finalisé',
    finaliserVente: 'Finaliser la vente', finaliserDesc: 'Ajouter les données cachées',
    finaliserSuccess: 'Vente finalisée avec données cachées !',
    prixAchatTotal: 'Prix d\'achat total (XAF)',
    tauxUnitaireCalc: 'Taux unitaire calculé',
    nouveauCMUP: 'Nouveau CMUP après achat',
    stockCourant: 'Stock courant',
    soldeDisponible: 'Solde disponible',
    modifierTx: 'Modifier', editSuccess: 'Transaction modifiée !',
    stockNegatif: 'Modification bloquée — stock USDT négatif détecté le',
    depuisCaisse: 'Depuis la Caisse',
    infoAchat: 'Informations stock', infoCaisse: 'Informations caisse',
    prixAchatHint: 'Montant total payé au fournisseur',
    // ── Mouvement de Stock USDT ──
    stockMovement: 'Mouvements de Stock USDT',
    stockMovementDesc: 'Historique détaillé des entrées/sorties USDT',
    entree: 'Entrée', sortie: 'Sortie',
    stockAvant: 'Stock avant', stockApres: 'Stock après',
    variation: 'Variation', libelle: 'Libellé',
    typeOp: 'Type', refOp: 'Référence',
    noMovements: 'Aucun mouvement de stock enregistré',
    exportCSV: 'Exporter CSV',
    soldeActuel: 'Solde actuel',
    totalEntrees: 'Total entrées', totalSorties: 'Total sorties',
    cmupActuel: 'CMUP actuel', valeurStock: 'Valeur du stock',
    sourceAchat: 'Source financement', clientVente: 'Client',
    deviseSortie: 'Devise sortie', qteDevise: 'Qté devise',
    tauxConvUsdt: 'Taux conv. USDT', tauxAchatXaf: 'Taux achat XAF',
    tauxVenteXaf: 'Taux vente XAF', valAchatXaf: 'Valeur achat XAF',
    valVenteXaf: 'Valeur vente XAF', beneficeOp: 'Bénéfice',
    fournisseurAchat: 'Fournisseur', newCmup: 'Nouveau CMUP',
    searchMovement: 'Rechercher...', filterAll: 'Tous',
    evolutionStock: 'Évolution du stock',
    editCmup: 'Modifier le CMUP manuellement',
    cmupManuel: 'Nouveau CMUP (XAF/USDT)',
    cmupUpdated: 'CMUP mis à jour avec succès !',
    cmupWarning: 'Attention : modifier le CMUP manuellement affecte tous les calculs futurs.',
    confirmCmup: 'Confirmer la modification',
    cmupHistory: 'Historique CMUP',
    passwordRequired: 'Mot de passe requis pour modifier le CMUP',
    cmupLog: 'Ajustement CMUP',
    inputCmup: 'Saisir le CMUP',
  },
  en: {
    appSubtitle: 'Professional Exchange Platform',
    login: 'Sign in', email: 'Email address', password: 'Password',
    logout: 'Logout', newTransaction: 'New Transaction',
    transactions: 'Transactions', quickActions: 'Quick Actions',
    profitShare: 'Profit Distribution', settings: 'Settings',
    save: 'Save', cancel: 'Cancel',
    all: 'All', sale: 'Sale', purchase: 'Purchase', expense: 'Expense', withdrawal: 'Withdrawal',
    sellCurrency: 'Sell Currency', buyCurrency: 'Buy Currency',
    recordExpense: 'Record Expense', makeWithdrawal: 'Make Withdrawal',
    cashClient: 'Cash a client', stockSupply: 'Supply stock',
    operationalCosts: 'Operational costs', partnerWithdrawal: 'Cash withdrawal',
    depot: 'Deposit', caisse: 'Cash Register',
    myShare: 'My Share', currencyStock: 'Currency Stock',
    updatedRealTime: 'Updated in real time', noTransactions: 'No transactions found',
    connectedAs: 'Connected as', partner: 'Business Owner', associate: 'Associate',
    currency: 'Currency', quantity: 'Quantity',
    purchaseRate: 'Calculated rate (XAF/USDT)', client: 'Client *', supplier: 'Supplier',
    clientPlaceholder: 'Client name (required)',
    amount: 'Amount (XAF)', category: 'Category', description: 'Description',
    beneficiary: 'Beneficiary', reason: 'Reason (optional)',
    autoCalc: 'Automatic calculations', clientAmount: 'Client amount:',
    cost: 'Cost:', profit: 'Profit:', distribution: 'Distribution:',
    totalProfit: 'Total Profit', totalTransactions: 'Transactions', totalRecorded: 'Total recorded',
    invoicePDF: 'PDF Receipt',
    noteSettings: 'Applies to new transactions only.',
    loginNote: 'Email "porteur@..." → Business Owner  |  Other → Associate',
    insufficientStock: 'Insufficient stock!',
    insufficientCaisse: 'Insufficient cash register balance!',
    allFieldsRequired: 'Required fields missing',
    saleSuccess: 'Sale initiated — Pending finalization', purchaseSuccess: 'Purchase recorded!',
    expenseSuccess: 'Expense recorded!', withdrawalSuccess: 'Withdrawal recorded!',
    settingsUpdated: 'Settings updated!', logoutSuccess: 'Logged out successfully', welcome: 'Welcome',
    filterByDate: 'By date', searchByType: 'By type',
    journalLog: 'Activity Log', journalEmpty: 'No activity recorded',
    sourceAccount: 'Purchase source', useCaisse: 'Pay from Cash Register',
    restock: 'Fund Cash Register', restockDesc: 'Transfer from Deposit to Cash Register',
    restockAmount: 'Amount to transfer', transferSuccess: 'Transfer completed!',
    clientRequired: 'Client name is required',
    globalShare: 'Global split (default)',
    customShare: 'Customize for this sale',
    depotDesc: 'Own funds (deposit)', caisseDesc: 'Operational funds',
    loginFailed: 'Incorrect email or password',
    sessionDuration: 'Session duration',
    logTypes: {
      connexion: 'Login', deconnexion: 'Logout', vente: 'Sale',
      achat: 'Purchase', depense: 'Expense', retrait: 'Withdrawal',
      restock: 'Cash funding', settings: 'Settings', error: 'Error',
      connexion_echouee: 'Failed attempt', finalisation: 'Finalization', edition: 'Edit',
      pdf: 'PDF Receipt', filtre: 'Filter', cmup: 'CMUP Adjust.'
    },
    deviseVente: 'Sale currency', tauxConversion: 'Conversion rate',
    tauxConversionHint: 'How many units = 1 USDT?',
    tauxAchatCalc: 'Purchase rate XAF (CMUP ÷ conversion)',
    tauxVenteVisible: 'Sale rate (XAF)',
    tauxVenteCache: 'HIDDEN sale rate (XAF)', afficherCachee: 'View hidden data 🔒', masquerCachee: 'Hide',
    valeurAchatXAF: 'Purchase value (XAF)', valeurVenteVisible: 'Sale value (XAF)',
    valeurVenteCachee: 'HIDDEN value (XAF)', beneficeVisible: 'Profit',
    beneficeCachee: 'HIDDEN profit', stockUsdtConsomme: 'USDT consumed',
    stockUsdtRestant: 'Remaining USDT', repartitionVisible: 'Distribution',
    repartitionCachee: 'HIDDEN distribution', incorrectPassword: 'Incorrect password',
    passwordPromptTitle: 'Hidden data access', passwordLabel: 'Password',
    customShareCache: 'Customize hidden distribution',
    manageCurrencies: 'Currencies', addCurrency: 'Add', currencyCode: 'Code',
    currencyName: 'Full name', currencySymbol: 'Symbol', currencyAdded: 'Currency added!',
    currencyDeleted: 'Currency deleted!', defaultCurrencies: 'Default currencies',
    customCurrencies: 'Added currencies', restockTip: 'Amount added to Cash Register',
    currentCaisse: 'Current Cash Register', obligatoire: 'required',
    profitShareInSale: 'Distribution for this sale',
    pending: 'Pending', committed: 'Finalized',
    finaliserVente: 'Finalize sale', finaliserDesc: 'Add hidden data',
    finaliserSuccess: 'Sale finalized with hidden data!',
    prixAchatTotal: 'Total purchase price (XAF)',
    tauxUnitaireCalc: 'Calculated unit rate',
    nouveauCMUP: 'New CMUP after purchase',
    stockCourant: 'Current stock',
    soldeDisponible: 'Available balance',
    modifierTx: 'Edit', editSuccess: 'Transaction updated!',
    stockNegatif: 'Edit blocked — negative USDT stock detected on',
    depuisCaisse: 'From Cash Register',
    infoAchat: 'Stock information', infoCaisse: 'Cash information',
    prixAchatHint: 'Total amount paid to supplier',
    // ── Stock Movement ──
    stockMovement: 'USDT Stock Movements',
    stockMovementDesc: 'Detailed history of USDT inflows/outflows',
    entree: 'Inflow', sortie: 'Outflow',
    stockAvant: 'Stock before', stockApres: 'Stock after',
    variation: 'Change', libelle: 'Label',
    typeOp: 'Type', refOp: 'Reference',
    noMovements: 'No stock movements recorded',
    exportCSV: 'Export CSV',
    soldeActuel: 'Current balance',
    totalEntrees: 'Total inflows', totalSorties: 'Total outflows',
    cmupActuel: 'Current CMUP', valeurStock: 'Stock value',
    sourceAchat: 'Funding source', clientVente: 'Client',
    deviseSortie: 'Out currency', qteDevise: 'Currency qty',
    tauxConvUsdt: 'Conv. rate USDT', tauxAchatXaf: 'Purchase rate XAF',
    tauxVenteXaf: 'Sale rate XAF', valAchatXaf: 'Purchase value XAF',
    valVenteXaf: 'Sale value XAF', beneficeOp: 'Profit',
    fournisseurAchat: 'Supplier', newCmup: 'New CMUP',
    searchMovement: 'Search...', filterAll: 'All',
    evolutionStock: 'Stock evolution',
    editCmup: 'Manually edit CMUP',
    cmupManuel: 'New CMUP (XAF/USDT)',
    cmupUpdated: 'CMUP updated successfully!',
    cmupWarning: 'Warning: manually editing the CMUP affects all future calculations.',
    confirmCmup: 'Confirm change',
    cmupHistory: 'CMUP History',
    passwordRequired: 'Password required to edit CMUP',
    cmupLog: 'CMUP Adjustment',
    inputCmup: 'Enter CMUP',
  }
};

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────
const DEVISES = ['USDT'];
const DEVISES_VENTE = [
  { code: 'RMB', label: 'RMB — Yuan Chinois' },
  { code: 'USD', label: 'USD — Dollar Américain' },
];
const HIDDEN_PASSWORD = '1234';
const DEFAULT_PROFIT_SHARE = { porteur: 70, associe: 30 };
const CATEGORIES = ['Loyer/Rent', 'Salaires/Salaries', 'Matériel/Equipment', 'Transport', 'Marketing', 'Assurance/Insurance', 'Autre/Other'];

// ─────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────
const calculerCMUP = (ancienStock, ancienCMUP, nouvelleQte, nouveauTaux) => {
  if (!isFinite(ancienStock) || !isFinite(ancienCMUP) || !isFinite(nouvelleQte) || !isFinite(nouveauTaux)) return ancienCMUP || 0;
  if (ancienStock <= 0) return nouveauTaux;
  if (nouvelleQte <= 0) return ancienCMUP;
  const result = ((ancienStock * ancienCMUP) + (nouvelleQte * nouveauTaux)) / (ancienStock + nouvelleQte);
  return Math.round(result * 1000000) / 1000000;
};

const createLog = (type, description, userId, meta = {}) => ({
  id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  dateHeure: new Date(),
  typeEvenement: type,
  description,
  idUtilisateur: userId,
  idOperation: meta.opId || null,
  ip: meta.ip || 'local',
  userAgent: navigator.userAgent.substring(0, 80),
  statut: meta.statut || 'success',
});


// Retourne le delta USDT d'une transaction (positif = entrée, négatif = sortie)
const getUsdtDelta = (tx) => {
  if (tx.type === 'achat' && tx.devise === 'USDT') return tx.quantite;
  if (tx.type === 'vente') return -(tx.usdtConsomme || 0);
  return 0;
};

// Recalcule la chaîne de stock USDT pour toutes les transactions (en place)
function recalculerStockUsdt(transactions, initialStock = 0) {
  let stock = initialStock;
  // Trier par date croissante
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i];
    tx.stockUsdt_avant = stock;
    const delta = getUsdtDelta(tx);
    stock += delta;
    tx.stockUsdt_apres = stock;
  }
  return sorted;
}

// Simule la chaîne de stock à partir d'une transaction modifiée
// Retourne { valid, failDate, failStock }
const simulerChaineStock = (transactions, modifiedTxId, newDelta) => {
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const modIdx = sorted.findIndex(tx => tx.id === modifiedTxId);
  if (modIdx === -1) return { valid: true };

  const stockAvant = sorted[modIdx].stockUsdt_avant ?? 0;
  let current = stockAvant;

  for (let i = modIdx; i < sorted.length; i++) {
    const tx = sorted[i];
    const delta = tx.id === modifiedTxId ? newDelta : getUsdtDelta(tx);
    current += delta;
    if (current < 0) {
      return { valid: false, failDate: tx.date, failStock: current };
    }
  }
  return { valid: true };
};

// ─────────────────────────────────────────────────────────────
// QR CODE
// ─────────────────────────────────────────────────────────────
const genererQRDataURL = (contenu) => {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(contenu);
    qr.make();
    const taille = qr.getModuleCount();
    const cellSize = 4;
    const canvas = document.createElement('canvas');
    canvas.width = taille * cellSize;
    canvas.height = taille * cellSize;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < taille; r++) {
      for (let c = 0; c < taille; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
};


// ─────────────────────────────────────────────────────────────
// REÇU FOREXIUM — FORMAT A5 — VERSION ÉCO
// Aucun aplat de fond · Lignes fines uniquement · Encre minimale
// Séparateurs de milliers : point (.)
// ─────────────────────────────────────────────────────────────
const genererFacturePDF = (transaction, langue) => {
  const isEn = langue === 'en';
  const locale = isEn ? enUS : dateFr;
  const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'landscape' });

  // ── Dimensions A5 paysage ──────────────────────────────────
  const W = 210, H = 148;
  const ML = 12, MR = 12;        // marges gauche / droite
  const CONTENT_W = W - ML - MR; // largeur utile

  // ── Palette ───────────────────────────────────────────────
  const INK   = [15, 23, 42];
  const GOLD  = [180, 140, 30];
  const GREY  = [110, 120, 130];
  const LGREY = [230, 232, 236];
  const GREEN = [22, 163, 74];

  // ── Zones fixes (bottom-up) ───────────────────────────────
  const FOOTER_Y  = H - 10;   // texte footer
  const GOLD_BAR  = H - 1;    // barre dorée basse
  const QR_SIZE   = 26;
  const QR_X      = W - MR - QR_SIZE;
  const QR_Y      = FOOTER_Y - QR_SIZE - 5; // QR juste au-dessus du footer
  const SAFE_RIGHT = QR_X - 4;              // zone texte : ne pas dépasser ça

  // ────────────────────────────────────────────────────────────
  // BARRE DORÉE HAUTE
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, W, 1.5, 'F');

  // ── HEADER ─────────────────────────────────────────────────
  doc.setTextColor(...INK);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('FOREXIUM', ML, 14);

  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  doc.text('PREMIUM EXCHANGE', ML, 19);

  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(isEn ? 'RECEIPT' : 'REÇU', W - MR, 12, { align: 'right' });

  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  doc.text(transaction.id || '-', W - MR, 17, { align: 'right' });

  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.3);
  doc.line(ML, 22, W - MR, 22);

  // ── TYPE BADGE ─────────────────────────────────────────────
  const typeLabels = {
    vente:   isEn ? 'SALE'        : 'VENTE',
    achat:   isEn ? 'PURCHASE'    : 'ACHAT',
    depense: isEn ? 'EXPENSE'     : 'DÉPENSE',
    retrait: isEn ? 'WITHDRAWAL'  : 'RETRAIT',
    versement: isEn ? 'CASH IN'   : 'ALIMENTATION',
  };
  const typeLabel = typeLabels[transaction.type] || (transaction.type || '').toUpperCase();

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, 26, 38, 7, 1.5, 1.5, 'S');
  doc.setTextColor(...GOLD);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
  doc.text(typeLabel, ML + 19, 31, { align: 'center' });

  // ── MONTANT PRINCIPAL ──────────────────────────────────────
  // Pour les ventes on utilise valeurVenteVisible, sinon montant
  const montantDisplay = transaction.type === 'vente'
    ? (transaction.valeurVenteVisible || transaction.montant || 0)
    : (transaction.montant || transaction.prix_achat_total || 0);

  doc.setTextColor(...INK);
  doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text(
    `${montantDisplay.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF`,
    W / 2, 45, { align: 'center' }
  );

  // Statut + date
  doc.setFillColor(...GREEN);
  doc.circle(ML + 2, 51, 1.4, 'F');
  doc.setTextColor(...GREEN);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
  doc.text(isEn ? 'Completed' : 'Terminé', ML + 5, 51.8);

  doc.setTextColor(...GREY);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.text(
    format(transaction.date instanceof Date ? transaction.date : new Date(transaction.date), 'dd/MM/yyyy  HH:mm', { locale }),
    W - MR, 51.8, { align: 'right' }
  );

  // Ligne tirets
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.25);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(ML, 56, W - MR, 56);
  doc.setLineDashPattern([], 0);

  // ── LIGNES D'INFORMATION ───────────────────────────────────
  let yy = 64;
  const LINE_H = 7.5;
  const MAX_Y = QR_Y - 4; // ne jamais dépasser la zone QR

  const ligne = (label, valeur, bold = false) => {
    if (yy > MAX_Y) return;
    doc.setTextColor(...GREY);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(label, ML, yy);
    doc.setTextColor(...INK);
    doc.setFontSize(7); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const val = (valeur === null || valeur === undefined || valeur === '') ? '-' : String(valeur);
    doc.text(val, Math.min(SAFE_RIGHT, W - MR), yy, { align: 'right' });
    yy += LINE_H;
  };

  const soustitre = (texte) => {
    if (yy > MAX_Y) return;
    yy += 2;
    doc.setFillColor(...GOLD);
    doc.rect(ML, yy - 1.5, 1.5, 5.5, 'F');
    doc.setTextColor(...INK);
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text(texte, ML + 4, yy + 2.5);
    yy += 8;
  };

  // Infos communes
  ligne(isEn ? 'Operator' : 'Opérateur', transaction.userName || 'FOREXIUM');

  // VENTE
  if (transaction.type === 'vente') {
    ligne(isEn ? 'Currency sold' : 'Devise vendue',
      `${(transaction.quantiteDevise || 0).toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${transaction.deviseVente || ''}`
    );
    ligne(isEn ? 'Rate applied' : 'Taux appliqué',
      `${(transaction.tauxVisible || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF`
    );
    ligne(isEn ? 'USDT consumed' : 'USDT consommé',
      `${(transaction.usdtConsomme || 0).toFixed(4)} USDT`
    );
    soustitre(isEn ? 'CLIENT' : 'CLIENT');
    ligne(isEn ? 'Name' : 'Nom', transaction.client || '-');

    if ((transaction.beneficeVisible || 0) > 0) {
      if (yy + 14 <= MAX_Y) {
        yy += 3;
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.3);
        doc.roundedRect(ML, yy - 1, CONTENT_W - QR_SIZE - 6, 13, 2, 2, 'S');
        doc.setTextColor(...GREY);
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(isEn ? 'Net profit' : 'Bénéfice net', ML + 3, yy + 4.5);
        doc.setTextColor(...GREEN);
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text(
          `+${(transaction.beneficeVisible || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF`,
          SAFE_RIGHT - 2, yy + 5, { align: 'right' }
        );
        yy += 17;
      }
    }
  }

  // ACHAT
  if (transaction.type === 'achat') {
    ligne(isEn ? 'Currency' : 'Devise', transaction.devise || 'USDT');
    ligne(isEn ? 'Quantity' : 'Quantité',
      `${(transaction.quantite || 0).toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${transaction.devise || 'USDT'}`
    );
    ligne(isEn ? 'Unit rate' : 'Taux unitaire',
      `${(transaction.taux || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF`
    );
    soustitre(isEn ? 'SUPPLIER' : 'FOURNISSEUR');
    ligne(isEn ? 'Name' : 'Nom', transaction.fournisseur || '-');
    ligne(isEn ? 'Source account' : 'Compte source',
      transaction.sourceCompte === 'depot' ? (isEn ? 'Deposit' : 'Dépôt') : (isEn ? 'Cash' : 'Caisse')
    );
  }

  // DÉPENSE / RETRAIT
  if (transaction.type === 'depense' || transaction.type === 'retrait') {
    if (transaction.categorie) ligne(isEn ? 'Category' : 'Catégorie', transaction.categorie);
    if (transaction.beneficiaire) ligne(isEn ? 'Beneficiary' : 'Bénéficiaire', transaction.beneficiaire);
    if (transaction.description) ligne(isEn ? 'Note' : 'Note', transaction.description);
  }

  // ── TOTAL ─────────────────────────────────────────────────
  const totalY = Math.min(yy + 3, MAX_Y);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.5);
  doc.line(ML, totalY, SAFE_RIGHT, totalY);
  doc.setTextColor(...INK);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', ML, totalY + 6);
  doc.text(
    `${montantDisplay.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF`,
    SAFE_RIGHT, totalY + 6, { align: 'right' }
  );
  doc.setLineWidth(0.3);
  doc.line(ML, totalY + 8, SAFE_RIGHT, totalY + 8);

  // ── QR CODE (zone fixe en bas à droite) ──────────────────
  const qrContenu = [
    'FOREXIUM RECEIPT',
    `ID: ${transaction.id}`,
    `Type: ${typeLabel}`,
    `Amount: ${montantDisplay.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF`,
    `Date: ${format(transaction.date instanceof Date ? transaction.date : new Date(transaction.date), 'dd/MM/yyyy HH:mm')}`,
    transaction.client ? `Client: ${transaction.client}` : '',
  ].filter(Boolean).join('\n');

  const qrDataURL = genererQRDataURL(qrContenu);
  if (qrDataURL) {
    doc.addImage(qrDataURL, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE);
    doc.setTextColor(...GREY);
    doc.setFontSize(5); doc.setFont('helvetica', 'normal');
    doc.text(
      isEn ? 'Scan to verify' : 'Scanner pour vérifier',
      QR_X + QR_SIZE / 2, QR_Y + QR_SIZE + 3, { align: 'center' }
    );
  }

  // ── FOOTER (zone fixe en bas à gauche) ───────────────────
  doc.setDrawColor(...LGREY);
  doc.setLineWidth(0.2);
  doc.line(ML, FOOTER_Y - 3, QR_X - 4, FOOTER_Y - 3);

  doc.setTextColor(...GREY);
  doc.setFontSize(5.5); doc.setFont('helvetica', 'normal');
  doc.text('forexium.com  —  contact@forexium.com', ML, FOOTER_Y + 1);
  doc.setFontSize(5);
  doc.text(
    isEn ? 'FOREXIUM 2026. All rights reserved.' : 'FOREXIUM 2026. Tous droits réservés.',
    ML, FOOTER_Y + 5
  );

  // ── BARRE DORÉE BASSE ─────────────────────────────────────
  doc.setFillColor(...GOLD);
  doc.rect(0, GOLD_BAR, W, H - GOLD_BAR, 'F');

  doc.save(`FOREXIUM_${transaction.id || 'receipt'}.pdf`);
};

// COMPOSANTS UI DE BASE
// ─────────────────────────────────────────────────────────────
const Logo = ({ dark }) => (
  <div className="flex items-center gap-2 sm:gap-3">
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-accent via-accent-light to-accent-dark flex items-center justify-center shadow-xl flex-shrink-0">
      <DollarSign className="w-5 h-5 sm:w-7 sm:h-7 text-primary" strokeWidth={2.5} />
    </div>
    <div>
      <h1 className={`text-lg sm:text-xl font-display font-bold tracking-tight ${dark ? 'text-white' : 'text-primary'}`}>FOREXIUM</h1>
      <p className="text-xs text-gray-500 tracking-widest hidden sm:block">PREMIUM EXCHANGE</p>
    </div>
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, type = 'button', disabled }) => {
  const variants = {
    primary: 'gradient-gold text-primary hover:shadow-xl hover:scale-105',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border-2 border-accent text-accent hover:bg-accent hover:text-primary',
    danger: 'bg-danger text-white hover:bg-red-600',
    warning: 'bg-warning/20 text-warning hover:bg-warning/30',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-4 sm:px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

const Input = ({ label, icon: Icon, error, numericOnly, dark, required, ...props }) => {
  const handleKeyDown = (e) => {
    if (numericOnly) {
      const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','.',','];
      if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
    }
  };
  return (
    <div className="space-y-1.5">
      {label && (
        <label className={`block text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
        <input onKeyDown={handleKeyDown}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl border-2 text-sm outline-none transition-all
            ${error ? 'border-red-400' : dark ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 bg-white'}
            focus:border-accent focus:ring-4 focus:ring-accent/10`}
          {...props} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

const Select = ({ label, options, dark, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className={`block text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>}
    <select className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all font-medium text-sm
      ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'}
      focus:border-accent focus:ring-4 focus:ring-accent/10`} {...props}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'accent', dark, badge }) => {
  const colors = {
    accent: 'from-accent/20 to-accent/5 text-accent',
    success: 'from-success/20 to-success/5 text-success',
    warning: 'from-warning/20 to-warning/5 text-warning',
    primary: dark ? 'from-white/10 to-white/5 text-white' : 'from-primary/10 to-primary/5 text-primary'
  };
  return (
    <div className={`rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        </div>
        {badge && <span className="text-xs font-bold px-2 py-1 rounded-lg bg-accent/10 text-accent">{badge}</span>}
        {trend !== undefined && !badge && (
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <h3 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</h3>
      <p className={`text-xl sm:text-2xl font-display font-bold mb-0.5 ${dark ? 'text-white' : 'text-primary'}`}>{value}</p>
      {subtitle && <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
    </div>
  );
};

// Panneau contextuel bleu — affiché dans les onglets pour donner le contexte
const ContextPanel = ({ dark, children, title, icon: Icon }) => (
  <div className={`p-4 rounded-xl border-2 ${dark ? 'bg-blue-900/20 border-blue-700/40' : 'bg-blue-50 border-blue-200'}`}>
    {title && (
      <div className="flex items-center gap-2 mb-2.5">
        {Icon && <Icon className={`w-4 h-4 ${dark ? 'text-blue-400' : 'text-blue-600'}`} />}
        <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-blue-400' : 'text-blue-700'}`}>{title}</p>
      </div>
    )}
    <div className="space-y-1.5">{children}</div>
  </div>
);

// Ligne info dans un ContextPanel
const InfoRow = ({ label, value, accent, dark }) => (
  <div className="flex justify-between items-center">
    <span className={`text-xs ${dark ? 'text-blue-300/70' : 'text-blue-600'}`}>{label}</span>
    <span className={`text-xs font-bold ${accent ? 'text-accent' : dark ? 'text-white' : 'text-primary'}`}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────
// ÉCRAN DE CONNEXION
// ─────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin, onRegister, langue, setLangue, dark, setDark, t }) => {
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // ── Champs Login ──
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading]   = useState(false);

  // ── Champs Inscription ──
  const [regName, setRegName]         = useState('');
  const [regEmail, setRegEmail]       = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPassword2, setRegPassword2] = useState('');
  const [regRole, setRegRole]         = useState('');
  const [regLoading, setRegLoading]   = useState(false);
  const [slots, setSlots]             = useState({ porteur: false, associe: false }); // true = déjà pris

  // Charger les slots disponibles quand on ouvre l'onglet inscription
  React.useEffect(() => {
    if (tab === 'register') {
      apiCheckSlots().then(res => {
        setSlots({ porteur: res.porteur_taken, associe: res.associe_taken });
        // Pré-sélectionner automatiquement le rôle libre
        if (!res.porteur_taken) setRegRole('porteur');
        else if (!res.associe_taken) setRegRole('associe');
      }).catch(() => {});
    }
  }, [tab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error(t.allFieldsRequired); return; }
    setLoginLoading(true);
    try { await onLogin(loginEmail, loginPassword); }
    finally { setLoginLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword || !regPassword2 || !regRole) {
      toast.error(t.allFieldsRequired); return;
    }
    if (regPassword !== regPassword2) {
      toast.error(langue === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match'); return;
    }
    if (regPassword.length < 4) {
      toast.error(langue === 'fr' ? 'Mot de passe trop court (min 4 caractères)' : 'Password too short (min 4 chars)'); return;
    }
    setRegLoading(true);
    try {
      await onRegister(regName, regEmail, regPassword, regRole);
      // Après inscription réussie → basculer vers login
      setTab('login');
      setLoginEmail(regEmail);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const inputCls = 'w-full px-5 py-3.5 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-white/60 focus:border-accent outline-none transition-all backdrop-blur-sm text-sm';
  const bothTaken = slots.porteur && slots.associe;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${dark ? 'bg-gray-950' : 'bg-gradient-to-br from-primary via-primary-light to-primary'}`}>
      {/* Arrière-plan décoratif */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-light rounded-full blur-3xl" />
      </div>

      {/* Boutons langue + thème */}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        <button onClick={() => setLangue(langue === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all backdrop-blur-sm">
          <Globe className="w-3.5 h-3.5" />{langue === 'fr' ? 'EN' : 'FR'}
        </button>
        <button onClick={() => setDark(!dark)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all backdrop-blur-sm">
          {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent via-accent-light to-accent-dark flex items-center justify-center shadow-2xl mx-auto mb-4">
              <DollarSign className="w-10 h-10 text-primary" strokeWidth={3} />
            </div>
            <h1 className="text-4xl font-display font-bold text-white mb-1">FOREXIUM</h1>
            <p className="text-gray-300 text-sm">{t.appSubtitle}</p>
          </div>

          {/* Onglets */}
          <div className="flex gap-2 mb-6 p-1 bg-white/10 rounded-2xl">
            <button onClick={() => setTab('login')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'login' ? 'gradient-gold text-primary shadow-lg' : 'text-white/70 hover:text-white'
              }`}>
              {langue === 'fr' ? '🔑 Connexion' : '🔑 Login'}
            </button>
            <button onClick={() => setTab('register')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'register' ? 'gradient-gold text-primary shadow-lg' : 'text-white/70 hover:text-white'
              }`}>
              {langue === 'fr' ? '✍️ Inscription' : '✍️ Register'}
            </button>
          </div>

          {/* ── ONGLET LOGIN ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder={t.email} value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className={inputCls} required />
              <input type="password" placeholder={t.password} value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className={inputCls} required />
              <button type="submit" disabled={loginLoading}
                className="w-full py-3.5 rounded-xl gradient-gold text-primary font-bold hover:shadow-xl hover:scale-105 transition-all disabled:opacity-70">
                {loginLoading ? '...' : t.login}
              </button>
            </form>
          )}

          {/* ── ONGLET INSCRIPTION ── */}
          {tab === 'register' && (
            <>
              {bothTaken ? (
                /* Les 2 comptes sont déjà créés */
                <div className="text-center py-6 space-y-3">
                  <div className="text-5xl">🔒</div>
                  <p className="text-white font-bold text-lg">
                    {langue === 'fr' ? 'Inscription fermée' : 'Registration closed'}
                  </p>
                  <p className="text-white/60 text-sm">
                    {langue === 'fr'
                      ? 'Les deux comptes (Porteur & Associé) sont déjà créés. Connectez-vous.'
                      : 'Both accounts (Carrier & Associate) are already created. Please log in.'}
                  </p>
                  <button onClick={() => setTab('login')}
                    className="mt-4 px-6 py-2.5 rounded-xl gradient-gold text-primary font-bold text-sm">
                    {langue === 'fr' ? 'Aller à la connexion' : 'Go to login'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Nom */}
                  <input type="text"
                    placeholder={langue === 'fr' ? 'Votre prénom / nom' : 'Your name'}
                    value={regName} onChange={e => setRegName(e.target.value)}
                    className={inputCls} required />

                  {/* Email */}
                  <input type="email" placeholder={t.email}
                    value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    className={inputCls} required />

                  {/* Mot de passe */}
                  <input type="password"
                    placeholder={langue === 'fr' ? 'Mot de passe' : 'Password'}
                    value={regPassword} onChange={e => setRegPassword(e.target.value)}
                    className={inputCls} required />

                  {/* Confirmer mot de passe */}
                  <input type="password"
                    placeholder={langue === 'fr' ? 'Confirmer le mot de passe' : 'Confirm password'}
                    value={regPassword2} onChange={e => setRegPassword2(e.target.value)}
                    className={inputCls} required />

                  {/* Choix du rôle */}
                  <div>
                    <p className="text-white/70 text-xs font-semibold mb-2 uppercase tracking-wide">
                      {langue === 'fr' ? 'Votre rôle' : 'Your role'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Porteur */}
                      <button type="button"
                        disabled={slots.porteur}
                        onClick={() => !slots.porteur && setRegRole('porteur')}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                          slots.porteur
                            ? 'opacity-40 cursor-not-allowed border-white/10 bg-white/5'
                            : regRole === 'porteur'
                              ? 'border-accent bg-accent/20'
                              : 'border-white/20 bg-white/5 hover:border-white/40'
                        }`}>
                        <div className="text-2xl mb-1">💼</div>
                        <div className="text-white font-bold text-sm">
                          {langue === 'fr' ? "Porteur d'affaire" : 'Business Owner'}
                        </div>
                        <div className="text-white/50 text-xs mt-0.5">
                          {langue === 'fr' ? 'Gère les opérations' : 'Manages operations'}
                        </div>
                        {slots.porteur && (
                          <div className="absolute top-2 right-2 text-[10px] bg-red-500/80 text-white px-1.5 py-0.5 rounded-full font-bold">
                            {langue === 'fr' ? 'Pris' : 'Taken'}
                          </div>
                        )}
                        {regRole === 'porteur' && !slots.porteur && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                          </div>
                        )}
                      </button>

                      {/* Associé */}
                      <button type="button"
                        disabled={slots.associe}
                        onClick={() => !slots.associe && setRegRole('associe')}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                          slots.associe
                            ? 'opacity-40 cursor-not-allowed border-white/10 bg-white/5'
                            : regRole === 'associe'
                              ? 'border-accent bg-accent/20'
                              : 'border-white/20 bg-white/5 hover:border-white/40'
                        }`}>
                        <div className="text-2xl mb-1">🤝</div>
                        <div className="text-white font-bold text-sm">
                          {langue === 'fr' ? 'Associé' : 'Associate'}
                        </div>
                        <div className="text-white/50 text-xs mt-0.5">
                          {langue === 'fr' ? 'Suit les résultats' : 'Tracks results'}
                        </div>
                        {slots.associe && (
                          <div className="absolute top-2 right-2 text-[10px] bg-red-500/80 text-white px-1.5 py-0.5 rounded-full font-bold">
                            {langue === 'fr' ? 'Pris' : 'Taken'}
                          </div>
                        )}
                        {regRole === 'associe' && !slots.associe && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={regLoading || !regRole}
                    className="w-full py-3.5 rounded-xl gradient-gold text-primary font-bold hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                    {regLoading ? '...' : (langue === 'fr' ? "S'inscrire" : 'Register')}
                  </button>

                  <p className="text-white/40 text-xs text-center">
                    {langue === 'fr'
                      ? '⚠️ Une seule inscription par rôle est possible.'
                      : '⚠️ Only one registration per role is allowed.'}
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL TRANSACTION — redesignée
// Vente PORTEUR : section visible + section cachée (protégée par MDP) dans le même formulaire
// Vente ASSOCIÉ : uniquement les champs visibles, pas de section cachée
// Achat: prix total → taux calculé, context panel stock+CMUP
// ─────────────────────────────────────────────────────────────
const TransactionModal = ({ data, profitShare, user, onClose, onSubmit, t, dark, langue, initialType = 'vente' }) => {
  const [type, setType] = useState(initialType);
  const [useCaisse, setUseCaisse] = useState(false);
  const isPorteur = user?.role === 'porteur';
  const { hiddenUnlocked, setHiddenUnlocked } = useHiddenData();

  // État commun
  const [form, setForm] = useState({
    devise: 'USDT', quantite: '', client: '',
    fournisseur: '', categorie: CATEGORIES[0], description: '',
    beneficiaire: '', transfertMontant: ''
  });

  // ── État VENTE USDT → RMB/USD ──
  const [deviseVente, setDeviseVente] = useState('RMB');
  const [tauxConv, setTauxConv] = useState('');
  const [tauxAchatXAFInput, setTauxAchatXAFInput] = useState('');
  const [tauxVisib, setTauxVisib] = useState('');
  const [customShareV, setCustomShareV] = useState(false);
  const [porteurPctV, setPorteurPctV] = useState(profitShare.porteur);

  // ── État SECTION CACHÉE (porteur uniquement) — déverrouillage par raccourci ou global toggle
  const [tauxCache, setTauxCache] = useState('');
  const [customShareC, setCustomShareC] = useState(false);
  const [porteurPctC, setPorteurPctC] = useState(profitShare.porteur);
  // Triple-tap pour mobile
  const hiddenTapRef = React.useRef({ count: 0, timer: null });

  const handleHiddenTap = () => {
    const ref = hiddenTapRef.current;
    ref.count += 1;
    if (ref.timer) clearTimeout(ref.timer);
    ref.timer = setTimeout(() => { ref.count = 0; }, 800);
    if (ref.count >= 3) {
      ref.count = 0;
      setHiddenUnlocked(prev => !prev);
    }
  };

  // ── État ACHAT ──
  const [tauxAchatInput, setTauxAchatInput] = useState(''); // taux par unité saisi

  // ── Calculs VENTE ──
  const usdtStock   = data.devises.find(d => d.devise === 'USDT');
  const cmupUsdt    = usdtStock ? usdtStock.cmup : 0;
  const stockActuel = usdtStock ? usdtStock.quantite : 0;
  const qte         = parseFloat(form.quantite) || 0;
  const conv        = parseFloat(tauxConv) || 0;
  const tvV         = parseThousands(tauxVisib) || 0;
  const usdtConso   = conv > 0 ? qte / conv : 0;
  const tauxAchatXAF = conv > 0 ? cmupUsdt / conv : (parseFloat(tauxAchatXAFInput) || 0);
  const valAchat    = usdtConso * cmupUsdt;
  const valVenteV   = qte * tvV;
  const benV        = valVenteV - valAchat;
  const pctPV       = customShareV ? porteurPctV : profitShare.porteur;
  const pctAV       = 100 - pctPV;
  const partPV      = benV * (pctPV / 100);
  const partAV      = benV * (pctAV / 100);
  const stockRestant = stockActuel - usdtConso;

  // ── Calculs SECTION CACHÉE (porteur uniquement) ──
  const tauxC  = parseThousands(tauxCache) || 0;
  const valVenteC = qte * tauxC;
  const benC   = valVenteC - valAchat;
  const pctPC  = customShareC ? porteurPctC : profitShare.porteur;
  const pctAC  = 100 - pctPC;
  const partPC = benC * pctPC / 100;
  const partAC = benC * pctAC / 100;

  // Valeurs à afficher selon visibilité globale
  const showHidden = isPorteur && hiddenUnlocked && tauxC > 0;
  const myShareValue = showHidden ? partPC : partPV;
  const mySharePct = showHidden ? pctPC : pctPV;
  const profitDistributionValue = showHidden ? partPC : partPV;
  const profitDistributionPct = showHidden ? pctPC : pctPV;

  // ── Calculs ACHAT ──
  const deviseStockAchat = data.devises.find(d => d.devise === form.devise);
  const quantite   = parseFloat(form.quantite) || 0;
  const tauxAchat  = parseThousands(tauxAchatInput) || 0;
  const prixAchat  = quantite * tauxAchat; // auto-calculé
  const ancienStock = deviseStockAchat ? deviseStockAchat.quantite : 0;
  const ancienCMUP  = deviseStockAchat ? deviseStockAchat.cmup : 0;
  const nouveauCMUP = quantite > 0 && tauxAchat > 0
    ? calculerCMUP(ancienStock, ancienCMUP, quantite, tauxAchat)
    : ancienCMUP;

  // Liaison bidirectionnelle tauxConv ↔ tauxAchatXAF
  const handleTauxConvChange = (val) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setTauxConv(clean);
    const v = parseFloat(clean);
    if (v > 0 && cmupUsdt > 0) {
      setTauxAchatXAFInput((cmupUsdt / v).toFixed(6));
    } else {
      setTauxAchatXAFInput('');
    }
  };

  const handleTauxAchatChange = (val) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setTauxAchatXAFInput(clean);
    const v = parseFloat(clean);
    if (v > 0 && cmupUsdt > 0) {
      setTauxConv((cmupUsdt / v).toFixed(6));
    } else {
      setTauxConv('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // RESTOCK
    if (type === 'restock') {
      const m = parseFloat(form.transfertMontant) || 0;
      if (!m || m <= 0) { toast.error(t.allFieldsRequired); return; }
      onSubmit({ type: 'restock', montant: m }); return;
    }

    // VENTE → porteur: soumis comme committed avec données cachées si section déverrouillée
    //         associé: soumis comme pending (sans données cachées)
    if (type === 'vente') {
      if (!form.client.trim()) { toast.error(t.clientRequired); return; }
      if (!qte || !conv || !tvV) { toast.error(t.allFieldsRequired); return; }
      if (usdtConso > stockActuel) { toast.error(t.insufficientStock + ' (USDT)'); return; }

      const basePayload = {
        type: 'vente',
        devise: 'USDT',
        deviseVente,
        quantite: usdtConso,
        quantiteDevise: qte,
        tauxConversion: conv,
        tauxAchatXAF,
        tauxVisible: tvV,
        montant: valVenteV,
        valeurAchat: valAchat,
        valeurVenteVisible: valVenteV,
        beneficeVisible: benV,
        profit: benV,
        partPorteur: partPV,
        partAssocie: partAV,
        porteurPct: pctPV,
        associePct: pctAV,
        usdtConsomme: usdtConso,
        client: form.client,
      };

      // Porteur avec section cachée déverrouillée et taux caché renseigné → committed immédiat
      if (isPorteur && hiddenUnlocked && tauxC > 0) {
        onSubmit({
          ...basePayload,
          statut: 'committed',
          tauxCache: tauxC,
          valeurVenteCachee: valVenteC,
          beneficeCachee: benC,
          partPorteurCache: partPC,
          partAssocieCache: partAC,
          porteurPctCache: pctPC,
          associePctCache: pctAC,
        });
      } else if (isPorteur) {
        // Porteur sans données cachées → pending (à finaliser plus tard)
        onSubmit({ ...basePayload, statut: 'pending' });
      } else {
        // Associé → assoc_pending : stock déduit immédiatement, validation porteur requise pour committé définitif
        onSubmit({ ...basePayload, statut: 'assoc_pending' });
      }
      return;
    }

    // ACHAT
    if (type === 'achat') {
      if (!quantite || !tauxAchat) { toast.error(t.allFieldsRequired); return; }
      if (useCaisse && prixAchat > data.caisse) { toast.error(t.insufficientCaisse); return; }
      onSubmit({
        type: 'achat',
        statut: 'committed',
        devise: form.devise,
        quantite,
        taux: tauxAchat,
        montant: prixAchat,
        fournisseur: form.fournisseur,
        sourceCompte: useCaisse ? 'caisse' : 'depot',
        profit: null, partPorteur: null, partAssocie: null,
      }); return;
    }

    // DÉPENSE
    if (type === 'depense') {
      const montant = parseThousands(form.quantite) || 0;
      if (!montant) { toast.error(t.allFieldsRequired); return; }
      if (montant > data.caisse) { toast.error(t.insufficientCaisse); return; }
      onSubmit({
        type: 'depense', statut: 'committed',
        montant, taux: montant, quantite: 1,
        categorie: form.categorie, description: form.description,
        profit: null, partPorteur: null, partAssocie: null,
      }); return;
    }

    // RETRAIT
    if (type === 'retrait') {
      const montant = parseThousands(form.quantite) || 0;
      if (!montant) { toast.error(t.allFieldsRequired); return; }
      if (montant > data.caisse) { toast.error(t.insufficientCaisse); return; }
      onSubmit({
        type: 'retrait', statut: 'committed',
        montant, taux: montant, quantite: 1,
        beneficiaire: form.beneficiaire, description: form.description,
        profit: null, partPorteur: null, partAssocie: null,
      }); return;
    }
  };

  const bg = dark ? 'bg-gray-900 text-white' : 'bg-white';
  const tabs = [
    { id: 'vente', label: t.sale, icon: ArrowUpRight },
    { id: 'achat', label: t.purchase, icon: ArrowDownLeft },
    { id: 'depense', label: t.expense, icon: FileText },
    { id: 'retrait', label: t.withdrawal, icon: DollarSign },
    { id: 'restock', label: t.restock, icon: RefreshCw }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bg} rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl`}>
        <div className="flex justify-between items-center mb-5">
          <h2 className={`text-xl font-display font-bold ${dark ? 'text-white' : 'text-primary'}`}>{t.newTransaction}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setType(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap text-xs
                ${type === id ? 'gradient-gold text-primary shadow-lg' : dark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── RESTOCK ─────────────────────── */}
          {type === 'restock' && (
            <div className="space-y-4">
              <ContextPanel dark={dark} title={langue === 'fr' ? 'Soldes actuels' : 'Current balances'} icon={Info}>
                <InfoRow dark={dark} label={t.currentCaisse} value={`${data.caisse.toLocaleString('fr-FR')} XAF`} accent />
                <InfoRow dark={dark} label={langue==='fr'?'Dépôt':'Deposit'} value={`${data.depot.toLocaleString('fr-FR')} XAF`} />
              </ContextPanel>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {langue==='fr'?'Montant à créditer dans la Caisse (XAF)':'Amount to credit to Cash Register (XAF)'}
                </label>
                <input type="text" inputMode="numeric"
                  value={form.transfertMontant}
                  onChange={e => setForm({ ...form, transfertMontant: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="Ex : 500 000"
                  className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 bg-white'} focus:border-accent`}
                  required />
                {form.transfertMontant && (
                  <div className={`mt-2 flex justify-between text-xs px-2 ${dark?'text-gray-400':'text-gray-500'}`}>
                    <span>{langue==='fr'?'Caisse après versement':'Cash after deposit'} :</span>
                    <span className="font-bold text-accent">
                      {(data.caisse + (parseInt(form.transfertMontant)||0)).toLocaleString('fr-FR')} XAF
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              ── VENTE USDT → RMB / USD ──────────────────────────
              ══════════════════════════════════════════════════════ */}
          {type === 'vente' && (
            <>
              {/* Context panel USDT — toujours visible */}
              <ContextPanel dark={dark} title="Stock USDT" icon={Warehouse}>
                <InfoRow dark={dark} label={t.stockCourant} value={`${stockActuel.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} USDT`} accent />
                <InfoRow dark={dark} label="CMUP" value={`${cmupUsdt.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF/USDT`} />
                <InfoRow dark={dark} label="Valeur totale stock"
                  value={`${(stockActuel * cmupUsdt).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} XAF`} />
              </ContextPanel>

              {/* 1. Devise de vente */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{t.deviseVente}</label>
                <div className="flex gap-3">
                  {DEVISES_VENTE.map(dv => (
                    <button key={dv.code} type="button" onClick={() => setDeviseVente(dv.code)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                        deviseVente === dv.code
                          ? 'border-accent bg-accent/10 text-accent'
                          : dark ? 'border-gray-600 bg-gray-800 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}>
                      {dv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Taux de conversion ↔ Taux achat XAF (bidirectionnel) */}
              <div className={`p-4 rounded-xl border-2 space-y-3 ${dark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Taux — modifier l'un recalcule l'autre
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {t.tauxConversion} ({deviseVente}/USDT)
                    </label>
                    <input type="text" inputMode="decimal"
                      placeholder={deviseVente === 'RMB' ? 'Ex: 6.94' : 'Ex: 1.08'}
                      value={tauxConv}
                      onChange={e => handleTauxConvChange(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-white'} focus:border-accent`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {t.tauxAchatCalc} (XAF/{deviseVente})
                    </label>
                    <input type="text" inputMode="decimal"
                      placeholder="Auto-calculé"
                      value={tauxAchatXAFInput}
                      onChange={e => handleTauxAchatChange(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-accent/50 bg-gray-700 text-accent' : 'border-accent/30 bg-accent/5 text-accent font-semibold'} focus:border-accent`} />
                  </div>
                </div>
              </div>

              {/* 3. Quantité + Taux vente visible */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.quantity} ({deviseVente})
                  </label>
                  <input type="text" inputMode="numeric"
                    value={form.quantite}
                    onChange={e => setForm({ ...form, quantite: e.target.value.replace(/[^0-9.]/g, '') })}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`}
                    required />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.tauxVenteVisible} (XAF/{deviseVente})
                  </label>
                  <input type="text" inputMode="numeric"
                    value={tauxVisib}
                    onChange={handleDecInput(setTauxVisib)}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`}
                    required />
                </div>
              </div>

              {/* 4. Client */}
              <div className="space-y-1.5">
                <label className={`block text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Client <span className="text-red-500 ml-1 text-xs">({t.obligatoire})</span>
                </label>
                <input type="text" value={form.client}
                  onChange={e => setForm({ ...form, client: e.target.value })}
                  placeholder={t.clientPlaceholder}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 bg-white'} focus:border-accent`} />
              </div>

              {/* 5. Répartition visible */}
              <div className={`rounded-xl border-2 p-4 ${dark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-bold ${dark ? 'text-white' : 'text-primary'}`}>{t.repartitionVisible}</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t.customShare}</span>
                    <div onClick={() => setCustomShareV(!customShareV)}
                      className={`w-10 h-5 rounded-full transition-all cursor-pointer relative ${customShareV ? 'bg-accent' : dark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: customShareV ? '22px' : '2px' }} />
                    </div>
                  </label>
                </div>
                {customShareV ? (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={dark ? 'text-gray-300' : 'text-gray-600'}>{t.partner}</span>
                      <span className="font-bold text-accent">{porteurPctV}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={porteurPctV}
                      onChange={e => setPorteurPctV(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-accent" />
                    <div className="flex justify-between text-xs mt-1">
                      <span className={dark ? 'text-gray-300' : 'text-gray-600'}>{t.associate}</span>
                      <span className={`font-bold ${dark ? 'text-white' : 'text-primary'}`}>{100 - porteurPctV}%</span>
                    </div>
                  </div>
                ) : (
                  <div className={`flex justify-between text-xs px-2 py-1.5 rounded-lg ${dark ? 'bg-gray-700' : 'bg-white'}`}>
                    <span>{t.partner} : <strong className="text-accent">{profitShare.porteur}%</strong></span>
                    <span>{t.associate} : <strong>{profitShare.associe}%</strong></span>
                  </div>
                )}
              </div>

              {/* 6. Calculs automatiques — partie VISIBLE */}
              {qte > 0 && conv > 0 && tvV > 0 && (
                <div className={`rounded-xl p-4 border-2 ${dark ? 'bg-gray-800 border-accent/30' : 'bg-accent/5 border-accent/20'}`}>
                  <h4 className={`font-bold text-sm flex items-center gap-2 mb-3 ${dark ? 'text-white' : 'text-primary'}`}>
                    <BarChart3 className="w-4 h-4" />{t.autoCalc}
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between pb-2 border-b border-dashed border-accent/20">
                      <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t.stockUsdtConsomme}</span>
                      <span className="font-bold text-orange-500">{usdtConso.toFixed(6)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t.valeurAchatXAF}</span>
                      <span className="font-semibold">{valAchat.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t.valeurVenteVisible}</span>
                      <span className="font-semibold text-accent">{valVenteV.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-dashed border-gray-200 pt-1 mt-1">
                      <span>{t.beneficeVisible}</span>
                      <span className={benV >= 0 ? 'text-green-500' : 'text-red-500'}>{benV.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.partner} ({pctPV}%)</span>
                      <span className="text-accent font-semibold">{partPV.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.associate} ({pctAV}%)</span>
                      <span className="font-semibold">{partAV.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF</span>
                    </div>
                    <div className={`flex justify-between font-bold pt-2 border-t mt-1 ${dark ? 'border-gray-600' : 'border-accent/20'}`}>
                      <span>{langue === 'fr' ? 'Stock après vente' : 'Stock after sale'}</span>
                      <span className={stockRestant < 0 ? 'text-red-500' : 'text-success'}>
                        {stockRestant.toFixed(4)} USDT
                      </span>
                    </div>

                    {/* ── Calcul de référence (porteur + déverrouillé) ── */}
                    {isPorteur && hiddenUnlocked && tauxC > 0 && (
                      <div className={`mt-2 pt-2 border-t border-dashed ${dark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
                        <p className={`text-[10px] font-medium mb-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {langue === 'fr' ? 'Calcul de référence' : 'Reference calculation'}
                        </p>
                        <div className="flex justify-between">
                          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{langue==='fr'?'Taux réf.':'Ref. rate'}</span>
                          <span className={`font-semibold text-xs ${dark?'text-gray-300':'text-gray-600'}`}>{tauxC.toLocaleString('fr-FR')} XAF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{langue==='fr'?'Bénéfice réf.':'Ref. profit'}</span>
                          <span className={`font-semibold text-xs ${benC >= 0 ? 'text-green-500' : 'text-red-500'}`}>{benC.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{t.partner} ({pctPC}%)</span>
                          <span className={`font-semibold text-xs ${dark?'text-gray-300':'text-gray-600'}`}>{partPC.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Zone secrète — invisible tant que verrouillée, active par Ctrl+Shift+H ou 3 taps */}
              {isPorteur && (
                <div>
                  {/* Tap zone invisible permanente */}
                  {!hiddenUnlocked && (
                    <div
                      className="w-full h-0 overflow-hidden cursor-default"
                      onTouchEnd={handleHiddenTap}
                      onDoubleClick={handleHiddenTap}
                    />
                  )}
                  {/* Contenu déverrouillé */}
                  {hiddenUnlocked && (
                    <div className={`rounded-xl overflow-hidden ${dark ? 'border border-white/[0.05]' : 'border border-gray-100'}`}>
                      <div className={`flex items-center justify-between px-3 py-2 cursor-pointer select-none ${dark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}
                        onTouchEnd={handleHiddenTap} onDoubleClick={handleHiddenTap}>
                        <span className={`text-[10px] font-semibold tracking-widest uppercase ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                          {langue === 'fr' ? 'Taux de référence' : 'Reference rate'}
                        </span>
                        <button type="button" onClick={() => { setHiddenUnlocked(false); setTauxCache(''); }}
                          className={`text-[10px] font-medium ${dark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                          {langue === 'fr' ? 'réduire' : 'collapse'}
                        </button>
                      </div>
                      <div className={`px-3 pb-3 pt-2 space-y-3 ${dark ? 'bg-transparent' : 'bg-white'}`}>
                        <div>
                          <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {langue === 'fr' ? `Taux de référence (XAF/${deviseVente})` : `Reference rate (XAF/${deviseVente})`}
                          </label>
                          <input type="text" inputMode="numeric"
                            placeholder="0"
                            value={tauxCache}
                            onChange={handleDecInput(setTauxCache)}
                            className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all ${dark ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder-white/20' : 'border-gray-200 bg-white'} focus:border-gray-300`} />
                        </div>
                        <div className={`rounded-lg p-2.5 ${dark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-100'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{langue === 'fr' ? 'Répartition' : 'Split'}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <span className={`text-[10px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{langue === 'fr' ? 'personnaliser' : 'customize'}</span>
                              <div onClick={() => setCustomShareC(!customShareC)}
                                className={`w-7 h-3.5 rounded-full transition-all cursor-pointer relative ${customShareC ? (dark?'bg-gray-500':'bg-gray-400') : dark?'bg-gray-700':'bg-gray-200'}`}>
                                <div className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all" style={{ left: customShareC ? '14px' : '2px' }} />
                              </div>
                            </label>
                          </div>
                          {customShareC ? (
                            <div>
                              <input type="range" min="0" max="100" value={porteurPctC}
                                onChange={e => setPorteurPctC(parseInt(e.target.value))}
                                className="w-full h-1.5 rounded appearance-none cursor-pointer" style={{ accentColor: dark?'#6B7280':'#9CA3AF' }} />
                              <div className="flex justify-between text-[10px] mt-1">
                                <span className={dark?'text-gray-500':'text-gray-400'}>{t.partner} {porteurPctC}%</span>
                                <span className={dark?'text-gray-500':'text-gray-400'}>{t.associate} {100-porteurPctC}%</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between text-[10px]">
                              <span className={dark?'text-gray-500':'text-gray-400'}>{t.partner} {profitShare.porteur}%</span>
                              <span className={dark?'text-gray-500':'text-gray-400'}>{t.associate} {profitShare.associe}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Note associé — transaction enregistrée immédiatement */}
              {!isPorteur && (
                <div className={`flex items-center gap-2 p-3 rounded-xl ${dark ? 'bg-success/10 border border-success/30' : 'bg-green-50 border border-green-200'}`}>
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${dark ? 'text-success' : 'text-green-600'}`} />
                  <p className={`text-xs ${dark ? 'text-green-300' : 'text-green-700'}`}>
                    {langue === 'fr'
                      ? 'Cette vente sera enregistrée immédiatement après soumission.'
                      : 'This sale will be recorded immediately after submission.'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── ACHAT ───────────────────────── */}
          {type === 'achat' && (
            <>
              {/* Context panel stock courant */}
              <ContextPanel dark={dark} title={t.infoAchat} icon={Info}>
                {DEVISES.map(d => {
                  const s = data.devises.find(ds => ds.devise === d);
                  return s ? (
                    <div key={d}>
                      <InfoRow dark={dark} label={`${d} — ${t.stockCourant}`} value={`${s.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} ${d}`} accent />
                      <InfoRow dark={dark} label={`CMUP actuel`} value={`${s.cmup.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF/${d}`} />
                    </div>
                  ) : (
                    <InfoRow key={d} dark={dark} label={d} value="Nouveau stock" />
                  );
                })}
              </ContextPanel>

              <Select label="Devise achetée" dark={dark}
                options={DEVISES.map(d => ({ value: d, label: d }))}
                value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value })} />

              {/* Quantité + Taux d'achat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.quantity} ({form.devise}) <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="numeric"
                    placeholder="Ex: 1000"
                    value={form.quantite}
                    onChange={e => setForm({ ...form, quantite: e.target.value.replace(/[^0-9.]/g, '') })}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`} />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {langue === 'fr' ? "Taux d'achat (XAF)" : 'Purchase Rate (XAF)'} <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="numeric"
                    placeholder="Ex: 650"
                    value={tauxAchatInput}
                    onChange={handleDecInput(setTauxAchatInput)}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`} />
                </div>
              </div>

              {/* Taux calculé automatiquement + nouveau CMUP */}
              {quantite > 0 && tauxAchat > 0 && (
                <div className={`p-3 rounded-xl space-y-1.5 ${dark ? 'bg-gray-700' : 'bg-accent/5'}`}>
                  <div className="flex justify-between text-xs">
                    <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{langue === 'fr' ? 'Montant total XAF (auto-calculé)' : 'Total XAF amount (auto-calculated)'}</span>
                    <span className="font-bold text-accent">{prixAchat.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t.nouveauCMUP}</span>
                    <span className={`font-bold ${dark ? 'text-white' : 'text-primary'}`}>{nouveauCMUP.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF/{form.devise}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold border-t pt-1.5">
                    <span>{langue === 'fr' ? 'Coût total' : 'Total cost'}</span>
                    <span className={dark ? 'text-white' : 'text-primary'}>{prixAchat.toLocaleString('fr-FR')} XAF</span>
                  </div>
                </div>
              )}

              <Input label={t.supplier} dark={dark}
                value={form.fournisseur} onChange={e => setForm({ ...form, fournisseur: e.target.value })} />

              {/* Source : Caisse ou Dépôt */}
              <div className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${useCaisse ? 'border-accent bg-accent/5' : dark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-primary'}`}>
                    {langue === 'fr' ? 'Prélever depuis la Caisse' : 'Debit from Cash Register'}
                  </p>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {langue === 'fr' ? 'Caisse disponible :' : 'Available:'} <strong>{data.caisse.toLocaleString('fr-FR')} XAF</strong>
                  </p>
                </div>
                <div onClick={() => setUseCaisse(!useCaisse)}
                  className={`w-11 h-6 rounded-full transition-all cursor-pointer relative flex-shrink-0 ${useCaisse ? 'bg-accent' : dark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: useCaisse ? '23px' : '4px' }} />
                </div>
              </div>

              {/* Warning si caisse insuffisante */}
              {useCaisse && prixAchat > data.caisse && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                  <p className="text-xs text-danger font-semibold">{t.insufficientCaisse}</p>
                </div>
              )}
            </>
          )}

          {/* ── DÉPENSE ─────────────────────── */}
          {type === 'depense' && (
            <>
              <ContextPanel dark={dark} title={t.infoCaisse} icon={Info}>
                <InfoRow dark={dark} label={t.soldeDisponible} value={`${data.caisse.toLocaleString('fr-FR')} XAF`} accent />
              </ContextPanel>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.amount} <span className="text-red-500">*</span>
                </label>
                <input type="text" inputMode="numeric"
                  value={form.quantite}
                  onChange={e => { const r=e.target.value.replace(/[\s\u00A0]/g,'').replace(/[^0-9]/g,''); setForm({...form, quantite: r===''?'':fmtThousands(r)}); }}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`} />
              </div>
              <Select label={t.category} dark={dark} options={CATEGORIES.map(c => ({ value: c, label: c }))}
                value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} />
              <Input label={t.description} dark={dark}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              {parseThousands(form.quantite) > data.caisse && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                  <p className="text-xs text-danger font-semibold">{t.insufficientCaisse}</p>
                </div>
              )}
            </>
          )}

          {/* ── RETRAIT ─────────────────────── */}
          {type === 'retrait' && (
            <>
              <ContextPanel dark={dark} title={t.infoCaisse} icon={Info}>
                <InfoRow dark={dark} label={t.soldeDisponible} value={`${data.caisse.toLocaleString('fr-FR')} XAF`} accent />
              </ContextPanel>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.amount} <span className="text-red-500">*</span>
                </label>
                <input type="text" inputMode="numeric"
                  value={form.quantite}
                  onChange={e => { const r=e.target.value.replace(/[\s\u00A0]/g,'').replace(/[^0-9]/g,''); setForm({...form, quantite: r===''?'':fmtThousands(r)}); }}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`} />
              </div>
              <Input label={t.beneficiary} dark={dark}
                value={form.beneficiaire} onChange={e => setForm({ ...form, beneficiaire: e.target.value })} required />
              <Input label={t.reason} dark={dark}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              {parseThousands(form.quantite) > data.caisse && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                  <p className="text-xs text-danger font-semibold">{t.insufficientCaisse}</p>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t.cancel}</Button>
            <Button type="submit" className="flex-1">{t.save}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL FINALISATION — porteur finalise une vente pending
// Protégé par mot de passe, ajoute les données cachées
// ─────────────────────────────────────────────────────────────
const FinalisationModal = ({ transaction, profitShare, onClose, onFinalize, t, dark, langue }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [tauxCache, setTauxCache] = useState('');
  const [customShareC, setCustomShareC] = useState(false);
  const [porteurPctC, setPorteurPctC] = useState(profitShare.porteur);
  const finTapRef = React.useRef({ count: 0, timer: null });

  React.useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') { e.preventDefault(); setUnlocked(prev => !prev); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleFinTap = () => {
    const ref = finTapRef.current;
    ref.count += 1;
    if (ref.timer) clearTimeout(ref.timer);
    ref.timer = setTimeout(() => { ref.count = 0; }, 800);
    if (ref.count >= 3) { ref.count = 0; setUnlocked(prev => !prev); }
  };

  const qteDevise = transaction.quantiteDevise || 0;
  const tauxC = parseFloat(tauxCache) || 0;
  const valVenteC = qteDevise * tauxC;
  const benC = valVenteC - (transaction.valeurAchat || 0);
  const pctPC = customShareC ? porteurPctC : profitShare.porteur;
  const pctAC = 100 - pctPC;
  const partPC = benC * pctPC / 100;
  const partAC = benC * pctAC / 100;

  const handleFinalize = (e) => {
    e.preventDefault();
    if (!tauxC) { toast.error(t.allFieldsRequired); return; }
    onFinalize(transaction.id, {
      tauxCache: tauxC, porteurPctC: pctPC, associePctC: pctAC,
      valeurVenteCachee: valVenteC, beneficeCachee: benC,
      partPorteurCache: partPC, partAssocieCache: partAC,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${dark ? 'bg-gray-900' : 'bg-white'} rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 w-full sm:max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl`}>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className={`text-lg font-display font-bold flex items-center gap-2 ${dark ? 'text-white' : 'text-primary'}`}>
              <Lock className="w-5 h-5 text-amber-500" />{t.finaliserVente}
            </h2>
            <p className={`text-xs mt-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t.finaliserDesc}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Résumé de la transaction */}
        <ContextPanel dark={dark} title="Résumé vente" icon={Info}>
          <InfoRow dark={dark} label="Client" value={transaction.client || '-'} />
          <InfoRow dark={dark} label={`Quantité (${transaction.deviseVente})`} value={`${transaction.quantiteDevise?.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} ${transaction.deviseVente}`} />
          <InfoRow dark={dark} label="USDT consommé" value={`${transaction.usdtConsomme?.toFixed(6)} USDT`} />
          <InfoRow dark={dark} label="Valeur achat" value={`${transaction.valeurAchat?.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF`} />
          <InfoRow dark={dark} label="Taux visible" value={`${transaction.tauxVisible} XAF/${transaction.deviseVente}`} />
          <InfoRow dark={dark} label="Bénéfice visible" value={`${transaction.beneficeVisible?.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF`} accent />
        </ContextPanel>

        {/* Zone secrète déverrouillage — invisible quand verrouillée */}
        {!unlocked ? (
          <div
            className="mt-2 h-3 cursor-pointer select-none rounded"
            style={{ opacity: 0 }}
            onTouchEnd={handleFinTap}
            onDoubleClick={handleFinTap}
          />
        ) : (
          <form onSubmit={handleFinalize} className="mt-4 space-y-4">
            <div className={`rounded-xl overflow-hidden ${dark ? 'border border-white/[0.05]' : 'border border-gray-100'}`}>
              <div className={`px-3 py-2 ${dark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                <span className={`text-[10px] font-semibold tracking-widest uppercase ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                  {langue === 'fr' ? 'Taux de référence' : 'Reference rate'}
                </span>
              </div>
              <div className={`px-3 pb-3 pt-2 space-y-3 ${dark ? '' : 'bg-white'}`}>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {langue === 'fr' ? `XAF / ${transaction.deviseVente}` : `XAF / ${transaction.deviseVente}`}
                  </label>
                  <input type="text" inputMode="numeric"
                    placeholder="0"
                    value={tauxCache}
                    onChange={handleDecInput(setTauxCache)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all ${dark ? 'border-white/[0.08] bg-white/[0.03] text-white' : 'border-gray-200 bg-white'} focus:border-gray-300`} />
                </div>

                {tauxC > 0 && (
                  <div className={`p-2.5 rounded-lg text-xs space-y-1 ${dark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className="flex justify-between">
                      <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{langue==='fr'?'Bénéfice réf.':'Ref. profit'}</span>
                      <span className={`font-semibold ${benC >= 0 ? 'text-green-500' : 'text-red-500'}`}>{benC.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{t.partner} ({pctPC}%)</span>
                      <span className={`font-medium ${dark?'text-gray-300':'text-gray-600'}`}>{partPC.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                    </div>
                  </div>
                )}

                {/* Répartition cachée */}
                <div className={`rounded-xl p-3 ${dark ? 'bg-gray-700' : 'bg-amber-100/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-700'}`}>{t.repartitionCachee}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t.customShareCache}</span>
                      <div onClick={() => setCustomShareC(!customShareC)}
                        className={`w-10 h-5 rounded-full transition-all cursor-pointer relative ${customShareC ? 'bg-accent' : dark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: customShareC ? '22px' : '2px' }} />
                      </div>
                    </label>
                  </div>
                  {customShareC ? (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={dark ? 'text-gray-300' : 'text-gray-600'}>{t.partner}</span>
                        <span className="font-bold text-accent">{porteurPctC}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={porteurPctC}
                        onChange={e => setPorteurPctC(parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-accent" />
                    </div>
                  ) : (
                    <div className={`flex justify-between text-xs px-2 py-1 rounded-lg ${dark ? 'bg-gray-600' : 'bg-white/70'}`}>
                      <span>{t.partner} : <strong className="text-accent">{profitShare.porteur}%</strong></span>
                      <span>{t.associate} : <strong>{profitShare.associe}%</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t.cancel}</Button>
              <Button type="submit" className="flex-1">{t.finaliserVente}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL ÉDITION — interface identique à la saisie originale selon le type
// ─────────────────────────────────────────────────────────────
const EditModal = ({ transaction, data, allTransactions, onClose, onEdit, t, dark, langue }) => {
  const isPorteur = true; // EditModal n'est accessible qu'au porteur
  // Empêcher modification si vente déjà validée (statut 'committed')
  const isLocked = transaction.type === 'vente' && transaction.statut === 'committed';

  // ── État VENTE ──
  const [deviseVente, setDeviseVente] = useState(transaction.deviseVente || 'RMB');
  const [tauxConv, setTauxConv] = useState(transaction.tauxConversion?.toString() || '');
  const [tauxAchatXAFInput, setTauxAchatXAFInput] = useState(
    transaction.tauxAchatXAF?.toString() || ''
  );
  const [tauxVisib, setTauxVisib] = useState(transaction.tauxVisible?.toString() || '');
  const [quantiteDeviseEdit, setQuantiteDeviseEdit] = useState(transaction.quantiteDevise?.toString() || '');
  const [clientVal, setClientVal] = useState(transaction.client || '');
  const [customShareV, setCustomShareV] = useState(false);
  const [porteurPctV, setPorteurPctV] = useState(transaction.porteurPct || 70);

  // ── Section cachée (porteur) ──
  const [hiddenUnlocked, setHiddenUnlocked] = useState(false);
  const [tauxCache, setTauxCache] = useState(transaction.tauxCache?.toString() || '');
  const [customShareC, setCustomShareC] = useState(false);
  const [porteurPctC, setPorteurPctC] = useState(transaction.porteurPctCache || 70);
  const hiddenTapRef = React.useRef({ count: 0, timer: null });

  React.useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setHiddenUnlocked(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleHiddenTap = () => {
    const ref = hiddenTapRef.current;
    ref.count += 1;
    if (ref.timer) clearTimeout(ref.timer);
    ref.timer = setTimeout(() => { ref.count = 0; }, 800);
    if (ref.count >= 3) { ref.count = 0; setHiddenUnlocked(prev => !prev); }
  };

  // ── État ACHAT ──
  const [quantiteAchat, setQuantiteAchat] = useState(transaction.quantite?.toString() || '');
  const [tauxAchatInput, setTauxAchatInput] = useState(transaction.taux?.toString() || '');

  // ── État DÉPENSE / RETRAIT ──
  const [montantEdit, setMontantEdit] = useState(transaction.montant?.toString() || '');
  const [descriptionEdit, setDescriptionEdit] = useState(transaction.description || '');
  const [beneficiaireEdit, setBeneficiaireEdit] = useState(transaction.beneficiaire || '');
  const [fournisseurEdit, setFournisseurEdit] = useState(transaction.fournisseur || '');

  // ── Calculs VENTE ──
  const usdtStock = data.devises.find(d => d.devise === 'USDT');
  const cmupUsdt  = usdtStock ? usdtStock.cmup : 0;
  const stockActuel = usdtStock ? usdtStock.quantite : 0;
  const qte  = parseFloat(quantiteDeviseEdit || transaction.quantiteDevise || 0);
  const conv = parseFloat(tauxConv) || 0;
  const tvV  = parseFloat(tauxVisib) || 0;
  const usdtConso  = conv > 0 ? qte / conv : 0;
  const tauxAchatXAF = conv > 0 ? cmupUsdt / conv : (parseFloat(tauxAchatXAFInput) || 0);
  const valAchat   = usdtConso * cmupUsdt;
  const valVenteV  = qte * tvV;
  const benV       = valVenteV - valAchat;
  const pctPV      = customShareV ? porteurPctV : (transaction.porteurPct || 70);
  const pctAV      = 100 - pctPV;
  const partPV     = benV * (pctPV / 100);
  const partAV     = benV * (pctAV / 100);

  // ── Calculs SECTION CACHÉE ──
  const tauxC     = parseFloat(tauxCache) || 0;
  const valVenteC = qte * tauxC;
  const benC      = valVenteC - valAchat;
  const pctPC     = customShareC ? porteurPctC : (transaction.porteurPctCache || transaction.porteurPct || 70);
  const pctAC     = 100 - pctPC;
  const partPC    = benC * pctPC / 100;
  const partAC    = benC * pctAC / 100;

  // ── Calculs ACHAT ──
  const qteAchat  = parseFloat(quantiteAchat) || 0;
  const tauxAchat = parseFloat(tauxAchatInput) || 0;
  const prixAchat = qteAchat * tauxAchat;

  // ── Liaison bidirectionnelle taux conv ↔ taux achat XAF ──
  const handleTauxConvChange = (val) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setTauxConv(clean);
    const v = parseFloat(clean);
    if (v > 0 && cmupUsdt > 0) setTauxAchatXAFInput((cmupUsdt / v).toFixed(6));
    else setTauxAchatXAFInput('');
  };
  const handleTauxAchatChange = (val) => {
    const clean = val.replace(/[^0-9.]/g, '');
    setTauxAchatXAFInput(clean);
    const v = parseFloat(clean);
    if (v > 0 && cmupUsdt > 0) setTauxConv((cmupUsdt / v).toFixed(6));
    else setTauxConv('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLocked) {
      toast.error(langue === 'fr' ? 'Vente déjà validée, modification impossible.' : 'Sale already validated, cannot edit.');
      return;
    }
    const changes = { dateModification: new Date() };

    if (transaction.type === 'vente') {
      const newQteDevise = qte;
      const newConv = conv;
      const newUsdtConso = conv > 0 ? newQteDevise / newConv : transaction.usdtConsomme;
      const newDelta = -newUsdtConso;
      const sim = simulerChaineStock(allTransactions, transaction.id, newDelta);
      if (!sim.valid) {
        toast.error(`${t.stockNegatif} ${format(new Date(sim.failDate), 'dd/MM/yyyy HH:mm')} (${sim.failStock?.toFixed(4)} USDT)`);
        return;
      }
      changes.quantiteDevise  = newQteDevise;
      changes.tauxConversion  = newConv;
      changes.tauxAchatXAF    = tauxAchatXAF;
      changes.usdtConsomme    = newUsdtConso;
      changes.quantite        = newUsdtConso;
      changes.client          = clientVal;
      changes.tauxVisible     = tvV;
      changes.deviseVente     = deviseVente;
      changes.valeurAchat     = valAchat;
      changes.valeurVenteVisible = valVenteV;
      changes.beneficeVisible = benV;
      changes.partPorteur     = partPV;
      changes.partAssocie     = partAV;
      changes.porteurPct      = pctPV;
      changes.associePct      = pctAV;
      // Données cachées si déverrouillées
      if (hiddenUnlocked && tauxC > 0) {
        changes.tauxCache           = tauxC;
        changes.valeurVenteCachee   = valVenteC;
        changes.beneficeCachee      = benC;
        changes.partPorteurCache    = partPC;
        changes.partAssocieCache    = partAC;
        changes.porteurPctCache     = pctPC;
        changes.associePctCache     = pctAC;
        changes.statut              = 'committed';
      }
    } else if (transaction.type === 'achat' && transaction.devise === 'USDT') {
      const newDelta = qteAchat;
      const sim = simulerChaineStock(allTransactions, transaction.id, newDelta);
      if (!sim.valid) {
        toast.error(`${t.stockNegatif} ${format(new Date(sim.failDate), 'dd/MM/yyyy HH:mm')}`);
        return;
      }
      changes.montant     = prixAchat;
      changes.quantite    = qteAchat;
      changes.taux        = tauxAchat;
      changes.fournisseur = fournisseurEdit;
    } else {
      const newMontant = parseFloat(montantEdit) || transaction.montant;
      if (newMontant > data.caisse + transaction.montant) {
        toast.error(t.insufficientCaisse); return;
      }
      changes.montant      = newMontant;
      changes.taux         = newMontant;
      changes.description  = descriptionEdit;
      changes.beneficiaire = beneficiaireEdit;
      changes.fournisseur  = fournisseurEdit;
    }

    onEdit(transaction.id, changes);
    onClose();
  };

  const bg = dark ? 'bg-gray-900 text-white' : 'bg-white';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bg} rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl`}>

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className={`text-xl font-display font-bold flex items-center gap-2 ${dark ? 'text-white' : 'text-primary'}`}>
              <Edit2 className="w-5 h-5 text-accent" />
              {langue === 'fr' ? 'Modifier la transaction' : 'Edit transaction'}
            </h2>
            <p className={`text-xs mt-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className={`font-semibold uppercase px-1.5 py-0.5 rounded mr-1 ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>{transaction.type}</span>
              {transaction.id} · {langue === 'fr' ? 'Enregistré le' : 'Recorded on'} {format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}
              {transaction.dateModification && (
                <span className={`ml-2 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>
                  · {langue === 'fr' ? 'Modifié le' : 'Modified on'} {format(new Date(transaction.dateModification), 'dd/MM/yyyy HH:mm')}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ══ VENTE ══ */}
          {transaction.type === 'vente' && (
            <>
              {/* Context USDT */}
              <ContextPanel dark={dark} title="Stock USDT" icon={Warehouse}>
                <InfoRow dark={dark} label={t.stockCourant} value={`${stockActuel.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} USDT`} accent />
                <InfoRow dark={dark} label="CMUP" value={`${cmupUsdt.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF/USDT`} />
              </ContextPanel>

              {/* Note modification */}
              <div className={`p-3 rounded-xl border ${dark ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-xs ${dark ? 'text-blue-400' : 'text-blue-700'}`}>
                  ⚠️ {langue === 'fr' ? 'Modifier les quantités recalcule la chaîne de stock.' : 'Editing quantities recalculates the stock chain.'}
                </p>
              </div>

              {/* Devise de vente */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{t.deviseVente}</label>
                <div className="flex gap-3">
                  {DEVISES_VENTE.map(dv => (
                    <button key={dv.code} type="button" onClick={() => setDeviseVente(dv.code)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                        deviseVente === dv.code
                          ? 'border-accent bg-accent/10 text-accent'
                          : dark ? 'border-gray-600 bg-gray-800 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}>
                      {dv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Taux conv ↔ Taux achat XAF */}
              <div className={`p-4 rounded-xl border-2 space-y-3 ${dark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {langue === 'fr' ? 'Taux — modifier l\'un recalcule l\'autre' : 'Rates — editing one recalculates the other'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {t.tauxConversion} ({deviseVente}/USDT)
                    </label>
                    <input type="text" inputMode="decimal"
                      value={tauxConv} onChange={e => handleTauxConvChange(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-white'} focus:border-accent`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {t.tauxAchatCalc} (XAF/{deviseVente})
                    </label>
                    <input type="text" inputMode="decimal"
                      value={tauxAchatXAFInput} onChange={e => handleTauxAchatChange(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-accent/50 bg-gray-700 text-accent' : 'border-accent/30 bg-accent/5 text-accent font-semibold'} focus:border-accent`} />
                  </div>
                </div>
              </div>

              {/* Quantité + Taux vente visible */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.quantity} ({deviseVente}) <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="numeric"
                    value={quantiteDeviseEdit}
                    onChange={e => setQuantiteDeviseEdit(e.target.value.replace(/[^0-9.]/g, ''))}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`}
                    required />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.tauxVenteVisible} (XAF/{deviseVente}) <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="numeric"
                    value={tauxVisib} onChange={e => setTauxVisib(e.target.value.replace(/[^0-9.]/g, ''))}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`}
                    required />
                </div>
              </div>

              {/* Client */}
              <div className="space-y-1.5">
                <label className={`block text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t.client} <span className="text-red-500 ml-1 text-xs">({t.obligatoire})</span>
                </label>
                <input type="text" value={clientVal}
                  onChange={e => setClientVal(e.target.value)}
                  placeholder={t.clientPlaceholder}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500' : 'border-gray-200 bg-white'} focus:border-accent`} />
              </div>

              {/* Répartition visible */}
              <div className={`rounded-xl border-2 p-4 ${dark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-bold ${dark ? 'text-white' : 'text-primary'}`}>{t.repartitionVisible}</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{t.customShare}</span>
                    <div onClick={() => setCustomShareV(!customShareV)}
                      className={`w-10 h-5 rounded-full transition-all cursor-pointer relative ${customShareV ? 'bg-accent' : dark ? 'bg-gray-600' : 'bg-gray-300'}`}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: customShareV ? '22px' : '2px' }} />
                    </div>
                  </label>
                </div>
                {customShareV ? (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={dark ? 'text-gray-300' : 'text-gray-600'}>{t.partner}</span>
                      <span className="font-bold text-accent">{porteurPctV}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={porteurPctV}
                      onChange={e => setPorteurPctV(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-accent" />
                    <div className="flex justify-between text-xs mt-1">
                      <span className={dark ? 'text-gray-300' : 'text-gray-600'}>{t.associate}</span>
                      <span className={`font-bold ${dark ? 'text-white' : 'text-primary'}`}>{100 - porteurPctV}%</span>
                    </div>
                  </div>
                ) : (
                  <div className={`flex justify-between text-xs px-2 py-1.5 rounded-lg ${dark ? 'bg-gray-700' : 'bg-white'}`}>
                    <span>{t.partner} : <strong className="text-accent">{transaction.porteurPct || 70}%</strong></span>
                    <span>{t.associate} : <strong>{100 - (transaction.porteurPct || 70)}%</strong></span>
                  </div>
                )}
              </div>

              {/* Calculs automatiques */}
              {conv > 0 && tvV > 0 && (
                <div className={`rounded-xl p-4 border-2 ${dark ? 'bg-gray-800 border-accent/30' : 'bg-accent/5 border-accent/20'}`}>
                  <h4 className={`font-bold text-sm flex items-center gap-2 mb-3 ${dark ? 'text-white' : 'text-primary'}`}>
                    <BarChart3 className="w-4 h-4" />{t.autoCalc}
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between pb-2 border-b border-dashed border-accent/20">
                      <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t.stockUsdtConsomme}</span>
                      <span className="font-bold text-orange-500">{usdtConso.toFixed(6)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t.valeurAchatXAF}</span>
                      <span className="font-semibold">{valAchat.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{t.valeurVenteVisible}</span>
                      <span className="font-semibold text-accent">{valVenteV.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-dashed border-gray-200 pt-1 mt-1">
                      <span>{t.beneficeVisible}</span>
                      <span className={benV >= 0 ? 'text-green-500' : 'text-red-500'}>{benV.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.partner} ({pctPV}%)</span>
                      <span className="text-accent font-semibold">{partPV.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.associate} ({pctAV}%)</span>
                      <span className="font-semibold">{partAV.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                    </div>
                    {hiddenUnlocked && tauxC > 0 && (
                      <div className={`mt-2 pt-2 border-t border-dashed ${dark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
                        <p className={`text-[10px] font-medium mb-1.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {langue === 'fr' ? 'Calcul de référence' : 'Reference calculation'}
                        </p>
                        <div className="flex justify-between">
                          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{langue==='fr'?'Taux réf.':'Ref. rate'}</span>
                          <span className={`font-semibold text-xs ${dark?'text-gray-300':'text-gray-600'}`}>{tauxC.toLocaleString('fr-FR')} XAF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{langue==='fr'?'Bénéfice réf.':'Ref. profit'}</span>
                          <span className={`font-semibold text-xs ${benC >= 0 ? 'text-green-500' : 'text-red-500'}`}>{benC.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{t.partner} ({pctPC}%)</span>
                          <span className={`font-semibold text-xs ${dark?'text-gray-300':'text-gray-600'}`}>{partPC.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section cachée porteur — zone secrète invisible quand verrouillée */}
              <div>
                {!hiddenUnlocked && (
                  <div className="w-full h-0 overflow-hidden cursor-default"
                    onTouchEnd={handleHiddenTap} onDoubleClick={handleHiddenTap} />
                )}
                {hiddenUnlocked && (
                  <div className={`rounded-xl overflow-hidden ${dark ? 'border border-white/[0.05]' : 'border border-gray-100'}`}>
                    <div className={`flex items-center justify-between px-3 py-2 cursor-pointer select-none ${dark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}
                      onTouchEnd={handleHiddenTap} onDoubleClick={handleHiddenTap}>
                      <span className={`text-[10px] font-semibold tracking-widest uppercase ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                        {langue === 'fr' ? 'Taux de référence' : 'Reference rate'}
                      </span>
                      <button type="button" onClick={() => setHiddenUnlocked(false)}
                        className={`text-[10px] font-medium ${dark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                        {langue === 'fr' ? 'réduire' : 'collapse'}
                      </button>
                    </div>
                    <div className={`px-3 pb-3 pt-2 space-y-3 ${dark ? 'bg-transparent' : 'bg-white'}`}>
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {langue === 'fr' ? `XAF / ${deviseVente}` : `XAF / ${deviseVente}`}
                        </label>
                        <input type="text" inputMode="numeric"
                          placeholder="0"
                          value={tauxCache}
                          onChange={handleDecInput(setTauxCache)}
                          className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all ${dark ? 'border-white/[0.08] bg-white/[0.03] text-white placeholder-white/20' : 'border-gray-200 bg-white'} focus:border-gray-300`} />
                      </div>
                      <div className={`rounded-lg p-2.5 ${dark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{langue === 'fr' ? 'Répartition' : 'Split'}</span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <span className={`text-[10px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{langue === 'fr' ? 'personnaliser' : 'customize'}</span>
                            <div onClick={() => setCustomShareC(!customShareC)}
                              className={`w-7 h-3.5 rounded-full transition-all cursor-pointer relative ${customShareC ? (dark?'bg-gray-500':'bg-gray-400') : dark?'bg-gray-700':'bg-gray-200'}`}>
                              <div className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all" style={{ left: customShareC ? '14px' : '2px' }} />
                            </div>
                          </label>
                        </div>
                        {customShareC ? (
                          <div>
                            <input type="range" min="0" max="100" value={porteurPctC}
                              onChange={e => setPorteurPctC(parseInt(e.target.value))}
                              className="w-full h-1.5 rounded appearance-none cursor-pointer" style={{ accentColor: dark?'#6B7280':'#9CA3AF' }} />
                            <div className="flex justify-between text-[10px] mt-1">
                              <span className={dark?'text-gray-500':'text-gray-400'}>{t.partner} {porteurPctC}%</span>
                              <span className={dark?'text-gray-500':'text-gray-400'}>{t.associate} {100-porteurPctC}%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between text-[10px]">
                            <span className={dark?'text-gray-500':'text-gray-400'}>{t.partner} {transaction.porteurPctCache || transaction.porteurPct || 70}%</span>
                            <span className={dark?'text-gray-500':'text-gray-400'}>{t.associate} {100-(transaction.porteurPctCache || transaction.porteurPct || 70)}%</span>
                          </div>
                        )}
                      </div>
                      {tauxC > 0 && (
                        <div className={`p-2 rounded-lg text-[10px] font-medium ${dark ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'}`}>
                          ✓ {langue === 'fr' ? 'Enregistrement définitif à la sauvegarde' : 'Will commit on save'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══ ACHAT ══ */}
          {transaction.type === 'achat' && (
            <>
              <ContextPanel dark={dark} title={t.infoAchat} icon={Info}>
                <InfoRow dark={dark} label={`${transaction.devise} — ${t.stockCourant}`}
                  value={`${(data.devises.find(d=>d.devise===transaction.devise)?.quantite||0).toLocaleString('fr-FR',{maximumFractionDigits:6})} ${transaction.devise}`} accent />
                <InfoRow dark={dark} label="CMUP actuel"
                  value={`${(data.devises.find(d=>d.devise===transaction.devise)?.cmup||0).toLocaleString('fr-FR',{maximumFractionDigits:6})} XAF/${transaction.devise}`} />
              </ContextPanel>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.quantity} ({transaction.devise}) <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="numeric"
                    value={quantiteAchat}
                    onChange={e => setQuantiteAchat(e.target.value.replace(/[^0-9.]/g, ''))}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`} />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {langue === 'fr' ? "Taux d'achat (XAF)" : 'Purchase Rate (XAF)'} <span className="text-red-500">*</span>
                  </label>
                  <input type="text" inputMode="numeric"
                    value={tauxAchatInput}
                    onChange={e => setTauxAchatInput(e.target.value.replace(/[^0-9.]/g, ''))}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${dark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-200 bg-white'} focus:border-accent`} />
                </div>
              </div>

              {qteAchat > 0 && tauxAchat > 0 && (
                <div className={`p-3 rounded-xl space-y-1.5 ${dark ? 'bg-gray-700' : 'bg-accent/5'}`}>
                  <div className="flex justify-between text-xs">
                    <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{langue === 'fr' ? 'Montant total XAF' : 'Total XAF'}</span>
                    <span className="font-bold text-accent">{prixAchat.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                  </div>
                </div>
              )}

              <Input label={t.supplier} dark={dark}
                value={fournisseurEdit} onChange={e => setFournisseurEdit(e.target.value)} />
            </>
          )}

          {/* ══ DÉPENSE / RETRAIT ══ */}
          {(transaction.type === 'depense' || transaction.type === 'retrait') && (
            <>
              <ContextPanel dark={dark} title={t.infoCaisse} icon={Info}>
                <InfoRow dark={dark} label={t.currentCaisse} value={`${data.caisse.toLocaleString('fr-FR')} XAF`} accent />
              </ContextPanel>

              <Input label={t.amount} dark={dark}
                value={montantEdit} onChange={e => setMontantEdit(e.target.value)} />
              {transaction.type === 'retrait' && (
                <Input label={t.beneficiary} dark={dark}
                  value={beneficiaireEdit} onChange={e => setBeneficiaireEdit(e.target.value)} />
              )}
              <Input label={t.description} dark={dark}
                value={descriptionEdit} onChange={e => setDescriptionEdit(e.target.value)} />
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t.cancel}</Button>
            <Button type="submit" className="flex-1" disabled={isLocked}>{t.save}</Button>
          </div>
        {isLocked && (
          <div className={`mt-4 p-3 rounded-xl border text-center font-semibold ${dark ? 'bg-red-900/20 border-red-700/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {langue === 'fr'
              ? 'Vente déjà validée : modification impossible.'
              : 'Sale already validated: cannot edit.'}
          </div>
        )}
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL JOURNAL
// ─────────────────────────────────────────────────────────────
const JournalModal = ({ logs, onClose, t, dark }) => {
  const [filterType, setFilterType] = useState('tous');
  const [filterDate, setFilterDate] = useState('');
  const logTypes = Object.keys(t.logTypes);
  const filtered = [...logs].reverse().filter(log => {
    const matchType = filterType === 'tous' || log.typeEvenement === filterType;
    const matchDate = !filterDate || format(log.dateHeure, 'yyyy-MM-dd') === filterDate;
    return matchType && matchDate;
  });
  const iconByType = {
    connexion: <CheckCircle2 className="w-3.5 h-3.5" />, deconnexion: <LogOut className="w-3.5 h-3.5" />,
    connexion_echouee: <XCircle className="w-3.5 h-3.5" />, vente: <ArrowUpRight className="w-3.5 h-3.5" />,
    achat: <ArrowDownLeft className="w-3.5 h-3.5" />, depense: <FileText className="w-3.5 h-3.5" />,
    retrait: <DollarSign className="w-3.5 h-3.5" />, restock: <RefreshCw className="w-3.5 h-3.5" />,
    settings: <Settings className="w-3.5 h-3.5" />, error: <AlertTriangle className="w-3.5 h-3.5" />,
    finalisation: <CheckCircle2 className="w-3.5 h-3.5" />, edition: <Edit2 className="w-3.5 h-3.5" />,
  };
  const colorByType = {
    connexion: 'bg-success/20 text-success', deconnexion: 'bg-gray-200 text-gray-600',
    connexion_echouee: 'bg-red-100 text-red-600', vente: 'bg-accent/20 text-accent',
    achat: 'bg-blue-100 text-blue-600', depense: 'bg-red-100 text-red-500',
    retrait: 'bg-warning/20 text-warning', restock: 'bg-purple-100 text-purple-600',
    settings: 'bg-gray-100 text-gray-600', error: 'bg-red-200 text-red-700',
    finalisation: 'bg-amber-100 text-amber-700', edition: 'bg-indigo-100 text-indigo-600',
  };
  const statutIcon = {
    success: <CheckCircle2 className="w-3 h-3 text-success" />,
    failed: <XCircle className="w-3 h-3 text-danger" />,
    warning: <AlertTriangle className="w-3 h-3 text-warning" />,
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${dark ? 'bg-gray-900' : 'bg-white'} rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 w-full sm:max-w-2xl max-h-[92vh] flex flex-col shadow-2xl`}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className={`text-lg font-display font-bold flex items-center gap-2 ${dark ? 'text-white' : 'text-primary'}`}>
            <ShieldCheck className="w-5 h-5 text-accent" />{t.journalLog}
            <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
              {logs.length} entrées
            </span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2 flex-wrap mb-4 flex-shrink-0">
          <div className="flex gap-1.5 flex-wrap">
            {['tous', ...logTypes].map(tp => (
              <button key={tp} onClick={() => setFilterType(tp)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterType === tp ? 'gradient-gold text-primary' : dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                {tp === 'tous' ? t.all : (t.logTypes[tp] || tp)}
              </button>
            ))}
          </div>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className={`px-2.5 py-1 rounded-lg border text-xs outline-none focus:border-accent ${dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
          {filterDate && <button onClick={() => setFilterDate('')} className="text-danger"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">{t.journalEmpty}</p>
          ) : filtered.map(log => (
            <div key={log.id} className={`p-3 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-start gap-2.5">
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${colorByType[log.typeEvenement] || 'bg-gray-100 text-gray-600'}`}>
                  {iconByType[log.typeEvenement]}{t.logTypes[log.typeEvenement] || log.typeEvenement}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{log.description}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">{statutIcon[log.statut]}</span>
                    <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{format(log.dateHeure, 'dd/MM/yyyy HH:mm:ss')}</span>
                    <span className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                      · {formatDistanceToNow(log.dateHeure, { addSuffix: true, locale: dateFr })}
                    </span>
                    {log.idUtilisateur && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                        {log.idUtilisateur}
                      </span>
                    )}
                    {log.idOperation && (
                      <span className={`text-xs font-mono ${dark ? 'text-gray-600' : 'text-gray-400'}`}>#{log.idOperation}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL PARAMÈTRES
// ─────────────────────────────────────────────────────────────
const SettingsModal = ({ profitShare, onClose, onUpdate, t, dark }) => {
  const [porteur, setPorteur] = useState(profitShare.porteur);
  const associe = 100 - porteur;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${dark ? 'bg-gray-900' : 'bg-white'} rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 w-full sm:max-w-md shadow-2xl`}>
        <div className="flex justify-between items-center mb-5">
          <h2 className={`text-lg font-display font-bold ${dark ? 'text-white' : 'text-primary'}`}>{t.settings}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className={`block text-sm font-semibold mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{t.globalShare}</label>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1.5 text-sm">
                  <span className={dark ? 'text-white' : ''}>{t.partner}</span>
                  <span className="font-bold text-accent">{porteur}%</span>
                </div>
                <input type="range" min="0" max="100" value={porteur}
                  onChange={e => setPorteur(parseInt(e.target.value))}
                  className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent" />
              </div>
              <div>
                <div className="flex justify-between mb-1.5 text-sm">
                  <span className={dark ? 'text-white' : ''}>{t.associate}</span>
                  <span className={`font-bold ${dark ? 'text-white' : 'text-primary'}`}>{associe}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-lg overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${associe}%` }} />
                </div>
              </div>
            </div>
          </div>
          <p className={`text-xs p-3 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-accent/5 border-accent/20 text-gray-500'}`}>
            ℹ️ {t.noteSettings}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">{t.cancel}</Button>
            <Button onClick={() => { onUpdate({ porteur, associe }); toast.success(t.settingsUpdated); onClose(); }} className="flex-1">{t.save}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL MOUVEMENTS DE STOCK USDT — Registre complet
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// REGISTRE MOUVEMENTS DE STOCK USDT
// Design registre comptable professionnel
// ─────────────────────────────────────────────────────────────
const StockMovementModal = ({ data, user, onClose, t, dark, langue }) => {
  const [filterDir, setFilterDir]     = useState('all');
  const [dateFrom,  setDateFrom]      = useState('');
  const [dateTo,    setDateTo]        = useState('');
  const [query,     setQuery]         = useState('');
  const [expanded,  setExpanded]      = useState(null);
  const isPorteur = user?.role === 'porteur';

  const usdtStock = data.devises.find(d => d.devise === 'USDT') || { quantite: 0, cmup: 0 };

  // Recalculer la chaîne de stock USDT pour toutes les transactions (affichage)
  const usdtTransactions = data.transactions.filter(tx => tx.type === 'vente' || (tx.type === 'achat' && tx.devise === 'USDT'));
  const recalculated = recalculerStockUsdt(usdtTransactions, 0);

  // ── Construire les lignes du registre ──
  const allLines = recalculated.map((tx) => {
    const isIn  = tx.type === 'achat';
    const qty   = Math.abs(isIn ? (tx.quantite || 0) : (tx.usdtConsomme || 0));
    const sAvant = tx.stockUsdt_avant ?? 0;
    const sApres = tx.stockUsdt_apres ?? (isIn ? sAvant + qty : sAvant - qty);
    const libelle = isIn
      ? `Approvisionnement${tx.sourceCompte === 'caisse' ? ' — Caisse' : ' — Dépôt'}${tx.fournisseur ? '  ·  ' + tx.fournisseur : ''}`
      : `Vente ${tx.deviseVente || ''}${tx.client ? '  ·  ' + tx.client : ''}`;
    return { ...tx, isIn, qty, sAvant, sApres, libelle };
  });

  const rows = allLines.filter(m => {
    if (filterDir !== 'all' && ((filterDir === 'in') !== m.isIn)) return false;
    if (dateFrom && new Date(m.date) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(m.date) > new Date(dateTo + 'T23:59:59')) return false;
    if (query) {
      const q = query.toLowerCase();
      return [m.id, m.libelle, m.client, m.fournisseur, m.userName]
        .some(v => v?.toLowerCase().includes(q));
    }
    return true;
  });

  const totalIn  = allLines.filter(m => m.isIn).reduce((s, m) => s + m.qty, 0);
  const totalOut = allLines.filter(m => !m.isIn).reduce((s, m) => s + m.qty, 0);
  const stockVal = usdtStock.quantite * usdtStock.cmup;

  const exportCSV = () => {
    const h = ['Date enregistrement','Date modification','Réf.','Sens','USDT','Stock avant','Stock après','Libellé','Client','Fournisseur','Source','Devise','Qté devise','Taux conv.','Taux achat','Taux vente','Val. achat','Val. vente','Bénéfice','Utilisateur'];
    const d = rows.map(m => [
      format(new Date(m.dateEnregistrement || m.date), 'dd/MM/yyyy HH:mm:ss'),
      m.dateModification ? format(new Date(m.dateModification), 'dd/MM/yyyy HH:mm:ss') : '',
      m.id,
      m.isIn ? 'Entrée' : 'Sortie',
      m.qty.toFixed(6), m.sAvant.toFixed(6), m.sApres.toFixed(6),
      m.libelle, m.client||'', m.fournisseur||'', m.sourceCompte||'',
      m.deviseVente||'', m.quantiteDevise?.toString()||'',
      m.tauxConversion?.toFixed(6)||'', m.taux?.toFixed(6)||'',
      m.tauxVisible?.toString()||'', m.valeurAchat?.toFixed(0)||'',
      m.valeurVenteVisible?.toFixed(0)||'', m.beneficeVisible?.toFixed(0)||'',
      m.userName||''
    ]);
    const csv = [h,...d].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FOREXIUM_Stock_USDT_${format(new Date(),'yyyyMMdd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Thème ──
  const th = {
    overlay:  'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-5',
    shell:    `w-full sm:max-w-5xl max-h-[97vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border ${dark ? 'bg-[#0f1117] border-white/[0.07]' : 'bg-white border-slate-200'}`,
    border:   dark ? 'border-white/[0.07]' : 'border-slate-100',
    ink:      dark ? 'text-white'           : 'text-slate-900',
    sub:      dark ? 'text-slate-400'       : 'text-slate-500',
    faint:    dark ? 'text-slate-600'       : 'text-slate-400',
    card:     dark ? 'bg-white/[0.04]'     : 'bg-slate-50',
    cardBdr:  dark ? 'border-white/[0.06]' : 'border-slate-200',
    rowHov:   dark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/70',
    rowExp:   dark ? 'bg-white/[0.04]'     : 'bg-blue-50/40',
    inp:      dark ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500/60'
                   : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-400',
    chip:     dark ? 'border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-white'
                   : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800',
    chipSel:  (color) => color === 'green'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : color === 'red'
                  ? 'bg-rose-500 border-rose-500 text-white'
                  : dark ? 'bg-white text-slate-900 border-white' : 'bg-slate-900 text-white border-slate-900',
  };

  // ── Composant cellule KPI ──
  const KPI = ({ label, value, unit, sub: subVal, accent }) => (
    <div className={`${th.card} border ${th.cardBdr} rounded-xl px-5 py-4 flex flex-col gap-2`}>
      <span className={`text-xs font-medium uppercase tracking-widest ${th.faint}`}>{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-semibold tracking-tight tabular-nums ${accent || th.ink}`}>{value}</span>
        <span className={`text-xs ${th.sub}`}>{unit}</span>
      </div>
      {subVal && <span className={`text-xs ${th.faint}`}>{subVal}</span>}
    </div>
  );

  return (
    <div className={th.overlay}>
      <div className={th.shell}>

        {/* ══ TOPBAR ══ */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${th.border} flex-shrink-0`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl border ${th.cardBdr} ${th.card} flex items-center justify-center`}>
              <Activity className={`w-5 h-5 ${dark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-[15px] font-semibold ${th.ink}`}>Mouvements de stock USDT</h2>
              <p className={`text-xs mt-0.5 ${th.sub}`}>{allLines.length} opération{allLines.length !== 1 ? 's' : ''} enregistrée{allLines.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className={`hidden sm:inline-flex items-center gap-2 h-8 px-3.5 rounded-lg border text-xs font-medium transition-all ${th.chip}`}>
              <Download className="w-3.5 h-3.5" />Export CSV
            </button>
            <button onClick={onClose}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs transition-all ${th.chip}`}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══ KPIs ══ */}
        <div className={`flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b ${th.border}`}>
          <KPI label="Solde actuel"
            value={usdtStock.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
            unit="USDT"
            accent={dark ? 'text-blue-400' : 'text-blue-600'}
          />
          <KPI label="Total entrées"
            value={`+${totalIn.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}`}
            unit="USDT"
            accent={dark ? 'text-emerald-400' : 'text-emerald-600'}
          />
          <KPI label="Total sorties"
            value={`-${totalOut.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}`}
            unit="USDT"
            accent={dark ? 'text-rose-400' : 'text-rose-500'}
          />
          <KPI label="CMUP"
            value={usdtStock.cmup.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
            unit="XAF/USDT"
            sub={`Valeur : ${stockVal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF`}
            accent={dark ? 'text-amber-400' : 'text-amber-600'}
          />
        </div>

        {/* ══ TOOLBAR FILTRES ══ */}
        <div className={`flex-shrink-0 flex flex-wrap items-center gap-2.5 px-6 py-3 border-b ${th.border}`}>
          {/* Direction */}
          <div className={`inline-flex items-center gap-1 p-1 rounded-lg border ${th.cardBdr} ${th.card}`}>
            {[
              { val: 'all',  label: 'Tout' },
              { val: 'in',   label: '↑ Entrées',  color: 'green' },
              { val: 'out',  label: '↓ Sorties',  color: 'red'   },
            ].map(({ val, label, color }) => (
              <button key={val} onClick={() => setFilterDir(val)}
                className={`h-7 px-3 rounded-md text-xs font-medium transition-all border ${
                  filterDir === val ? th.chipSel(color || '') : 'border-transparent ' + th.sub
                }`}>{label}</button>
            ))}
          </div>

          {/* Recherche */}
          <div className="relative flex-1 min-w-[120px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${th.faint}`} />
            <input type="text" placeholder="Réf., client, fournisseur…" value={query}
              onChange={e => setQuery(e.target.value)}
              className={`w-full h-9 pl-9 pr-3 rounded-lg border text-xs outline-none transition-colors ${th.inp}`} />
          </div>

          {/* Dates */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className={`h-9 px-2.5 rounded-lg border text-xs outline-none transition-colors ${th.inp}`} />
            <span className={`text-xs ${th.faint}`}>–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className={`h-9 px-2.5 rounded-lg border text-xs outline-none transition-colors ${th.inp}`} />
          </div>

          {(dateFrom || dateTo || query) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setQuery(''); }}
              className="text-xs text-rose-500 hover:text-rose-400 flex items-center gap-1 font-medium">
              <X className="w-3 h-3" />Effacer
            </button>
          )}
          <span className={`ml-auto text-xs tabular-nums font-medium ${th.faint}`}>{rows.length} / {allLines.length}</span>
        </div>

        {/* ══ REGISTRE ══ */}
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className={`w-14 h-14 rounded-2xl ${th.card} border ${th.cardBdr} flex items-center justify-center`}>
                <Package className={`w-6 h-6 ${th.faint}`} />
              </div>
              <p className={`text-sm ${th.sub}`}>Aucun mouvement trouvé</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              {/* En-têtes colonnes */}
              <thead className={`sticky top-0 z-10 ${dark ? 'bg-[#0f1117]' : 'bg-white'} border-b ${th.border}`}>
                <tr>
                  <th className={`w-10 px-4 py-3 text-left`}></th>
                  <th className={`px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest ${th.faint}`}>Opération</th>
                  <th className={`hidden md:table-cell px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest ${th.faint}`}>Variation</th>
                  <th className={`hidden lg:table-cell px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest ${th.faint}`}>Stock avant</th>
                  <th className={`px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest ${th.faint}`}>Stock après</th>
                  <th className={`w-8`}></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${th.border}`}>
                {rows.map((m, idx) => {
                  const isExp = expanded === m.id;
                  return (
                    <>
                      {/* ── Ligne principale ── */}
                      <tr key={m.id}
                        onClick={() => setExpanded(isExp ? null : m.id)}
                        className={`cursor-pointer transition-colors ${isExp ? th.rowExp : th.rowHov}`}>

                        {/* Indicateur */}
                        <td className="px-4 py-3.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            m.isIn
                              ? dark ? 'bg-emerald-500/10' : 'bg-emerald-50'
                              : dark ? 'bg-rose-500/10'    : 'bg-rose-50'
                          }`}>
                            {m.isIn
                              ? <TrendingUp   className={`w-3.5 h-3.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} strokeWidth={2.5} />
                              : <TrendingDown className={`w-3.5 h-3.5 ${dark ? 'text-rose-400'    : 'text-rose-600'}`}    strokeWidth={2.5} />
                            }
                          </div>
                        </td>

                        {/* Opération info */}
                        <td className="px-4 py-3.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold tracking-wide uppercase ${
                              m.isIn ? (dark ? 'text-emerald-400' : 'text-emerald-700') : (dark ? 'text-rose-400' : 'text-rose-700')
                            }`}>{m.isIn ? '↑ Entrée' : '↓ Sortie'}</span>
                            <code className={`text-[10px] ${th.faint}`}>{m.id}</code>
                            {m.statut === 'pending' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${dark ? 'bg-amber-400/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                                EN ATTENTE
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 truncate max-w-[240px] ${th.sub}`}>{m.libelle}</p>
                          <p className={`text-[10px] mt-0.5 ${th.faint}`}>
                            {langue === 'fr' ? 'Enreg.' : 'Rec.'} {format(new Date(m.dateEnregistrement || m.date), 'dd/MM/yy · HH:mm')} · {m.userName}
                            {m.dateModification && (
                              <span className="text-amber-500 ml-1">· {langue === 'fr' ? 'Modifié' : 'Edited'} {format(new Date(m.dateModification), 'dd/MM/yy · HH:mm')}</span>
                            )}
                          </p>
                        </td>

                        {/* Variation */}
                        <td className="hidden md:table-cell px-4 py-3.5 text-right">
                          <span className={`text-sm font-semibold tabular-nums ${
                            m.isIn ? (dark ? 'text-emerald-400' : 'text-emerald-600') : (dark ? 'text-rose-400' : 'text-rose-500')
                          }`}>
                            {m.isIn ? '+' : '−'}{m.qty.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
                          </span>
                          <div className={`text-[10px] ${th.faint}`}>USDT</div>
                        </td>

                        {/* Stock avant */}
                        <td className="hidden lg:table-cell px-4 py-3.5 text-right">
                          <span className={`text-sm tabular-nums ${th.sub}`}>
                            {m.sAvant.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
                          </span>
                        </td>

                        {/* Stock après */}
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-sm font-semibold tabular-nums ${th.ink}`}>
                            {m.sApres.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
                          </span>
                        </td>

                        {/* Chevron */}
                        <td className="pr-3 py-3.5">
                          {isExp
                            ? <ChevronUp   className={`w-4 h-4 ${th.faint}`} />
                            : <ChevronDown className={`w-4 h-4 ${th.faint}`} />
                          }
                        </td>
                      </tr>

                      {/* ── Panneau de détail ── */}
                      {isExp && (
                        <tr key={`${m.id}-detail`}>
                          <td colSpan={6} className={`px-6 pt-2 pb-5 ${dark ? 'bg-[#131520]' : 'bg-slate-50/70'} border-b ${th.border}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">

                              {/* Bloc 1 — Identité */}
                              <RegCard title="Opération" icon={<FileText className="w-3.5 h-3.5" />} dark={dark} th={th}>
                                <RegRow k="Référence"    v={m.id}       mono th={th} />
                                <RegRow k="Type"         v={m.type === 'achat' ? 'Achat USDT' : `Vente ${m.deviseVente || ''}`} th={th} />
                                <RegRow k="Date enreg."  v={format(new Date(m.dateEnregistrement || m.date),'dd/MM/yyyy HH:mm:ss')} th={th} />
                                {m.dateModification && (
                                  <RegRow k="Date modif." v={format(new Date(m.dateModification),'dd/MM/yyyy HH:mm:ss')} accent="text-amber-500" th={th} />
                                )}
                                <RegRow k="Utilisateur"  v={m.userName || '—'} th={th} />
                                <RegRow k="Statut"
                                  v={m.statut === 'pending' ? '⏳ En attente' : '✓ Finalisé'}
                                  accent={m.statut === 'pending' ? 'text-amber-500' : (dark ? 'text-emerald-400' : 'text-emerald-600')}
                                  th={th} />
                              </RegCard>

                              {/* Bloc 2 — Mouvement USDT */}
                              <RegCard title="Mouvement USDT" icon={<Layers className="w-3.5 h-3.5" />} dark={dark} th={th}>
                                <RegRow k="Stock avant" v={`${m.sAvant.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} USDT`} th={th} />
                                <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg my-1 ${
                                  m.isIn ? (dark ? 'bg-emerald-500/10' : 'bg-emerald-50') : (dark ? 'bg-rose-500/10' : 'bg-rose-50')
                                }`}>
                                  <span className={`text-xs ${th.sub}`}>Variation</span>
                                  <span className={`text-sm font-bold tabular-nums ${m.isIn ? (dark ? 'text-emerald-400' : 'text-emerald-600') : (dark ? 'text-rose-400' : 'text-rose-500')}`}>
                                    {m.isIn ? '+' : '−'}{m.qty.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} USDT
                                  </span>
                                </div>
                                <RegRow k="Stock après" v={`${m.sApres.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} USDT`} bold th={th} />
                                <div className={`my-1 border-t ${th.border}`} />
                                {m.type === 'achat' && <>
                                  <RegRow k="Taux achat" v={`${m.taux?.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF/USDT`} accent={dark ? 'text-blue-400' : 'text-blue-600'} th={th} />
                                  <RegRow k="Montant payé" v={`${m.montant?.toLocaleString('fr-FR')} XAF`} bold th={th} />
                                </>}
                                {m.type === 'vente' && <>
                                  <RegRow k="CMUP utilisé" v={`${m.tauxAchatXAF?.toLocaleString('fr-FR',{maximumFractionDigits:6}) || '—'} XAF/USDT`} th={th} />
                                  <RegRow k="Coût achat"   v={`${m.valeurAchat?.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF`} th={th} />
                                </>}
                              </RegCard>

                              {/* Bloc 3 — Détails spécifiques */}
                              <RegCard
                                title={m.type === 'achat' ? 'Détails achat' : 'Détails vente'}
                                icon={m.type === 'achat'
                                  ? <ArrowDownLeft className={`w-3.5 h-3.5 ${dark ? 'text-blue-400' : 'text-blue-500'}`} />
                                  : <ArrowUpRight  className={`w-3.5 h-3.5 ${dark ? 'text-emerald-400' : 'text-emerald-500'}`} />}
                                dark={dark} th={th}>
                                {m.type === 'achat' ? (<>
                                  <RegRow k="Fournisseur" v={m.fournisseur || '—'} bold={!!m.fournisseur} th={th} />
                                  <RegRow k="Financement" v={m.sourceCompte === 'caisse' ? '💳 Caisse' : '🏦 Dépôt'} th={th} />
                                  <RegRow k="Quantité"    v={`${m.quantite?.toLocaleString('fr-FR',{maximumFractionDigits:6})} USDT`} bold th={th} />
                                  <RegRow k="Taux unitaire" v={`${m.taux?.toLocaleString('fr-FR',{maximumFractionDigits:6})} XAF`} accent={dark ? 'text-blue-400' : 'text-blue-600'} th={th} />
                                  <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg mt-1 ${dark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                                    <span className={`text-xs font-medium ${th.sub}`}>Coût total</span>
                                    <span className={`text-sm font-bold ${th.ink}`}>{m.montant?.toLocaleString('fr-FR')} XAF</span>
                                  </div>
                                </>) : (<>
                                  <RegRow k="Client"      v={m.client || '—'} bold={!!m.client} th={th} />
                                  <RegRow k="Devise"      v={m.deviseVente || '—'} th={th} />
                                  <RegRow k="Qté devise"  v={`${m.quantiteDevise?.toLocaleString('fr-FR',{maximumFractionDigits:4})} ${m.deviseVente||''}`} th={th} />
                                  <RegRow k="Taux conv."  v={`${m.tauxConversion?.toLocaleString('fr-FR',{maximumFractionDigits:6})} ${m.deviseVente}/USDT`} th={th} />
                                  <RegRow k="Taux vente"  v={`${m.tauxVisible?.toLocaleString('fr-FR')} XAF`} accent={dark ? 'text-amber-400' : 'text-amber-600'} th={th} />
                                  <RegRow k="Val. vente"  v={`${m.valeurVenteVisible?.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF`} th={th} />
                                  <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg mt-1 ${
                                    (m.beneficeVisible||0) >= 0 ? (dark ? 'bg-emerald-500/10' : 'bg-emerald-50') : (dark ? 'bg-rose-500/10' : 'bg-rose-50')
                                  }`}>
                                    <span className={`text-xs font-medium ${th.sub}`}>Bénéfice</span>
                                    <span className={`text-sm font-bold ${(m.beneficeVisible||0) >= 0 ? (dark ? 'text-emerald-400' : 'text-emerald-600') : (dark ? 'text-rose-400' : 'text-rose-500')}`}>
                                      {(m.beneficeVisible||0) >= 0 ? '+' : ''}{m.beneficeVisible?.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF
                                    </span>
                                  </div>
                                  {isPorteur && m.partPorteur != null && (
                                    <div className={`mt-2 pt-2 border-t ${th.border} space-y-1.5`}>
                                      <RegRow k={`Porteur (${m.porteurPct}%)`} v={`${m.partPorteur?.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF`} accent={dark ? 'text-amber-400' : 'text-amber-600'} th={th} />
                                      <RegRow k={`Associé (${m.associePct}%)`} v={`${m.partAssocie?.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF`} th={th} />
                                    </div>
                                  )}
                                </>)}
                              </RegCard>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ══ STATUSBAR ══ */}
        <div className={`flex-shrink-0 flex items-center justify-between gap-3 flex-wrap px-6 py-3 border-t ${th.border} ${dark ? 'bg-[#0f1117]' : 'bg-slate-50'}`}>
          <div className={`flex items-center gap-5 text-xs ${th.faint}`}>
            <span>Solde : <strong className={th.ink}>{usdtStock.quantite.toLocaleString('fr-FR',{maximumFractionDigits:4})} USDT</strong></span>
            <span className="hidden sm:inline">Valeur : <strong className={th.ink}>{stockVal.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF</strong></span>
            <span className="hidden sm:inline">CMUP : <strong className={th.ink}>{usdtStock.cmup.toLocaleString('fr-FR',{maximumFractionDigits:2})} XAF</strong></span>
          </div>
          <button onClick={exportCSV} className="sm:hidden flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-accent text-primary">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Sous-composants du registre ──
const RegCard = ({ title, icon, dark, th, children }) => (
  <div className={`rounded-xl border ${th.cardBdr} ${dark ? 'bg-[#0f1117]' : 'bg-white'} overflow-hidden`}>
    <div className={`flex items-center gap-2 px-4 py-3 border-b ${th.border} ${dark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
      <span className={th.faint}>{icon}</span>
      <span className={`text-[10px] font-semibold uppercase tracking-widest ${th.faint}`}>{title}</span>
    </div>
    <div className="px-4 py-3 space-y-2.5">{children}</div>
  </div>
);

const RegRow = ({ k, v, bold, mono, accent, th }) => (
  <div className="flex items-start justify-between gap-4">
    <span className={`text-xs flex-shrink-0 ${th.sub}`}>{k}</span>
    <span className={`text-xs text-right leading-relaxed ${bold ? 'font-semibold' : ''} ${mono ? 'font-mono text-[11px]' : ''} ${accent || th.ink}`}>
      {v}
    </span>
  </div>
);

const DetailItem = ({ label, value, bold, color, mono, dark }) => (
  <div className="flex justify-between items-start gap-2">
    <span className={`text-xs flex-shrink-0 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
    <span className={`text-xs text-right ${bold ? 'font-bold' : 'font-medium'} ${color || (dark ? 'text-white' : 'text-gray-800')} ${mono ? 'font-mono' : ''}`}>
      {value}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────
// DEVISE CARD — avec édition CMUP manuelle protégée (porteur)
// ─────────────────────────────────────────────────────────────
const DeviseCard = ({ devise: d, onCmupEdit, t, dark, langue }) => {
  const [showCmupModal, setShowCmupModal] = useState(false);
  const [newCmup, setNewCmup]   = useState('');
  const [step, setStep]         = useState('lock');
  const cmupTapRef = React.useRef({ count: 0, timer: null });
  const valeur = d.quantite * d.cmup;

  const openModal = () => {
    setNewCmup(d.cmup.toFixed(6));
    setStep('lock');
    setShowCmupModal(true);
  };

  React.useEffect(() => {
    if (!showCmupModal) return;
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') { e.preventDefault(); setStep(s => s === 'lock' ? 'edit' : 'lock'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showCmupModal]);

  const handleCmupTap = () => {
    const ref = cmupTapRef.current;
    ref.count += 1;
    if (ref.timer) clearTimeout(ref.timer);
    ref.timer = setTimeout(() => { ref.count = 0; }, 800);
    if (ref.count >= 3) { ref.count = 0; setStep(s => s === 'lock' ? 'edit' : 'lock'); }
  };

  const handleConfirm = () => {
    const v = parseFloat(newCmup);
    if (!isFinite(v) || v <= 0) { toast.error(t.allFieldsRequired); return; }
    onCmupEdit(d.devise, v);
    setShowCmupModal(false);
  };

  return (
    <>
      <div className={`group relative rounded-xl p-3 sm:p-4 border-2 transition-all ${dark ? 'bg-gray-800 border-gray-700 hover:border-accent/50' : 'bg-gray-50 border-gray-100 hover:border-accent/30'}`}>
        <div className="flex items-start justify-between">
          <span className="text-base sm:text-xl font-bold text-accent">{d.devise}</span>
          {onCmupEdit && (
            <button onClick={openModal} title={t.editCmup}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${dark ? 'hover:bg-gray-700 text-gray-500 hover:text-accent' : 'hover:bg-white text-gray-400 hover:text-accent'}`}>
              <PenLine className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className={`text-sm sm:text-lg font-bold mt-1 ${dark ? 'text-white' : 'text-primary'}`}>
          {d.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
        </div>
        <div className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-1`}>
          CMUP
          {onCmupEdit && <PenLine className="w-2.5 h-2.5 opacity-50" />}
          <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            {d.cmup.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
          </span>
        </div>
        {valeur > 0 && (
          <div className={`text-xs mt-0.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
            ≈ {valeur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF
          </div>
        )}
      </div>

      {showCmupModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowCmupModal(false)}>
          <div className={`${dark ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-6 w-full max-w-sm shadow-2xl border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <PenLine className={`w-4 h-4 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{t.editCmup}</h3>
                  <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {d.devise} · {langue === 'fr' ? 'Actuel' : 'Current'} : {d.cmup.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCmupModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {step === 'lock' && (
              <div
                className="h-3 cursor-pointer select-none rounded"
                style={{ opacity: 0 }}
                onTouchEnd={handleCmupTap}
                onDoubleClick={handleCmupTap}
              />
            )}

            {step === 'edit' && (
              <div className="space-y-4">
                <div className={`rounded-xl p-3 flex items-start gap-2 ${dark ? 'bg-orange-900/20 border border-orange-700/30' : 'bg-orange-50 border border-orange-200'}`}>
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${dark ? 'text-orange-400' : 'text-orange-600'}`} />
                  <p className={`text-xs ${dark ? 'text-orange-300' : 'text-orange-700'}`}>{t.cmupWarning}</p>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t.cmupManuel}
                  </label>
                  <input type="text" inputMode="decimal" autoFocus
                    value={newCmup}
                    onChange={e => setNewCmup(e.target.value.replace(/[^0-9.]/g, ''))}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-mono outline-none transition-all ${dark ? 'border-accent/50 bg-gray-800 text-white' : 'border-accent/50'} focus:border-accent`}
                    placeholder="655.500000"
                  />
                  {parseFloat(newCmup) > 0 && (
                    <div className={`mt-2 px-3 py-2 rounded-lg text-xs flex justify-between ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{langue === 'fr' ? 'Nouvelle valeur stock' : 'New stock value'}</span>
                      <span className="font-bold text-accent">{(d.quantite * parseFloat(newCmup)).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XAF</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setShowCmupModal(false)} className="flex-1">{t.cancel}</Button>
                  <Button onClick={handleConfirm} className="flex-1">{t.confirmCmup}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const Dashboard = ({ user, data, profitShare, onLogout, onTransaction, onUpdateProfitShare, onFinalize, onEditTransaction, onCmupUpdate, t, langue, setLangue, dark, setDark, logs, addLog }) => {
  const [showModal, setShowModal] = useState(false);
  const [initialTxType, setInitialTxType] = useState('vente');
  const [showSettings, setShowSettings] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showStockMovement, setShowStockMovement] = useState(false);
  const [filterType, setFilterType] = useState('tous');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [finalisationTx, setFinalisationTx] = useState(null);
  const [editTx, setEditTx] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('30');
  const [chartMetric, setChartMetric] = useState('profit');
  const [showRealPartner, setShowRealPartner] = useState(false);

  const isPorteur = user.role === 'porteur';

  // Écouter le toggle secret du tableau partenaires (Ctrl+Shift+H)
  React.useEffect(() => {
    if (!isPorteur) return;
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setShowRealPartner(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPorteur]);

  const visibleTransactions = isPorteur
    ? data.transactions
    : data.transactions; // associé voit toutes les transactions des deux utilisateurs

  const ventesCommitted = visibleTransactions.filter(tx => tx.type === 'vente');
  const totalProfit = ventesCommitted.reduce((s, tx) => {
    // Pour le porteur : utilise beneficeCachee seulement si réellement renseigné (> 0)
    const benefice = isPorteur && tx.beneficeCachee > 0
      ? tx.beneficeCachee
      : (tx.beneficeVisible || tx.profit || 0);
    return s + benefice;
  }, 0);

  const myShare = totalProfit * (isPorteur ? profitShare.porteur : profitShare.associe) / 100;

  const filtered = visibleTransactions.filter(tx => {
    const matchType = filterType === 'tous' || tx.type === filterType;
    let matchDate = true;
    if (filterStart) matchDate = matchDate && new Date(tx.date) >= new Date(filterStart);
    if (filterEnd)   matchDate = matchDate && new Date(tx.date) <= new Date(filterEnd + 'T23:59:59');
    return matchType && matchDate;
  });

  // ── Données graphique marché ──
  const buildChartData = () => {
    const days = chartPeriod === 'all' ? 9999 : parseInt(chartPeriod);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Toutes les tx triées du plus ancien au plus récent (pour simuler le CMUP)
    const allSorted = [...visibleTransactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Simuler le CMUP réel cumulé jusqu'à la coupure
    let runStock = 0;
    let runCmup  = 0;
    allSorted.forEach(tx => {
      if (new Date(tx.date) < cutoff) {
        if (tx.type === 'achat' && tx.devise === 'USDT') {
          const newCmup = runStock <= 0
            ? tx.taux
            : ((runStock * runCmup) + (tx.quantite * tx.taux)) / (runStock + tx.quantite);
          runStock += tx.quantite;
          runCmup  = newCmup;
        } else if (tx.type === 'vente') {
          runStock = Math.max(0, runStock - (tx.usdtConsomme || 0));
          // CMUP ne change pas à la vente (méthode CMUP)
        }
      }
    });
    // runCmup est maintenant le CMUP réel au début de la période

    // Agréger par jour dans la période
    const byDay = {};
    allSorted
      .filter(tx => new Date(tx.date) >= cutoff)
      .forEach(tx => {
        const key = format(new Date(tx.date), 'dd/MM');
        if (!byDay[key]) byDay[key] = {
          date: key,
          cmup: null, // calculé après
          _stockAvant: runStock,
          _cmupAvant: runCmup,
          volume: 0, profit: 0, achats: 0, ventes: 0, nbTx: 0
        };
        byDay[key].volume += tx.montant || 0;
        byDay[key].nbTx   += 1;
        if (tx.type === 'vente') {
          byDay[key].profit += tx.beneficeVisible || 0;
          byDay[key].ventes += tx.montant || 0;
          runStock = Math.max(0, runStock - (tx.usdtConsomme || 0));
          // CMUP inchangé sur vente (méthode CMUP standard)
        }
        if (tx.type === 'achat' && tx.devise === 'USDT') {
          byDay[key].achats += tx.montant || 0;
          const nc = runStock <= 0
            ? tx.taux
            : ((runStock * runCmup) + (tx.quantite * tx.taux)) / (runStock + tx.quantite);
          runStock += tx.quantite;
          runCmup  = nc;
          byDay[key].cmup = Math.round(runCmup * 100) / 100;
        }
      });

    // Remplir les CMUP manquants avec la dernière valeur connue
    let lastCmup = data.devises.find(d => d.devise === 'USDT')?.cmup || 0;
    const result = Object.values(byDay).map(d => {
      if (d.cmup !== null) lastCmup = d.cmup;
      else d.cmup = Math.round(lastCmup * 100) / 100;
      return d;
    });

    return result.length > 0
      ? result
      : [{ date: 'Auj.', cmup: Math.round(lastCmup * 100) / 100, volume: 0, profit: 0, achats: 0, ventes: 0, nbTx: 0 }];
  };

  const chartData = buildChartData();
  const usdtInfo = data.devises.find(d => d.devise === 'USDT') || { quantite: 0, cmup: 0 };
  const totalVolume = visibleTransactions.reduce((s, tx) => s + (tx.montant || 0), 0);
  const totalVentes = visibleTransactions.filter(tx => tx.type === 'vente').length;
  const myTxCount = visibleTransactions.filter(tx => tx.userId === user.id).length;
  const pendingCount = data.transactions.filter(tx => tx.statut === 'pending' || tx.statut === 'assoc_pending').length;

  // ── Palette thème ──
  const tk = {
    bg:      dark ? '#060B14' : '#F4F6FB',
    card:    dark ? '#0D1520' : '#FFFFFF',
    cardB:   dark ? '#1a2535' : '#F0F4FF',
    border:  dark ? '#1e2d42' : '#E8EDF5',
    ink:     dark ? '#F0F4FF' : '#0A1628',
    sub:     dark ? '#6B80A0' : '#7B8BAA',
    faint:   dark ? '#3A4D65' : '#BCC5D8',
    accent:  '#D4AF37',
    orange:  '#F57C20',
    green:   '#10B981',
    blue:    '#3B82F6',
    red:     '#EF4444',
    purple:  '#8B5CF6',
  };

  const txConfig = {
    vente:   { bg: dark ? '#10B98115' : '#DCFCE7', text: '#10B981', icon: ArrowUpRight,  label: langue==='fr'?'Vente':'Sale' },
    achat:   { bg: dark ? '#3B82F615' : '#DBEAFE', text: '#3B82F6', icon: ArrowDownLeft, label: langue==='fr'?'Achat':'Purchase' },
    depense: { bg: dark ? '#EF444415' : '#FEE2E2', text: '#EF4444', icon: FileText,      label: langue==='fr'?'Dépense':'Expense' },
    retrait: { bg: dark ? '#F59E0B15' : '#FEF3C7', text: '#F59E0B', icon: DollarSign,    label: langue==='fr'?'Retrait':'Withdrawal' },
    restock:    { bg: dark ? '#8B5CF615' : '#EDE9FE', text: '#8B5CF6', icon: RefreshCw,     label: langue==='fr'?'Alimenter la caisse':'Fund Cash Register' },
    versement:  { bg: dark ? '#8B5CF615' : '#EDE9FE', text: '#8B5CF6', icon: RefreshCw,     label: langue==='fr'?'Alimenter la caisse':'Fund Cash Register' },
  };

  // ── Tooltip personnalisé recharts ──
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: tk.card, border: `1px solid ${tk.border}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
        <p style={{ color: tk.sub, fontSize: 11, marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>
            {p.name} : {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : p.value}
            {p.name?.includes('CMUP') || p.name?.includes('Rate') ? ' XAF/USDT' :
             p.name?.includes('Vol') || p.name?.includes('Profit') ? ' XAF' : ''}
          </p>
        ))}
      </div>
    );
  };

  const chartColor = {
    cmup:   { stroke: tk.orange, fill: tk.orange },
    volume: { stroke: tk.blue,   fill: tk.blue },
    profit: { stroke: tk.green,  fill: tk.green },
    split:  null,
  };

  return (
    <div style={{ minHeight: '100vh', background: tk.bg, fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════
          HEADER — barre fixe premium
      ══════════════════════════════════════ */}
      <header style={{
        background: dark ? 'rgba(13,21,32,0.97)' : 'rgba(255,255,255,0.97)',
        borderBottom: `1px solid ${tk.border}`,
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #D4AF37, #B8941F)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(212,175,55,0.35)',
              }}>
                <DollarSign size={18} color="#0A1628" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: tk.ink, letterSpacing: '-0.3px', fontFamily: "'Playfair Display', serif" }}>FOREXIUM</div>
                <div style={{ fontSize: 9, color: tk.sub, letterSpacing: 3, fontWeight: 600 }}>PREMIUM EXCHANGE</div>
              </div>
            </div>

            {/* Centre — Métriques clés */}
            <div className="hidden md:flex" style={{ alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: tk.sub }}>CMUP actuel</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: tk.orange }}>{usdtInfo.cmup.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} XAF</div>
              </div>
              <div style={{ width: 1, height: 28, background: tk.border }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: tk.sub }}>Stock USDT</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: tk.ink }}>{usdtInfo.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</div>
              </div>
              <div style={{ width: 1, height: 28, background: tk.border }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: tk.sub }}>Caisse</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#3B82F6' }}>{data.caisse.toLocaleString('fr-FR')} <span style={{fontSize:10}}>XAF</span></div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ marginRight: 8, textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: tk.sub, letterSpacing: 0.5 }}>{t.connectedAs}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isPorteur ? 'linear-gradient(135deg,#D4AF37,#B8941F)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0,
                  }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: tk.ink, lineHeight: 1 }}>{user.name}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: isPorteur ? '#D4AF37' : '#3B82F6', letterSpacing: 0.5 }}>
                      {isPorteur ? 'PORTEUR D\'AFFAIRE' : 'ASSOCIÉ'}
                    </div>
                  </div>
                </div>
              </div>
              {[
                { onClick: () => { const nl = langue==='fr'?'en':'fr'; setLangue(nl); addLog('settings',`Langue → ${nl.toUpperCase()}`,user.id); }, icon: <Globe size={16}/>, title: langue==='fr'?'EN':'FR', isText: true },
                { onClick: () => { setDark(!dark); addLog('settings',`Thème → ${!dark?'Sombre':'Clair'}`,user.id); }, icon: dark ? <Sun size={16}/> : <Moon size={16}/>, color: dark?'#F59E0B':undefined },
                { onClick: () => { setShowJournal(true); addLog('settings','Journal',user.id); }, icon: <ShieldCheck size={16}/>, badge: logs.length > 0 },
                { onClick: () => setShowStockMovement(true), icon: <Activity size={16}/>, color: tk.blue },
                ...(isPorteur ? [{ onClick: () => { setShowSettings(true); addLog('settings','Paramètres',user.id); }, icon: <Settings size={16}/> }] : []),
              ].map((btn, i) => (
                <button key={i} onClick={btn.onClick} title={btn.title} style={{
                  width: btn.isText ? 'auto' : 34, height: 34,
                  padding: btn.isText ? '0 10px' : undefined,
                  borderRadius: 8, border: `1px solid ${tk.border}`,
                  background: tk.cardB, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: btn.color || tk.sub, fontSize: 11, fontWeight: 700,
                  position: 'relative', transition: 'all 0.15s',
                }}>
                  {btn.icon}
                  {btn.isText && <span style={{ marginLeft: 4 }}>{btn.title}</span>}
                  {btn.badge && <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: tk.accent }} />}
                </button>
              ))}
              <button onClick={onLogout} style={{
                height: 34, padding: '0 14px', borderRadius: 8, border: 'none',
                background: '#EF444415', color: '#EF4444', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
              }}>
                <LogOut size={14}/><span className="hidden sm:inline">Quitter</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Alerte pending ── */}
        {isPorteur && pendingCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
            borderRadius: 12, background: dark?'#F59E0B08':'#FFFBEB',
            border: `1px solid ${dark?'#F59E0B25':'#FCD34D'}`, marginBottom: 20,
          }}>
            <Clock size={18} color="#F59E0B" />
            <p style={{ fontSize: 13, fontWeight: 600, color: dark?'#FCD34D':'#92400E' }}>
              {pendingCount} vente{pendingCount>1?'s':''} en attente de finalisation
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════
            ROW 1 — 5 KPI CARDS
        ══════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }} className="grid-kpi">
          {[
            {
              label: 'Stock USDT',
              value: usdtInfo.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
              unit: 'USDT',
              sub: `CMUP ${usdtInfo.cmup.toLocaleString('fr-FR',{maximumFractionDigits:2})} XAF`,
              icon: <Warehouse size={18}/>, color: tk.orange, delta: null,
            },
            {
              label: langue==='fr'?'Caisse':'Cash Register',
              value: data.caisse.toLocaleString('fr-FR'),
              unit: 'XAF',
              sub: langue==='fr'?'Fonds opérationnels':'Operational funds',
              icon: <Banknote size={18}/>, color: '#3B82F6', delta: null,
            },
            {
              label: 'Profit total',
              value: totalProfit.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
              unit: 'XAF',
              sub: `${totalVentes} vente${totalVentes>1?'s':''}`,
              icon: <TrendingUp size={18}/>, color: tk.green, delta: null,
            },
            {
              label: langue==='fr'?'Ma part':'My share',
              value: myShare.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
              unit: 'XAF',
              sub: `${isPorteur ? profitShare.porteur : profitShare.associe}% du profit`,
              icon: <Users size={18}/>, color: tk.accent, delta: null,
            },
            {
              label: 'Transactions',
              value: visibleTransactions.length,
              unit: '',
              sub: `${myTxCount} par moi · Vol. ${totalVolume.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF`,
              icon: <FileText size={18}/>, color: tk.purple, delta: null,
            },
          ].map((kpi, i) => (
            <div key={i} style={{
              background: tk.card, borderRadius: 16,
              border: `1px solid ${tk.border}`,
              padding: '18px 20px', position: 'relative', overflow: 'hidden',
              boxShadow: dark?'0 2px 12px rgba(0,0,0,0.25)':'0 2px 8px rgba(10,22,40,0.06)',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: kpi.color, borderRadius: '16px 16px 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: kpi.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: kpi.color,
                }}>
                  {kpi.icon}
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.sub, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: tk.ink, letterSpacing: '-0.5px', lineHeight: 1 }}>{kpi.value}</span>
                {kpi.unit && <span style={{ fontSize: 11, fontWeight: 600, color: tk.sub }}>{kpi.unit}</span>}
              </div>
              <div style={{ fontSize: 11, color: tk.faint, marginTop: 5 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════
            ROW 2 — GRAPHIQUE MARCHÉ (full width)
        ══════════════════════════════════════ */}
        <div style={{
          background: tk.card, borderRadius: 20,
          border: `1px solid ${tk.border}`,
          padding: '24px 28px', marginBottom: 24,
          boxShadow: dark?'0 2px 12px rgba(0,0,0,0.25)':'0 2px 8px rgba(10,22,40,0.06)',
        }}>
          {/* Titre + contrôles */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: tk.ink, fontFamily: "'Playfair Display', serif" }}>
                Évolution du Marché
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: tk.sub }}>
                {langue==='fr'?'Variations ventes & bénéfices par jour':'Daily sales & profit variations'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* Sélecteur métrique courbe */}
              <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: tk.cardB, border: `1px solid ${tk.border}` }}>
                {[['profit', langue==='fr'?'Bénéfice':'Profit'], ['ventes', langue==='fr'?'Ventes':'Sales'], ['cmup','CMUP']].map(([k,l]) => (
                  <button key={k} onClick={() => setChartMetric(k)} style={{
                    padding: '5px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: chartMetric===k ? tk.green : 'transparent',
                    color: chartMetric===k ? '#fff' : tk.sub,
                    transition: 'all 0.2s',
                  }}>{l}</button>
                ))}
              </div>
              {/* Sélecteur période */}
              <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: tk.cardB, border: `1px solid ${tk.border}` }}>
                {[['7','7j'],['30','30j'],['90','90j'],['all','Tout']].map(([k,l]) => (
                  <button key={k} onClick={() => setChartPeriod(k)} style={{
                    padding: '5px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: chartPeriod===k ? tk.orange : 'transparent',
                    color: chartPeriod===k ? '#fff' : tk.sub,
                    transition: 'all 0.2s',
                  }}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Graphique — courbe dynamique selon métrique sélectionnée */}
          <div>
            <div style={{ fontSize: 11, color: tk.sub, marginBottom: 8, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ display:'inline-block', width:22, height:3, background: chartMetric==='cmup' ? tk.orange : chartMetric==='ventes' ? tk.blue : tk.green, borderRadius:2, verticalAlign:'middle' }}/>
                <span>{chartMetric==='cmup' ? 'CMUP (XAF/USDT)' : chartMetric==='ventes' ? 'Ventes XAF' : 'Bénéfice XAF'}</span>
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:tk.blue+'AA' }}/>
                <span>Achats XAF</span>
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:tk.green+'AA' }}/>
                <span>Ventes XAF</span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartMetric==='cmup' ? tk.orange : chartMetric==='ventes' ? tk.blue : tk.green} stopOpacity={0.18}/>
                    <stop offset="100%" stopColor={chartMetric==='cmup' ? tk.orange : chartMetric==='ventes' ? tk.blue : tk.green} stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={tk.faint} strokeOpacity={0.3} vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tk.sub }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="metric"
                  tick={{ fontSize: 10, fill: chartMetric==='cmup' ? tk.orange : chartMetric==='ventes' ? tk.blue : tk.green }} axisLine={false} tickLine={false}
                  domain={['auto','auto']}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}/>
                <YAxis yAxisId="tx" orientation="right"
                  tick={{ fontSize: 10, fill: tk.sub }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}/>
                <Tooltip content={<CustomTooltip />}/>
                <Bar yAxisId="tx" dataKey="achats" name={langue==='fr'?'Achats XAF':'Purchases XAF'}
                  fill={tk.blue} opacity={0.45} radius={[3,3,0,0]} maxBarSize={18}/>
                <Bar yAxisId="tx" dataKey="ventes" name={langue==='fr'?'Ventes XAF':'Sales XAF'}
                  fill={tk.green} opacity={0.45} radius={[3,3,0,0]} maxBarSize={18}/>
                <Area yAxisId="metric" type="monotone"
                  dataKey={chartMetric === 'ventes' ? 'ventes' : chartMetric === 'cmup' ? 'cmup' : 'profit'}
                  name={chartMetric==='cmup' ? 'CMUP XAF/USDT' : chartMetric==='ventes' ? 'Ventes XAF' : 'Bénéfice XAF'}
                  stroke={chartMetric==='cmup' ? tk.orange : chartMetric==='ventes' ? tk.blue : tk.green}
                  fill="url(#gradMetric)" strokeWidth={2.5}
                  dot={chartData.length <= 20 ? { fill: chartMetric==='cmup' ? tk.orange : chartMetric==='ventes' ? tk.blue : tk.green, r: 3.5, strokeWidth: 2, stroke: tk.card } : false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: tk.card, fill: chartMetric==='cmup' ? tk.orange : chartMetric==='ventes' ? tk.blue : tk.green }}/>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 10, color: tk.faint, marginTop: 4 }}>
              💡 {langue==='fr'
                ? 'Chaque achat recalcule le CMUP par pondération. Les ventes consomment le stock sans modifier le CMUP.'
                : 'Each purchase recalculates the CMUP by weighting. Sales consume stock without changing the CMUP.'}
            </div>
          </div>

          {/* Mini KPIs graphique */}
          <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${tk.border}`, flexWrap: 'wrap' }}>
            {[
              { label: 'CMUP actuel', value: `${usdtInfo.cmup.toLocaleString('fr-FR',{maximumFractionDigits:2})} XAF/USDT`, color: tk.orange },
              { label: 'Achats période', value: `${chartData.reduce((s,d)=>s+d.achats,0).toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF`, color: tk.blue },
              { label: 'Profit période', value: `+${chartData.reduce((s,d)=>s+d.profit,0).toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF`, color: tk.green },
              { label: 'Nb opérations', value: chartData.reduce((s,d)=>s+d.nbTx,0), color: tk.purple },
            ].map((kpi,i) => (
              <div key={i} style={{ flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, color: tk.sub, marginBottom: 3 }}>{kpi.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            ROW 3 — TRANSACTIONS + SIDEBAR
        ══════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }} className="grid-main">

          {/* ── COL GAUCHE : Transactions ── */}
          <div>
            {/* ── Actions rapides — haut gauche ── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.faint, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{t.quickActions}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { type:'vente',   label:t.sellCurrency,  icon:ArrowUpRight,  color:tk.green },
                  { type:'achat',   label:t.buyCurrency,   icon:ArrowDownLeft, color:tk.blue },
                  { type:'depense', label:t.recordExpense, icon:FileText,      color:tk.red },
                  { type:'retrait', label:t.makeWithdrawal,icon:DollarSign,    color:'#F59E0B' },
                  { type:'restock', label:t.restock,       icon:RefreshCw,     color:tk.purple },
                ].map(a => {
                  const AIcon = a.icon;
                  return (
                    <button key={a.type} onClick={()=>{setInitialTxType(a.type);setShowModal(true);}}
                      style={{
                        display:'flex', alignItems:'center', gap:7,
                        padding:'8px 14px', borderRadius:10,
                        border:`1px solid ${tk.border}`,
                        background: tk.card, cursor:'pointer',
                        transition:'all 0.15s',
                        boxShadow: dark?'none':'0 1px 3px rgba(10,22,40,0.06)',
                      }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=tk.cardB; e.currentTarget.style.borderColor=a.color+'60'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background=tk.card; e.currentTarget.style.borderColor=tk.border; }}>
                      <div style={{
                        width:26, height:26, borderRadius:7, flexShrink:0,
                        background: a.color+'18',
                        display:'flex', alignItems:'center', justifyContent:'center', color:a.color,
                      }}><AIcon size={13} strokeWidth={2.5}/></div>
                      <span style={{ fontSize:12, fontWeight:600, color:tk.ink }}>{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Titre + bouton Nouvelle transaction */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: tk.ink, fontFamily: "'Playfair Display', serif" }}>{t.transactions}</h2>
              <button onClick={() => { setInitialTxType('vente'); setShowModal(true); }} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #D4AF37, #B8941F)',
                color: '#0A1628', fontWeight: 700, fontSize: 12,
                boxShadow: '0 4px 12px rgba(212,175,55,0.30)',
              }}>
                <Plus size={14} strokeWidth={2.5}/>{t.newTransaction}
              </button>
            </div>

            {/* Filtres */}
            <div style={{
              background: tk.card, borderRadius: 14, border: `1px solid ${tk.border}`,
              padding: '14px 18px', marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <Filter size={13} color={tk.faint}/>
                {['tous','vente','achat','depense','retrait','restock'].map(tp => (
                  <button key={tp} onClick={() => setFilterType(tp)} style={{
                    padding: '4px 12px', borderRadius: 20, border: `1px solid ${filterType===tp ? 'transparent' : tk.border}`,
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    background: filterType===tp ? (tp==='vente'?tk.green:tp==='achat'?tk.blue:tp==='depense'?tk.red:tp==='retrait'?'#F59E0B':tp==='restock'?tk.purple:tk.ink) : 'transparent',
                    color: filterType===tp ? '#fff' : tk.sub,
                    transition: 'all 0.15s',
                  }}>
                    {tp==='tous'?t.all:tp==='vente'?t.sale:tp==='achat'?t.purchase:tp==='depense'?t.expense:tp==='retrait'?t.withdrawal:t.restock}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: tk.faint, letterSpacing: 1, textTransform: 'uppercase' }}>Période :</span>
                <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={{
                  padding: '4px 10px', borderRadius: 8, border: `1px solid ${tk.border}`,
                  background: tk.cardB, color: tk.ink, fontSize: 11, outline: 'none',
                }}/>
                <span style={{ color: tk.faint, fontSize: 12 }}>→</span>
                <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} style={{
                  padding: '4px 10px', borderRadius: 8, border: `1px solid ${tk.border}`,
                  background: tk.cardB, color: tk.ink, fontSize: 11, outline: 'none',
                }}/>
                {(filterStart||filterEnd) && (
                  <button onClick={()=>{setFilterStart('');setFilterEnd('');}} style={{ background:'none', border:'none', cursor:'pointer', color: tk.red }}><X size={14}/></button>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: tk.faint }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
              </div>
            </div>

            {/* Liste transactions */}
            {filtered.length === 0 ? (
              <div style={{ background: tk.card, borderRadius: 14, border: `1px solid ${tk.border}`, padding: '48px 20px', textAlign: 'center' }}>
                <Package size={36} color={tk.faint} style={{ margin: '0 auto 12px' }}/>
                <p style={{ color: tk.sub, fontSize: 13 }}>{t.noTransactions}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.slice(0, 30).map(tx => {
                  const cfg = txConfig[tx.type] || txConfig.depense;
                  const Icon = cfg.icon;
                  const isPending = tx.statut === 'pending';
                  const isAssocPending = tx.statut === 'assoc_pending';
                  const isPorteurPending = tx.statut === 'porteur_pending';
                  const isCommitted = tx.statut === 'committed';
                  // Dot orange pulsant : visible pour porteur sur les ventes assoc_pending
                  const showOrangeDot = isPorteur && isAssocPending && tx.type === 'vente';
                  return (
                    <div key={tx.id} style={{
                      background: tk.card, borderRadius: 14,
                      border: `1px solid ${(isPending || isAssocPending) && isPorteur ? '#F59E0B40' : tk.border}`,
                      padding: '14px 18px',
                      position: 'relative',
                      boxShadow: dark?'none':'0 1px 4px rgba(10,22,40,0.05)',
                      transition: 'box-shadow 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                          {/* Icône avec dot orange pulsant pour assoc_pending */}
                          <div style={{ position:'relative', flexShrink:0 }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: 10,
                              background: cfg.bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Icon size={16} color={cfg.text} strokeWidth={2.5}/>
                            </div>
                            {showOrangeDot && (
                              <div style={{
                                position:'absolute', top:-3, right:-3,
                                width:10, height:10, borderRadius:'50%',
                                background:'#F59E0B',
                                boxShadow:'0 0 0 2px ' + tk.card,
                              }}/>
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: cfg.text, letterSpacing: 0.5 }}>{cfg.label.toUpperCase()}</span>
                              {isPorteur && isPending && (
                                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background:'#F59E0B20', color:'#F59E0B', fontWeight:700 }}>EN ATTENTE</span>
                              )}
                              {/* porteur_pending et assoc_pending : pas de badge texte */}
                              {tx.type === 'vente' && tx.deviseVente && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: tk.ink }}>{tx.quantiteDevise?.toLocaleString('fr-FR',{maximumFractionDigits:4})} {tx.deviseVente} → {tx.usdtConsomme?.toFixed(4)} USDT</span>
                              )}
                              {tx.type === 'achat' && tx.devise && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: tk.ink }}>{tx.quantite?.toLocaleString('fr-FR',{maximumFractionDigits:4})} {tx.devise}</span>
                              )}
                            </div>
                            <p style={{ fontSize: 11, color: tk.sub, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {format(tx.date, 'dd/MM/yyyy HH:mm')}
                              {tx.client && ` · ${tx.client}`}
                              {tx.fournisseur && ` · ${tx.fournisseur}`}
                              {tx.beneficiaire && ` · ${tx.beneficiaire}`}
                            </p>
                            {tx.userName && (
                              <p style={{ fontSize: 10, color: tk.faint, margin: '2px 0 0', display:'flex', alignItems:'center', gap:4 }}>
                                <span style={{ width:5, height:5, borderRadius:'50%', background: tx.userId === user.id ? tk.accent : tk.blue, display:'inline-block', flexShrink:0 }}/>
                                {tx.userName}
                              </p>
                            )}

                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 800, color: tk.ink, margin: '0 0 2px' }}>{tx.montant?.toLocaleString('fr-FR')} <span style={{fontSize:10,color:tk.sub}}>XAF</span></p>
                          {(tx.beneficeVisible > 0 || tx.profit > 0) && (
                            <p style={{ fontSize: 11, fontWeight: 700, color: tk.green, margin: '0 0 6px' }}>+{(tx.beneficeVisible||tx.profit||0).toLocaleString('fr-FR',{maximumFractionDigits:0})}</p>
                          )}
                          <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end', flexWrap:'wrap' }}>
                            {(tx.type==='vente'||tx.type==='achat') && (
                              <button onClick={()=>{genererFacturePDF(tx,langue);addLog('pdf',`PDF ${tx.id}`,user.id,{opId:tx.id});}} style={{
                                fontSize:10, fontWeight:700, color: tk.accent,
                                background:'none', border:'none', cursor:'pointer',
                                display:'flex', alignItems:'center', gap:3,
                              }}><Download size={11}/>{t.invoicePDF}</button>
                            )}
                            {/* Bouton "Valider" porteur pour assoc_pending — dot orange checkmark */}
                            {isPorteur && isAssocPending && tx.type==='vente' && (
                              <button onClick={async () => {
                                try {
                                  await apiValiderAssoc(tx.id);
                                  await loadDataFromAPI();
                                  toast.success(langue==='fr' ? 'Vente validée' : 'Sale validated');
                                } catch(e) { toast.error(e.message); }
                              }} style={{
                                width:26, height:26, borderRadius:'50%',
                                border:'none', cursor:'pointer',
                                background:'#F59E0B', color:'#fff',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                flexShrink:0,
                              }} title={langue==='fr'?'Valider la vente':'Validate sale'}>
                                <CheckCircle2 size={13} strokeWidth={2.5}/>
                              </button>
                            )}
                            {/* Bouton "Finaliser" pour pending normaux */}
                            {isPorteur && isPending && tx.type==='vente' && (
                              <button onClick={()=>setFinalisationTx(tx)} style={{
                                fontSize:10, fontWeight:700, padding:'3px 10px',
                                borderRadius:6, border:'none', cursor:'pointer',
                                background:'#F59E0B', color:'#fff',
                              }}>{t.finaliserVente}</button>
                            )}
                            {/* Modifier - désactiver si finalisée (committed) */}
                            {isPorteur && !isCommitted && (
                              <button onClick={()=>setEditTx(tx)} style={{
                                fontSize:10, fontWeight:600, padding:'3px 8px',
                                borderRadius:6, border:`1px solid ${tk.border}`, cursor:'pointer',
                                background: tk.cardB, color: tk.sub,
                                display:'flex', alignItems:'center', gap:3,
                              }}><Edit2 size={10}/>{t.modifierTx}</button>
                            )}
                            {/* Lock icon si finalisée */}
                            {isCommitted && (
                              <button disabled style={{
                                fontSize:10, fontWeight:600, padding:'3px 8px',
                                borderRadius:6, border:`1px solid ${tk.border}`,
                                background: tk.cardB, color: tk.faint,
                                display:'flex', alignItems:'center', gap:3,
                                opacity: 0.5, cursor: 'not-allowed',
                              }} title={langue==='fr' ? 'Transaction finalisée' : 'Transaction finalized'}><Lock size={10}/>{t.modifierTx}</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── COL DROITE : Sidebar ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Stock devises */}
            <div style={{ background:tk.card, borderRadius:16, border:`1px solid ${tk.border}`, padding:'20px', boxShadow: dark?'0 2px 12px rgba(0,0,0,0.25)':'0 2px 8px rgba(10,22,40,0.06)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <h3 style={{ margin:0, fontSize:13, fontWeight:800, color:tk.ink }}>{t.currencyStock}</h3>
                <button onClick={()=>setShowStockMovement(true)} style={{
                  fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:7,
                  border:`1px solid ${tk.border}`, background:tk.cardB, color:tk.blue, cursor:'pointer',
                  display:'flex', alignItems:'center', gap:4,
                }}><Activity size={11}/>{langue==='fr'?'Mouvements':'Movements'}</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {data.devises.map(d => (
                  <DeviseCard key={d.devise} devise={d} onCmupEdit={isPorteur?onCmupUpdate:null} t={t} dark={dark} langue={langue}/>
                ))}
              </div>
            </div>

            {/* Répartition profits */}
            <div style={{ background:tk.card, borderRadius:16, border:`1px solid ${tk.border}`, padding:'20px', boxShadow: dark?'0 2px 12px rgba(0,0,0,0.25)':'0 2px 8px rgba(10,22,40,0.06)' }}>
              <h3 style={{ margin:'0 0 14px', fontSize:13, fontWeight:800, color:tk.ink, display:'flex', alignItems:'center', gap:8 }}>
                <Users size={15} color={tk.accent}/>{t.profitShare}
              </h3>
              {/* Barre visuelle */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', borderRadius:8, overflow:'hidden', height:10, marginBottom:6 }}>
                  <div style={{ width:`${profitShare.porteur}%`, background:'linear-gradient(90deg,#D4AF37,#B8941F)', transition:'width 0.4s' }}/>
                  <div style={{ flex:1, background: dark?'#1e2d42':'#E8EDF5', transition:'width 0.4s' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:tk.sub }}>
                  <span>Porteur {profitShare.porteur}%</span>
                  <span>Associé {profitShare.associe}%</span>
                </div>
              </div>
              {(() => {
                const toutesVentesRep = data.transactions.filter(tx => tx.type === 'vente');
                const totalPorteurRep = toutesVentesRep.reduce((s, tx) =>
                  s + (tx.beneficeCachee > 0 ? (tx.partPorteurCache || 0) : (tx.partPorteur || 0)), 0);
                const totalAssocieRep = toutesVentesRep.reduce((s, tx) =>
                  s + (tx.beneficeCachee > 0 ? (tx.partAssocieCache || 0) : (tx.partAssocie || 0)), 0);
                return [
                  { label:`${t.partner} (${profitShare.porteur}%)`, value: totalPorteurRep, color:tk.accent, bg: dark?'#D4AF3710':'#FFFBEB' },
                  { label:`${t.associate} (${profitShare.associe}%)`, value: totalAssocieRep, color:tk.ink, bg: tk.cardB },
                ].map((row,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderRadius:10, background:row.bg, marginBottom:6 }}>
                    <span style={{ fontSize:12, color:tk.sub }}>{row.label}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:row.color }}>{row.value.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF</span>
                  </div>
                ));
              })()}
            </div>

            {/* Tableau de Bord des Partenaires */}
            {(() => {
              const toutesVentes = data.transactions.filter(tx => tx.type === 'vente');

              // ── Vue VISIBLE ──────────────────────────────────────────────
              const partPorteurVisible   = toutesVentes.reduce((s, tx) => s + (tx.partPorteur || 0), 0);
              const partAssocieVisible   = toutesVentes.reduce((s, tx) => s + (tx.partAssocie || 0), 0);
              const beneficeTotalVisible = toutesVentes.reduce((s, tx) => s + (tx.beneficeVisible || tx.profit || 0), 0);

              // ── Vue RÉELLE (Ctrl+Shift+H) ────────────────────────────────
              // Cumul correct : ventes SANS taux caché → valeur visible ; ventes AVEC → valeur cachée
              // Ex : 50 visible + 10 visible = 60 visible | 50 visible + 12 caché = 62 réel
              const partPorteurReel   = toutesVentes.reduce((s, tx) =>
                s + (tx.beneficeCachee > 0 ? (tx.partPorteurCache || 0) : (tx.partPorteur || 0)), 0);
              const partAssocieReel   = toutesVentes.reduce((s, tx) =>
                s + (tx.beneficeCachee > 0 ? (tx.partAssocieCache || 0) : (tx.partAssocie || 0)), 0);
              const beneficeTotalReel = toutesVentes.reduce((s, tx) =>
                s + (tx.beneficeCachee > 0 ? tx.beneficeCachee : (tx.beneficeVisible || tx.profit || 0)), 0);

              const pPorteur = isPorteur && showRealPartner ? partPorteurReel  : partPorteurVisible;
              const pAssocie = isPorteur && showRealPartner ? partAssocieReel  : partAssocieVisible;
              const bTotal   = isPorteur && showRealPartner ? beneficeTotalReel : beneficeTotalVisible;

              return (
                <div style={{ background:tk.card, borderRadius:16, border:`2px solid ${isPorteur ? '#D4AF3730':'#3B82F630'}`, padding:'18px 20px', boxShadow: dark?'0 2px 12px rgba(0,0,0,0.25)':'0 2px 8px rgba(10,22,40,0.06)' }}>
                  <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:800, color:tk.ink, display:'flex', alignItems:'center', gap:8 }}>
                    <Shield size={15} color={isPorteur ? tk.accent : tk.blue}/>
                    {langue==='fr' ? 'Tableau des Partenaires' : 'Partners Overview'}
                    {isPorteur && showRealPartner && (
                      <span style={{ fontSize:9, color:'#D4AF37', padding:'2px 7px', borderRadius:5, background:'rgba(212,175,55,0.12)', border:'1px solid rgba(212,175,55,0.25)', display:'inline-flex', alignItems:'center', gap:3 }}>
                        <Zap size={8} color="#D4AF37"/> {langue==='fr' ? 'Vue réelle' : 'Real view'}
                      </span>
                    )}
                  </h3>

                  {/* Porteur */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:tk.accent, letterSpacing:1, textTransform:'uppercase', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:tk.accent}}/> {langue==='fr' ? "Porteur d'affaire" : 'Business Owner'}
                    </div>
                    {[
                      { label: langue==='fr' ? 'Part sur bénéfices' : 'Profit share', value: pPorteur },
                      { label: langue==='fr' ? 'Total cumulé porteur' : 'Total owner', value: pPorteur, bold:true, accent:true },
                    ].map((r,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', borderRadius:7, marginBottom:3, background: r.bold ? (dark?'#D4AF3715':'#FFFBEB') : 'transparent' }}>
                        <span style={{ fontSize:11, color: r.bold ? tk.accent : tk.sub }}>{r.label}</span>
                        <span style={{ fontSize:12, fontWeight: r.bold?800:600, color: r.accent ? tk.accent : (dark?'#F0F4FF':'#0A1628') }}>{r.value.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ height:1, background: dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.05)', margin:'8px 0' }} />

                  {/* Associé */}
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:tk.blue, letterSpacing:1, textTransform:'uppercase', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:tk.blue}}/> {langue==='fr' ? 'Associé' : 'Associate'}
                    </div>
                    {[
                      { label: langue==='fr' ? 'Part sur bénéfices' : 'Profit share', value: pAssocie },
                      { label: langue==='fr' ? 'Total cumulé associé' : 'Total associate', value: pAssocie, bold:true, blue:true },
                    ].map((r,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', borderRadius:7, marginBottom:3, background: r.bold ? (dark?'#3B82F615':'#EFF6FF') : 'transparent' }}>
                        <span style={{ fontSize:11, color: r.bold ? tk.blue : tk.sub }}>{r.label}</span>
                        <span style={{ fontSize:12, fontWeight: r.bold?800:600, color: r.blue ? tk.blue : (dark?'#F0F4FF':'#0A1628') }}>{r.value.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:10, padding:'8px 10px', borderRadius:8, background: dark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)', border:`1px solid ${tk.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:10, color:tk.faint }}>{langue==='fr' ? 'Bénéfice total opérations' : 'Total operations profit'}</span>
                    <span style={{ fontSize:13, fontWeight:800, color:tk.ink }}>{bTotal.toLocaleString('fr-FR',{maximumFractionDigits:0})} XAF</span>
                  </div>
                </div>
              );
            })()}


          </div>
        </div>
      </main>

      {/* ── Modales ── */}
      {showModal && (
        <TransactionModal data={data} profitShare={profitShare} user={user}
          onClose={()=>setShowModal(false)}
          onSubmit={tx=>{onTransaction(tx);setShowModal(false);}}
          t={t} dark={dark} langue={langue} initialType={initialTxType}/>
      )}
      {showSettings && isPorteur && (
        <SettingsModal profitShare={profitShare} onClose={()=>setShowSettings(false)}
          onUpdate={s=>onUpdateProfitShare(s)} t={t} dark={dark}/>
      )}
      {showJournal && (
        <JournalModal logs={logs} onClose={()=>setShowJournal(false)} t={t} dark={dark}/>
      )}
      {showStockMovement && (
        <StockMovementModal data={data} user={user}
          onClose={()=>setShowStockMovement(false)}
          t={t} dark={dark} langue={langue}/>
      )}
      {finalisationTx && isPorteur && (
        <FinalisationModal
          transaction={finalisationTx} profitShare={profitShare}
          onClose={()=>setFinalisationTx(null)} onFinalize={onFinalize}
          t={t} dark={dark} langue={langue}/>
      )}
      {editTx && isPorteur && (
        <EditModal
          transaction={editTx} data={data} allTransactions={data.transactions}
          onClose={()=>setEditTx(null)} onEdit={onEditTransaction}
          t={t} dark={dark} langue={langue}/>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// APP PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  // Global hidden/visible state
  const [hiddenUnlocked, setHiddenUnlocked] = useState(false);
  // Global keyboard shortcut for toggling hidden data
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setHiddenUnlocked(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const [langue, setLangue] = useState('fr');
  const [dark, setDark] = useState(false);
  const [profitShare, setProfitShare] = useState(DEFAULT_PROFIT_SHARE);
  const [logs, setLogs] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    depot: 0,
    caisse: 500000,
    devises: [{ devise: 'USDT', quantite: 0, cmup: 0 }],
    transactions: []
  });

  const t = TRANSLATIONS[langue];

  const addLog = (type, desc, userId = null, meta = {}) => {
    const log = createLog(type, desc, userId, meta);
    setLogs(prev => [...prev, log]);
    return log;
  };

  // ── Persistance préférences UI uniquement (pas les données métier) ──
  useEffect(() => {
    localStorage.setItem('fx_lang', langue);
    localStorage.setItem('fx_dark', JSON.stringify(dark));
  }, [langue, dark]);

  // ── Chargement données depuis l'API après connexion ──
  const loadDataFromAPI = useCallback(async () => {
    try {
      setLoading(true);
      const { comptes, txData, stock, settings, repartition } = await apiLoadAll();

      // Reconstruire l'état data depuis les réponses API
      const transactions = (txData.transactions || []).map(tx => ({
        ...tx,
        // Normaliser les champs API → format frontend
        id: tx.id,
        type: tx.type,
        date: new Date(tx.date || tx.date_enregistrement),
        dateEnregistrement: tx.date_enregistrement ? new Date(tx.date_enregistrement) : new Date(tx.date),
        dateModification: tx.date_modification ? new Date(tx.date_modification) : null,
        montant: parseFloat(
          tx.montant ||
          tx.prix_achat_total ||
          tx.valeur_vente_visible ||   // ventes : valeur encaissée
          0
        ),
        quantite: parseFloat(tx.quantite || 0),
        taux: parseFloat(tx.taux_achat_unitaire || 0),
        devise: tx.devise || 'USDT',
        deviseVente: tx.devise_vente,
        tauxConversion: parseFloat(tx.taux_conversion || 0),
        tauxAchatXAF: parseFloat(tx.taux_achat_xaf || 0),
        quantiteDevise: parseFloat(tx.quantite_vente || 0),
        tauxVisible: parseFloat(tx.taux_vente_visible || 0),
        tauxCache: parseFloat(tx.taux_vente_cache || 0),
        valeurAchat: parseFloat(tx.valeur_achat_xaf || 0),
        valeurVenteVisible: parseFloat(tx.valeur_vente_visible || 0),
        valeurVenteCachee: parseFloat(tx.valeur_vente_cachee || 0),
        beneficeVisible: parseFloat(tx.benefice_visible || 0),
        beneficeCachee: parseFloat(tx.benefice_cache || 0),
        partPorteur: parseFloat(tx.part_porteur_visible || 0),
        partAssocie: parseFloat(tx.part_associe_visible || 0),
        partPorteurCache: parseFloat(tx.part_porteur_cachee || 0),
        partAssocieCache: parseFloat(tx.part_associe_cachee || 0),
        porteurPct: parseInt(tx.pourcentage_porteur || 70),
        associePct: parseInt(tx.pourcentage_associe || 30),
        usdtConsomme: parseFloat(tx.usdt_consomme || 0),
        client: tx.client,
        fournisseur: tx.fournisseur,
        beneficiaire: tx.beneficiaire,
        sourceCompte: tx.use_caisse ? 'caisse' : 'depot',
        statut: tx.statut,
        userId: tx.user_id,
        userName: tx.user_name,
        stockUsdt_avant: 0,
        stockUsdt_apres: 0,
      }));

      // Recalculer la chaîne stock avant/après pour tous les mouvements USDT
      const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      let stockCourant = 0;
      const withStock = sorted.map(row => {
        if (row.type === 'achat' && (row.devise === 'USDT' || !row.deviseVente)) {
          const qte = row.quantite || 0;
          const avant = stockCourant;
          stockCourant = avant + qte;
          return { ...row, stockUsdt_avant: avant, stockUsdt_apres: stockCourant };
        } else if (row.type === 'vente') {
          const conso = row.usdtConsomme || 0;
          const avant = stockCourant;
          stockCourant = Math.max(0, avant - conso);
          return { ...row, stockUsdt_avant: avant, stockUsdt_apres: stockCourant };
        }
        return row;
      });
      // Remettre dans l'ordre original (DESC date)
      const transactionsWithStock = transactions.map(row =>
        withStock.find(w => w.id === row.id) || row
      );

      setData({
        depot: parseFloat(comptes.depot || 0),
        caisse: parseFloat(comptes.caisse || 0),
        devises: [{ devise: 'USDT', quantite: parseFloat(stock.quantite || 0), cmup: parseFloat(stock.cmup || 0) }],
        transactions: transactionsWithStock,
      });

      // Répartition des profits
      const porteurR = repartition.repartition?.find(r => r.role === 'porteur');
      const associeR = repartition.repartition?.find(r => r.role === 'associe');
      if (porteurR) {
        setProfitShare({
          porteur: parseFloat(porteurR.pourcentage_defaut || 70),
          associe: parseFloat(associeR?.pourcentage_defaut || 30),
        });
      }
    } catch (err) {
      console.error('Erreur chargement API:', err.message);
      toast.error('Erreur chargement des données : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les données dès que l'utilisateur est connecté
  useEffect(() => {
    if (user && localStorage.getItem('fx_token')) {
      loadDataFromAPI();
    }
  }, [user, loadDataFromAPI]);

  // ── Connexion ──
  const handleLogin = async (email, password) => {
    if (!email || !password) { toast.error(t.allFieldsRequired); return; }
    try {
      setLoading(true);
      const result = await apiLogin(email, password);
      const loggedUser = result.user;
      localStorage.setItem('fx_token', result.token);
      localStorage.setItem('fx_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      setSessionStart(new Date());
      addLog('connexion', `Connexion réussie : ${email} — Rôle: ${loggedUser.role}`, loggedUser.id, { statut: 'success' });
      toast.success(`${t.welcome} ${loggedUser.name} !`);
    } catch (err) {
      addLog('connexion_echouee', `Tentative échouée : ${email}`, null, { statut: 'failed' });
      toast.error(t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  // ── Inscription ──
  const handleRegister = async (name, email, password, role) => {
    const result = await apiRegister(name, email, password, role);
    toast.success(
      langue === 'fr'
        ? `Compte créé ! Bienvenue ${name} — connectez-vous maintenant.`
        : `Account created! Welcome ${name} — please log in.`
    );
    return result;
  };

  // ── Déconnexion ──
  const handleLogout = async () => {
    const duree = sessionStart ? formatDistanceToNow(sessionStart, { locale: dateFr }) : '—';
    addLog('deconnexion', `Déconnexion : ${user?.email} — ${t.sessionDuration} : ${duree}`, user?.id, { statut: 'success' });
    try { await apiLogout(); } catch {}
    setUser(null);
    setSessionStart(null);
    localStorage.removeItem('fx_token');
    localStorage.removeItem('fx_user');
    toast.info(t.logoutSuccess);
  };

  // ── Traitement des transactions → API ──
  const handleTransaction = async (tx) => {
    try {
      // Validation locale rapide
      const usdtStock = data.devises.find(d => d.devise === 'USDT');
      if (tx.type === 'vente' && usdtStock && tx.usdtConsomme > usdtStock.quantite) {
        toast.error(t.insufficientStock + ' (USDT)'); return;
      }
      if ((tx.type === 'depense' || tx.type === 'retrait') && tx.montant > data.caisse) {
        toast.error(t.insufficientCaisse); return;
      }

      // Construire payload API
      let payload = {};
      if (tx.type === 'restock') {
        payload = { type: 'versement', montant: tx.montant };
      } else if (tx.type === 'vente') {
        payload = {
          type: 'vente',
          devise_vente: tx.deviseVente,
          taux_conversion: tx.tauxConversion,
          quantite_vente: tx.quantiteDevise,
          taux_vente_visible: tx.tauxVisible,
          pct_porteur: tx.porteurPct || 70,
          pct_associe: tx.associePct || 30,
          client: tx.client,
          taux_vente_cache: tx.tauxCache || null,
          statut: tx.statut || 'porteur_pending',
        };
      } else if (tx.type === 'achat') {
        payload = {
          type: 'achat',
          quantite: tx.quantite,
          taux_unitaire: tx.taux,
          use_caisse: tx.sourceCompte === 'caisse',
          fournisseur: tx.fournisseur || null,
        };
      } else if (tx.type === 'depense') {
        payload = { type: 'depense', montant: tx.montant, categorie: tx.categorie, description: tx.description };
      } else if (tx.type === 'retrait') {
        payload = { type: 'retrait', montant: tx.montant, beneficiaire: tx.beneficiaire };
      }

      await apiCreateTransaction(payload);
      await loadDataFromAPI(); // Recharger tout depuis la DB

      const msgs = {
        restock: t.transferSuccess,
        vente: langue === 'fr' ? 'Vente enregistrée !' : 'Sale recorded!',
        achat: t.purchaseSuccess,
        depense: t.expenseSuccess,
        retrait: t.withdrawalSuccess,
      };
      addLog(tx.type || 'vente', `${(tx.type||'').toUpperCase()} enregistré`, user.id);
      toast.success(msgs[tx.type] || 'Enregistré !');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Finalisation d'une vente (porteur) → API ──
  const handleFinalize = async (txId, hiddenData) => {
    try {
      await apiFinaliserVente(txId, hiddenData);
      await loadDataFromAPI();
      addLog('finalisation', `Vente finalisée — Transaction ${txId}`, user?.id, { opId: txId });
      toast.success(t.finaliserSuccess);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Édition d'une transaction → API + recalcul chaîne locale ──
  const handleEditTransaction = async (txId, changes) => {
    const tx = data.transactions.find(t => t.id === txId);
    if (!tx) return;

    // Recalcul chaîne stock (validation locale avant d'envoyer à l'API)
    const allTx = data.transactions.map(row => row.id === txId ? { ...row, ...changes } : row);
    const sorted = [...allTx].sort((a, b) => new Date(a.date) - new Date(b.date));
    let stockCourant = 0;
    let cmupCourant  = 0;
    const rebuilt = sorted.map(row => {
      if (row.type === 'achat' && row.devise === 'USDT') {
        const qte = row.quantite || 0;
        const prixTotal = row.montant || 0;
        if (qte > 0) {
          const totalValeur = (stockCourant * cmupCourant) + prixTotal;
          const totalQte = stockCourant + qte;
          cmupCourant = totalQte > 0 ? totalValeur / totalQte : cmupCourant;
        }
        const avant = stockCourant;
        stockCourant = avant + qte;
        return { ...row, stockUsdt_avant: avant, stockUsdt_apres: stockCourant };
      } else if (row.type === 'vente') {
        const usdtConso = row.usdtConsomme || 0;
        const avant = stockCourant;
        stockCourant = Math.max(0, stockCourant - usdtConso);
        return { ...row, stockUsdt_avant: avant, stockUsdt_apres: stockCourant };
      }
      return row;
    });

    const negatif = rebuilt.find(t => t.stockUsdt_apres !== undefined && t.stockUsdt_apres < -0.000001);
    if (negatif) {
      toast.error(`${t.stockNegatif} ${format(new Date(negatif.date), 'dd/MM/yyyy HH:mm')} (${negatif.stockUsdt_apres?.toFixed(4)} USDT)`);
      return;
    }

    try {
      await apiEditTransaction(txId, changes);
      await loadDataFromAPI();
      addLog('edition', `Transaction modifiée : ${txId}`, user?.id, { opId: txId });
      toast.success(langue === 'fr' ? 'Modifié ✓' : 'Updated ✓');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateProfitShare = async (newShare) => {
    try {
      await apiUpdateProfitShare(newShare.porteur, newShare.associe);
      setProfitShare(newShare);
      addLog('settings', `Répartition modifiée : Porteur ${profitShare.porteur}% → ${newShare.porteur}%`, user?.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Mise à jour manuelle du CMUP → API ──
  const handleCmupUpdate = async (devise, newCmup) => {
    if (!isFinite(newCmup) || newCmup <= 0) { toast.error(t.allFieldsRequired); return; }
    try {
      await apiUpdateCmup(devise, newCmup);
      await loadDataFromAPI();
      addLog('cmup', `CMUP ${devise} ajusté → ${newCmup.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} XAF`, user?.id);
      toast.success(t.cmupUpdated);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading && !user) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: dark ? '#0f1117' : '#f8f9fa' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚡</div>
        <div style={{ fontSize:14, color: dark ? '#9ca3af' : '#6b7280' }}>Connexion à la base de données…</div>
      </div>
    </div>
  );

  if (!user) return (
    <>
      <Toaster position="top-right" richColors duration={2500} />
      <LoginScreen onLogin={handleLogin} onRegister={handleRegister} langue={langue} setLangue={setLangue} dark={dark} setDark={setDark} t={t} />
    </>
  );

  return (
    <HiddenDataContext.Provider value={{ hiddenUnlocked, setHiddenUnlocked }}>
      <>
        <Toaster position="top-right" richColors duration={2500} />
        <Dashboard
          user={user} data={data} profitShare={profitShare}
          onLogout={handleLogout}
          onTransaction={handleTransaction}
          onUpdateProfitShare={handleUpdateProfitShare}
          onFinalize={handleFinalize}
          onEditTransaction={handleEditTransaction}
          onCmupUpdate={handleCmupUpdate}
          t={t} langue={langue} setLangue={setLangue} dark={dark} setDark={setDark} logs={logs} addLog={addLog}
        />
      </>
    </HiddenDataContext.Provider>
  );
}
