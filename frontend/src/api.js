// ============================================================
// FOREXIUM v8.0.0 — Service API (Frontend → Backend)
// Tous les paiements passent par /api/accounts/...
// (centralisés dans la table `transactions` avec
//  type='payement_client' / type='payement_fournisseur')
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('fx_token');
const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});
const handle = async (res) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || `Erreur ${res.status}`);
  return json;
};

// ── AUTH ─────────────────────────────────────────────────────
export const apiLogin = async (email, password) => handle(await fetch(`${BASE_URL}/auth/login`, { method:'POST', headers:headers(), body:JSON.stringify({email,password}) }));
export const apiLogout = async () => handle(await fetch(`${BASE_URL}/auth/logout`, { method:'POST', headers:headers() }));
export const apiRegister = async (name, email, password, role) => handle(await fetch(`${BASE_URL}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,password,role}) }));
export const apiCheckSlots = async () => handle(await fetch(`${BASE_URL}/auth/slots`));

// ── DATA ─────────────────────────────────────────────────────
export const apiLoadAll = async () => {
  const [c,t,s,se,r] = await Promise.all([
    fetch(`${BASE_URL}/stats/comptes`,{headers:headers()}),
    fetch(`${BASE_URL}/transactions?limit=500`,{headers:headers()}),
    fetch(`${BASE_URL}/stock`,{headers:headers()}),
    fetch(`${BASE_URL}/settings`,{headers:headers()}),
    fetch(`${BASE_URL}/stats/repartition`,{headers:headers()}),
  ]);
  const [comptes,txData,stock,settings,repartition] = await Promise.all([c,t,s,se,r].map(handle));
  return {comptes,txData,stock,settings,repartition};
};

// ── TRANSACTIONS ─────────────────────────────────────────────
export const apiCreateTransaction = async (payload) => handle(await fetch(`${BASE_URL}/transactions`, { method:'POST', headers:headers(), body:JSON.stringify(payload) }));
export const apiFinaliserVente = async (txId, d) => handle(await fetch(`${BASE_URL}/transactions/${txId}/finaliser`, { method:'PUT', headers:headers(), body:JSON.stringify({taux_vente_cache:d.tauxCache,pct_porteur:d.porteurPctC,pct_associe:d.associePctC}) }));
export const apiEditTransaction = async (txId, changes) => handle(await fetch(`${BASE_URL}/transactions/${txId}`, { method:'PUT', headers:headers(), body:JSON.stringify(changes) }));
export const apiValiderAssoc = async (txId) => handle(await fetch(`${BASE_URL}/transactions/${txId}/valider-assoc`, { method:'PUT', headers:headers() }));
export const apiValiderTransaction = async (txId, paymentStatus, montantPaye=null) => handle(await fetch(`${BASE_URL}/transactions/${txId}/valider`, { method:'PUT', headers:headers(), body:JSON.stringify({payment_status:paymentStatus,...(montantPaye!==null&&{montant_paye:montantPaye})}) }));

// ── STOCK ────────────────────────────────────────────────────
export const apiUpdateCmup = async (devise, newCmup) => handle(await fetch(`${BASE_URL}/stock/cmup`, { method:'PUT', headers:headers(), body:JSON.stringify({devise,cmup:newCmup}) }));

// ── SETTINGS ─────────────────────────────────────────────────
export const apiUpdateSetting = async (key, valeur) => handle(await fetch(`${BASE_URL}/settings/${key}`, { method:'PUT', headers:headers(), body:JSON.stringify({valeur}) }));
export const apiUpdateProfitShare = async (porteur, associe) => Promise.all([apiUpdateSetting('profit_share_porteur',String(porteur)),apiUpdateSetting('profit_share_associe',String(associe))]);

// ── CLIENTS ──────────────────────────────────────────────────
export const apiGetClients = async () => handle(await fetch(`${BASE_URL}/accounts/clients`, {headers:headers()}));

export const apiCreateClient = async (nom, telephone, adresse, prenom='') =>
  handle(await fetch(`${BASE_URL}/accounts/clients`, {
    method:'POST', headers:headers(),
    body:JSON.stringify({nom, prenom, telephone, adresse}),
  }));

export const apiUpdateClient = async (clientId, data) =>
  handle(await fetch(`${BASE_URL}/accounts/clients/${clientId}`, {
    method:'PUT', headers:headers(), body:JSON.stringify(data),
  }));

export const apiDeleteClient = async (clientId) =>
  handle(await fetch(`${BASE_URL}/accounts/clients/${clientId}`, {method:'DELETE', headers:headers()}));

/**
 * Extrait de compte d'un client (depuis la table transactions, type='payement_client')
 * Retourne: { extrait, transactions, daily, totals: { total_a_payer, total_paye, reste, nb_paiements } }
 * Optionnel: filtres date_debut / date_fin (YYYY-MM-DD)
 */
export const apiGetClientExtrait = async (clientId, dateDebut=null, dateFin=null) => {
  const qs = new URLSearchParams();
  if (dateDebut) qs.append('date_debut', dateDebut);
  if (dateFin)   qs.append('date_fin',   dateFin);
  const url = `${BASE_URL}/accounts/extrait/clients/${clientId}${qs.toString() ? `?${qs}` : ''}`;
  return handle(await fetch(url, { headers: headers() }));
};

/**
 * Enregistre un paiement client en tant que TRANSACTION (type='payement_client')
 *  - montant_a_payer : ce que le client devait régler
 *  - montant_paye    : ce qu'il a effectivement payé
 *  - mode_paiement   : 'xaf' ou 'usdt'
 * Le reste (= a_payer - paye) est calculé côté serveur, pas stocké séparément.
 */
export const apiPayClient = async (clientId, { montant_a_payer, montant_paye, mode_paiement='xaf', notes=null, date=null }) =>
  handle(await fetch(`${BASE_URL}/accounts/clients/${clientId}/payment`, {
    method:'POST',
    headers:headers(),
    body:JSON.stringify({
      montant_a_payer,
      montant_paye,
      mode_paiement: (mode_paiement || 'xaf').toLowerCase(),
      notes,
      date,
    }),
  }));

// ── FOURNISSEURS ─────────────────────────────────────────────
export const apiGetFournisseurs = async () => handle(await fetch(`${BASE_URL}/accounts/fournisseurs`, {headers:headers()}));

export const apiCreateFournisseur = async (nom, telephone, adresse, prenom='') =>
  handle(await fetch(`${BASE_URL}/accounts/fournisseurs`, {
    method:'POST', headers:headers(),
    body:JSON.stringify({nom, prenom, telephone, adresse}),
  }));

export const apiUpdateFournisseur = async (fournisseurId, data) =>
  handle(await fetch(`${BASE_URL}/accounts/fournisseurs/${fournisseurId}`, {
    method:'PUT', headers:headers(), body:JSON.stringify(data),
  }));

export const apiDeleteFournisseur = async (fournisseurId) =>
  handle(await fetch(`${BASE_URL}/accounts/fournisseurs/${fournisseurId}`, {method:'DELETE', headers:headers()}));

/**
 * Paiement fournisseur "rapide" (depuis carte fournisseur — sans détail à payer)
 * mode = 'xaf' | 'usdt' ; montant = nombre
 * Utilise l'ancien format (rétro-compatible côté backend).
 */
export const apiFournisseurPayment = async (fournisseurId, mode, montant) =>
  handle(await fetch(`${BASE_URL}/accounts/fournisseurs/${fournisseurId}/payment`, {
    method:'POST', headers:headers(),
    body:JSON.stringify({ mode_paiement: (mode||'xaf').toLowerCase(), montant_a_payer: montant, montant_paye: montant }),
  }));

/**
 * Extrait de compte d'un fournisseur (type='payement_fournisseur')
 * Retourne: { extrait, transactions, daily, totals: { total_a_payer, total_paye, reste, nb_paiements } }
 */
export const apiGetFournisseurExtrait = async (fournisseurId, dateDebut=null, dateFin=null) => {
  const qs = new URLSearchParams();
  if (dateDebut) qs.append('date_debut', dateDebut);
  if (dateFin)   qs.append('date_fin',   dateFin);
  const url = `${BASE_URL}/accounts/extrait/fournisseurs/${fournisseurId}${qs.toString() ? `?${qs}` : ''}`;
  return handle(await fetch(url, { headers: headers() }));
};

/**
 * Enregistre un paiement fournisseur en tant que TRANSACTION (type='payement_fournisseur')
 */
export const apiPayFournisseur = async (fournisseurId, { montant_a_payer, montant_paye, mode_paiement='xaf', notes=null, date=null }) =>
  handle(await fetch(`${BASE_URL}/accounts/fournisseurs/${fournisseurId}/payment`, {
    method:'POST',
    headers:headers(),
    body:JSON.stringify({
      montant_a_payer,
      montant_paye,
      mode_paiement: (mode_paiement || 'xaf').toLowerCase(),
      notes,
      date,
    }),
  }));

// ── DEVISES ──────────────────────────────────────────────────
export const apiGetDevises = async () => handle(await fetch(`${BASE_URL}/devises`, {headers:headers()}));
export const apiCreateDevise = async (code, nom, taux_conversion, description) => handle(await fetch(`${BASE_URL}/devises`, {method:'POST', headers:headers(), body:JSON.stringify({code,nom,taux_conversion,description})}));
export const apiUpdateDevise = async (deviseId, data) => handle(await fetch(`${BASE_URL}/devises/${deviseId}`, {method:'PUT', headers:headers(), body:JSON.stringify(data)}));
export const apiDeleteDevise = async (deviseId) => handle(await fetch(`${BASE_URL}/devises/${deviseId}`, {method:'DELETE', headers:headers()}));

// ── DISTRIBUTION ─────────────────────────────────────────────
export const apiGetDistributionDetails = async () => handle(await fetch(`${BASE_URL}/stats/distribution-details`, {headers:headers()}));
export const apiToggleDistribution = async () => handle(await fetch(`${BASE_URL}/stats/toggle-distribution`, {method:'POST', headers:headers()}));

// ── RESET DONNÉES ─────────────────────────────────────────────
export const apiResetData = async () =>
  handle(await fetch(`${BASE_URL}/settings/reset-data`, { method:'POST', headers:headers() }));
