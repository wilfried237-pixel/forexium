# FOREXIUM v5.6.0+ — Guide modifications FRONTEND (en détail)

## 🎯 Modifications à apporter au frontend

### 1. TransactionModal — Ajouter infos client étendues

**Localisation**: `frontend/src/App.jsx` ligne ~1026

**État à ajouter** (dans `TransactionModal`):
```javascript
// Après les autres états, ajouter:
const [clientInfo, setClientInfo] = useState({
  nom: '', prenom: '', telephone: '', 
  ville: '', quartier: '', adresse: ''
});
const [showClientForm, setShowClientForm] = useState(false);
```

**Sync client sélectionné** (effet):
```javascript
React.useEffect(() => {
  if (form.client && form._clientsList) {
    const selected = form._clientsList.find(c => c.nom === form.client);
    if (selected) {
      setClientInfo({
        nom: selected.nom || '',
        prenom: selected.prenom || '',
        telephone: selected.telephone || '',
        ville: selected.ville || '',
        quartier: selected.quartier || '',
        adresse: selected.adresse || ''
      });
    }
  }
}, [form.client, form._clientsList]);
```

**Ajouter après la section "Client dropdown"** (ligne ~1380):
```jsx
{/* NOUVEAU: Infos client détaillées */}
{type === 'vente' && form.client && (
  <div className={`rounded-xl border-2 p-4 ${dark ? 'bg-gray-800 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
    <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${dark ? 'text-white' : 'text-blue-900'}`}>
      <Users className="w-4 h-4" /> {t.clientInfo}
    </h4>
    <div className="grid grid-cols-2 gap-2 text-xs">
      {clientInfo.prenom && (
        <div><span className={dark ? 'text-gray-400' : 'text-gray-600'}>{t.firstName}:</span> <strong>{clientInfo.prenom}</strong></div>
      )}
      {clientInfo.telephone && (
        <div><span className={dark ? 'text-gray-400' : 'text-gray-600'}>{t.phone}:</span> <strong>{clientInfo.telephone}</strong></div>
      )}
      {clientInfo.ville && (
        <div><span className={dark ? 'text-gray-400' : 'text-gray-600'}>{t.city}:</span> <strong>{clientInfo.ville}</strong></div>
      )}
      {clientInfo.quartier && (
        <div><span className={dark ? 'text-gray-400' : 'text-gray-600'}>{t.quarter}:</span> <strong>{clientInfo.quartier}</strong></div>
      )}
    </div>
  </div>
)}
```

---

### 2. Dashboard — Ajouter onglet Clients

**Localisation**: `frontend/src/App.jsx` ligne ~3213 (fonction Dashboard)

**Ajouter état pour clients actif**:
```javascript
const [selectedClient, setSelectedClient] = useState(null);
const [showClientTransactions, setShowClientTransactions] = useState(false);
```

**Ajouter dans la navigation** (tabs):
```javascript
// Trouver où les boutons de navigation sont affichés (activeSection)
// et ajouter un bouton Clients:
<button 
  onClick={() => setActiveSection('clients')}
  className={`px-3 py-2 rounded-lg font-semibold transition-all ${activeSection === 'clients' ? 'bg-accent text-primary' : 'text-gray-600'}`}>
  <Users className="w-4 h-4 inline mr-2" /> {t.clients}
</button>
```

**Ajouter la section Clients** (après Devises):
```jsx
{activeSection === 'clients' && (
  <div className="space-y-4">
    <div className="flex justify-between items-center mb-4">
      <h2 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-primary'}`}>{t.clients}</h2>
      <button 
        onClick={() => setShowFormClient(true)}
        className="px-4 py-2 rounded-lg gradient-gold text-primary hover:shadow-lg transition-all flex items-center gap-2">
        <Plus className="w-4 h-4" /> {t.addCurrency /* ou nouvelle clé */}
      </button>
    </div>

    {/* Tableau clients */}
    <div className={`rounded-lg overflow-x-auto border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
      <table className="w-full text-sm">
        <thead className={dark ? 'bg-gray-800' : 'bg-gray-100'}>
          <tr>
            <th className="px-4 py-2 text-left font-semibold">{t.lastName}</th>
            <th className="px-4 py-2 text-left font-semibold">{t.firstName}</th>
            <th className="px-4 py-2 text-left font-semibold">{t.city}</th>
            <th className="px-4 py-2 text-left font-semibold">{t.quarter}</th>
            <th className="px-4 py-2 text-left font-semibold">{t.phone}</th>
            <th className="px-4 py-2 text-right font-semibold">{t.soldeActuel}</th>
            <th className="px-4 py-2 text-center font-semibold">{t.transactionHistory}</th>
          </tr>
        </thead>
        <tbody>
          {localClients.map(client => (
            <tr key={client.id} className={`border-t ${dark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}>
              <td className="px-4 py-2 font-semibold">{client.nom}</td>
              <td className="px-4 py-2">{client.prenom || '—'}</td>
              <td className="px-4 py-2">{client.ville || '—'}</td>
              <td className="px-4 py-2">{client.quartier || '—'}</td>
              <td className="px-4 py-2 text-xs font-mono">{client.telephone || '—'}</td>
              <td className="px-4 py-2 text-right font-semibold text-accent">
                {(client.solde || 0).toLocaleString('fr-FR')} XAF
              </td>
              <td className="px-4 py-2 text-center">
                <button 
                  onClick={() => { setSelectedClient(client); setShowClientTransactions(true); }}
                  className="px-2 py-1 rounded text-xs gradient-gold text-primary hover:shadow-md transition-all">
                  📋 {client.nb_transactions || 0}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Modal transactions client */}
    {showClientTransactions && selectedClient && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className={`${bg} rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-xl font-bold ${dark ? 'text-white' : 'text-primary'}`}>
              {t.accountStatement} — {selectedClient.nom} {selectedClient.prenom}
            </h3>
            <button onClick={() => setShowClientTransactions(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Infos client */}
          <div className={`grid grid-cols-2 gap-3 mb-4 p-4 rounded-lg ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div><span className="text-xs text-gray-500">Téléphone:</span> <strong>{selectedClient.telephone || '—'}</strong></div>
            <div><span className="text-xs text-gray-500">Ville:</span> <strong>{selectedClient.ville || '—'}</strong></div>
            <div><span className="text-xs text-gray-500">Quartier:</span> <strong>{selectedClient.quartier || '—'}</strong></div>
            <div><span className="text-xs text-gray-500">Solde:</span> <strong className="text-accent">{(selectedClient.solde || 0).toLocaleString('fr-FR')} XAF</strong></div>
          </div>

          {/* Transactions client - charger depuis /api/accounts/clients/{id}/transactions */}
          <div className={`border-t ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h4 className="font-semibold mt-4 mb-2">{t.transactionHistory}</h4>
            {/* Liste des transactions (à charger et afficher) */}
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

---

### 3. Section Vente — Ajouter boutons paiement visuels

**Localisation**: `frontend/src/App.jsx` (TransactionModal, section VENTE)

**Remplacer les boutons paiement existants** (ligne ~1380):

```jsx
{/* Statut paiement - avec meilleure UI */}
<div className="space-y-2">
  <label className={`block text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
    {t.paymentStatus} — {t.clientAmount} <span className="text-accent font-bold">{valVenteV.toLocaleString('fr-FR')} XAF</span>
  </label>
  
  {/* Trois boutons horizontaux - redesigned */}
  <div className="grid grid-cols-3 gap-2 mb-2">
    {[
      { 
        val: 'paid', 
        label: '✅ ' + (langue==='fr' ? 'Payé' : 'Paid'),
        color: '#10B981', // vert
        bg: 'from-green-50 to-green-100',
        darkBg: 'from-green-900/20 to-green-800/20'
      },
      { 
        val: 'partial', 
        label: '⚡ ' + (langue==='fr' ? 'Partiel' : 'Partial'),
        color: '#F59E0B', // orange
        bg: 'from-amber-50 to-amber-100',
        darkBg: 'from-amber-900/20 to-amber-800/20'
      },
      { 
        val: 'unpaid', 
        label: '❌ ' + (langue==='fr' ? 'Non payé' : 'Unpaid'),
        color: '#EF4444', // rouge
        bg: 'from-red-50 to-red-100',
        darkBg: 'from-red-900/20 to-red-800/20'
      },
    ].map(ps => (
      <button 
        key={ps.val} 
        type="button"
        onClick={() => setForm({ ...form, paymentStatus: ps.val, montantPaye: ps.val === 'paid' ? '' : (form.montantPaye || '') })}
        className={`
          px-2 py-3 rounded-lg font-semibold transition-all border-2
          ${form.paymentStatus === ps.val 
            ? `border-[${ps.color}] bg-gradient-to-b ${dark ? ps.darkBg : ps.bg} text-[${ps.color}] shadow-md scale-105` 
            : `border-transparent ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} hover:bg-gray-200`
          }
        `}
        style={{
          borderColor: form.paymentStatus === ps.val ? ps.color : 'transparent',
          backgroundColor: form.paymentStatus === ps.val 
            ? (dark ? 'rgba(' + ps.color.match(/\d+/g).slice(0,3).join(',') + ', 0.1)' : ps.color + '20')
            : (dark ? '#374151' : '#f3f4f6'),
          color: form.paymentStatus === ps.val ? ps.color : (dark ? '#d1d5db' : '#4b5563'),
        }}
      >
        {ps.label}
      </button>
    ))}
  </div>

  {/* Champ montant payé - visible seulement si partiel */}
  {form.paymentStatus === 'partial' && (
    <div className={`rounded-lg p-3 ${dark ? 'bg-amber-900/20 border border-amber-600' : 'bg-amber-50 border border-amber-200'}`}>
      <label className={`block text-xs font-semibold mb-1.5 ${dark ? 'text-amber-300' : 'text-amber-800'}`}>
        {t.amountPaid} (XAF) — {t.howMuch}?
      </label>
      <input 
        type="text" 
        inputMode="numeric"
        placeholder={valVenteV.toLocaleString('fr-FR')}
        value={form.montantPaye || ''}
        onChange={e => setForm({ ...form, montantPaye: e.target.value.replace(/[^0-9]/g, '') })}
        className={`
          w-full px-3 py-2 rounded-lg border-2 text-sm outline-none transition-all
          ${dark ? 'border-amber-600 bg-gray-800 text-white placeholder-gray-500' : 'border-amber-400 bg-white placeholder-gray-400'}
          focus:border-amber-500 focus:shadow-lg
        `}
      />
      {form.montantPaye && (
        <div className="mt-2 flex justify-between text-xs font-semibold">
          <span className={dark ? 'text-gray-400' : 'text-gray-600'}>{t.amountDue}:</span>
          <span className={
            (parseInt(form.montantPaye) || 0) > valVenteV 
              ? 'text-purple-500' 
              : 'text-orange-500'
          }>
            {Math.abs((valVenteV - (parseInt(form.montantPaye) || 0))).toLocaleString('fr-FR')} XAF
          </span>
        </div>
      )}
    </div>
  )}
</div>
```

---

## 🎨 CSS à ajouter (optionnel - pour meilleure animation)

Ajouter dans `frontend/src/styles/global.css`:

```css
/* Boutons paiement améliorés */
.payment-button {
  transition: all 0.2s ease-in-out;
}

.payment-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.payment-button.active {
  animation: pulse 0.3s ease-out;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Indicateurs statut */
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-paid { background: #d1fae5; color: #065f46; }
.status-partial { background: #fed7aa; color: #92400e; }
.status-unpaid { background: #fee2e2; color: #991b1b; }
```

---

## 🧪 Tester les modifications

1. **Créer un client** via `POST /api/accounts/clients`
2. **Voir clients** dans le nouvel onglet "Clients"
3. **Créer une vente** et sélectionner le client
4. **Tester les 3 états de paiement** (Payé/Partiel/Non payé)
5. **Valider la transaction** avec `PUT /api/transactions/:id/valider`
6. **Voir l'extrait de compte** du client

---

## ✅ Checklist final

- [ ] Champ `quartier` ajouté à DB et API
- [ ] Endpoint `/valider` créé au backend
- [ ] Traductions FR/EN ajoutées
- [ ] API frontend `apiValiderTransaction` implémentée
- [ ] Onglet Clients créé
- [ ] Infos client visibles dans formulaire vente
- [ ] Boutons paiement redesignés avec UX intuitive
- [ ] État paiement persiste en DB
- [ ] Migration SQL exécutée
- [ ] Tests manuels complétés

---

## 💡 Tips pour une meilleure UX

1. **Code couleur des paiements**:
   - 🟢 Vert = Payé → Peut clôturer
   - 🟡 Jaune = Partiel → À suivre
   - 🔴 Rouge = Non payé → À relancer

2. **Position des boutons**: Bas-droit du formulaire (pas haut)

3. **Montant dû visible**: Afficher en grand "250 000 XAF à payer"

4. **Client cliquable**: Clic sur client → voir son extrait de compte

5. **Notification**: Toast vert quand transaction validée ✅
