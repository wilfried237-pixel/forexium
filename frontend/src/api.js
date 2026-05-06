// ============================================================
// FOREXIUM v5.7.0+ — Service API (Frontend → Backend)
// Tous les paiements sont des transactions de type
//   'payement_client' ou 'payement_fournisseur'
// (les tables payment_history* ont été supprimées)
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

const qs = (obj) => {
  const s = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, v);
  });
  const out = s.toString();
  return out ? `?${out}` : '';
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
//   Le GET /accounts/clients renvoie déjà :
//     total_a_payer  = SUM(montant)      WHERE type='payement_client'
//     total_paye     = SUM(montant_paye) WHERE type='payement_client'
//     reste          = total_a_payer - total_paye
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
 * Extrait de compte d'un client (filtré sur type='payement_client').
 * Renvoie : { extrait, transactions, daily, totals }
 *   - daily   : ventilation par jour { jour, total_a_payer, total_paye, reste }
 *   - totals  : totaux globaux sur la période
 */
export const apiGetClientExtrait = async (clientId, dateDebut=null, dateFin=null) =>
  handle(await fetch(
    `${BASE_URL}/accounts/extrait/clients/${clientId}${qs({date_debut: dateDebut, date_fin: dateFin})}`,
    {headers:headers()}
  ));

/**
 * Enregistre un paiement client : crée une transaction de type 'payement_client'
 *   avec montant=montant_a_payer, montant_paye=montant_paye, reste=montant_a_payer-montant_paye.
 */
export const apiPayClient = async (clientId, montantAPayer, montantPaye, modePaiement='xaf', notes=null) =>
  handle(await fetch(`${BASE_URL}/accounts/clients/${clientId}/payment`, {
    method:'POST', headers:headers(),
    body:JSON.stringify({
      montant_a_payer: montantAPayer,
      montant_paye:    montantPaye,
      mode_paiement:   modePaiement,
      notes,
    }),
  }));

// ── FOURNISSEURS ─────────────────────────────────────────────
//   Mêmes agrégats : total_a_payer / total_paye / reste sur type='payement_fournisseur'.
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
 * Enregistre un paiement fournisseur : crée une transaction de type 'payement_fournisseur'.
 *   - montant      = montant_a_payer
 *   - montant_paye = montant_paye
 *   - mode         = 'xaf' ou 'usdt'
 */
export const apiFournisseurPayment = async (fournisseurId, mode, montantAPayer, montantPaye=null, notes=null) =>
  handle(await fetch(`${BASE_URL}/accounts/fournisseurs/${fournisseurId}/payment`, {
    method:'POST', headers:headers(),
    body:JSON.stringify({
      montant_a_payer: montantAPayer,
      montant_paye:    montantPaye !== null ? montantPaye : montantAPayer,
      mode_paiement:   mode,
      notes,
    }),
  }));

/**
 * Extrait de compte d'un fournisseur (filtré sur type='payement_fournisseur').
 * Renvoie : { extrait, transactions, daily, totals }
 */
export const apiGetFournisseurExtrait = async (fournisseurId, dateDebut=null, dateFin=null) =>
  handle(await fetch(
    `${BASE_URL}/accounts/extrait/fournisseurs/${fournisseurId}${qs({date_debut: dateDebut, date_fin: dateFin})}`,
    {headers:headers()}
  ));

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
