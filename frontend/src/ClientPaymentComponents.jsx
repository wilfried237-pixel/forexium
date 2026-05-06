// ============================================================
// Composant React pour PAIEMENTS CLIENTS
// À intégrer dans App.jsx
// ============================================================

/**
 * COMPOSANT 1 : Affichage de l'extrait de compte client détaillé
 * Affiche toutes les transactions avec détails de paiement
 */
export function ClientPaymentAccount({ clientId, token, onClose }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadClientAccount();
  }, [clientId]);

  const loadClientAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/payments/clients/${clientId}/account`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setAccount(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedTx || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Montant invalide');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/payments/clients/${clientId}/transaction/${selectedTx.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            montant_paye: parseFloat(paymentAmount),
            devise_paiement: 'XAF',
          }),
        }
      );

      if (response.ok) {
        alert('Paiement enregistré !');
        setPaymentAmount('');
        setSelectedTx(null);
        loadClientAccount(); // Recharger les données
      } else {
        const error = await response.json();
        alert('Erreur: ' + error.error);
      }
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Chargement...</div>;
  if (!account) return <div style={{ padding: 20 }}>Aucune donnée</div>;

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      {/* En-tête Client */}
      <div style={{ marginBottom: 30, borderBottom: '2px solid #E5E7EB', paddingBottom: 15 }}>
        <h2>{account.client.nom} {account.client.prenom}</h2>
        <div style={{ fontSize: 13, color: '#666', marginTop: 5 }}>
          {account.client.numero} • {account.client.telephone}
        </div>
      </div>

      {/* Totaux */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 15,
        marginBottom: 30,
      }}>
        <div style={{ padding: 15, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Total facturé</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>
            {Math.round(account.totals.total_montant).toLocaleString('fr-FR')} XAF
          </div>
        </div>
        <div style={{ padding: 15, backgroundColor: '#D1FAE5', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#047857', marginBottom: 8 }}>Total payé</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#065F46' }}>
            {Math.round(account.totals.total_montant_paye).toLocaleString('fr-FR')} XAF
          </div>
        </div>
        <div style={{ padding: 15, backgroundColor: '#FEF3C7', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#D97706', marginBottom: 8 }}>Reste à recouvrer</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#92400E' }}>
            {Math.round(account.totals.total_montant_reste).toLocaleString('fr-FR')} XAF
          </div>
        </div>
      </div>

      {/* Liste des transactions */}
      <div style={{ marginBottom: 30 }}>
        <h3 style={{ marginBottom: 15 }}>Transactions ({account.transactions.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB', background: '#F9FAFB' }}>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>
                  Type
                </th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>
                  Date
                </th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                  Montant
                </th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                  Payé
                </th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                  Reste
                </th>
                <th style={{ padding: 12, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {account.transactions.map((tx) => {
                const montantTotal = parseFloat(tx.montant || tx.valeur_vente_visible || 0);
                const montantPaye = parseFloat(tx.montant_paye || 0);
                const montantReste = parseFloat(tx.montant_reste || 0) || Math.max(0, montantTotal - montantPaye);

                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: selectedTx?.id === tx.id ? '#EFF6FF' : 'white',
                    }}
                  >
                    <td style={{ padding: 12, fontSize: 13 }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          backgroundColor: tx.type === 'vente' ? '#DBEAFE' : '#FEE2E2',
                          color: tx.type === 'vente' ? '#1E40AF' : '#991B1B',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {tx.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>
                      {new Date(tx.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: 12, fontSize: 13, textAlign: 'right', fontWeight: 600 }}>
                      {Math.round(montantTotal).toLocaleString('fr-FR')} XAF
                    </td>
                    <td style={{ padding: 12, fontSize: 13, textAlign: 'right', color: '#047857' }}>
                      {Math.round(montantPaye).toLocaleString('fr-FR')} XAF
                    </td>
                    <td
                      style={{
                        padding: 12,
                        fontSize: 13,
                        textAlign: 'right',
                        color: montantReste > 0 ? '#D97706' : '#047857',
                        fontWeight: 600,
                      }}
                    >
                      {montantReste > 0 ? (
                        <span>{Math.round(montantReste).toLocaleString('fr-FR')} XAF</span>
                      ) : (
                        <span style={{ color: '#047857' }}>✓ Payé</span>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {montantReste > 0 && (
                        <button
                          onClick={() => setSelectedTx(tx)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Payer
                        </button>
                      )}
                    </td>
                  </tr>
                  <>
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: selectedTx?.id === tx.id ? '#EFF6FF' : 'white',
                      }}
                    >
                      <td style={{ padding: 12, fontSize: 13 }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            backgroundColor: tx.type === 'vente' ? '#DBEAFE' : '#FEE2E2',
                            color: tx.type === 'vente' ? '#1E40AF' : '#991B1B',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {tx.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: 12, fontSize: 13 }}>
                        {new Date(tx.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: 12, fontSize: 13, textAlign: 'right', fontWeight: 600 }}>
                        {Math.round(montantTotal).toLocaleString('fr-FR')} XAF
                      </td>
                      <td style={{ padding: 12, fontSize: 13, textAlign: 'right', color: '#047857' }}>
                        {Math.round(montantPaye).toLocaleString('fr-FR')} XAF
                      </td>
                      <td
                        style={{
                          padding: 12,
                          fontSize: 13,
                          textAlign: 'right',
                          color: montantReste > 0 ? '#D97706' : '#047857',
                          fontWeight: 600,
                        }}
                      >
                        {montantReste > 0 ? (
                          <span>{Math.round(montantReste).toLocaleString('fr-FR')} XAF</span>
                        ) : (
                          <span style={{ color: '#047857' }}>✓ Payé</span>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedTx(tx)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Payer
                        </button>
                      </td>
                    </tr>

                    {tx.payments && tx.payments.length > 0 && (
                      <tr key={`${tx.id}-payments`} style={{ background: '#FAFAFB' }}>
                        <td colSpan={6} style={{ padding: 10 }}>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Paiements enregistrés</div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {tx.payments.map(p => (
                              <div key={p.id} style={{ padding: 8, background: 'white', border: '1px solid #E5E7EB', borderRadius: 6 }}>
                                <div style={{ fontWeight: 700, color: '#047857' }}>+{Math.round(p.montant).toLocaleString('fr-FR')} {p.devise}</div>
                                <div style={{ fontSize: 11, color: '#666' }}>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</div>
                                {p.notes && <div style={{ fontSize: 11, color: '#666' }}>{p.notes}</div>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de paiement */}
      {selectedTx && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
          onClick={() => setSelectedTx(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 30,
              width: 400,
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 20 }}>Enregistrer un paiement</h3>

            <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#F3F4F6', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Transaction</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {selectedTx.type.toUpperCase()} - {selectedTx.id}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                Montant total:{' '}
                <span style={{ fontWeight: 600 }}>
                  {Math.round(parseFloat(selectedTx.montant || 0)).toLocaleString('fr-FR')} XAF
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#D97706', marginTop: 4 }}>
                Reste à payer:{' '}
                <span style={{ fontWeight: 600 }}>
                  {Math.round(parseFloat(selectedTx.montant_reste || 0)).toLocaleString('fr-FR')} XAF
                </span>
              </div>
            </div>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Montant à payer (XAF)</div>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="ex: 1000"
                min="1"
                max={parseFloat(selectedTx.montant_reste || 0)}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </label>

            {/* Aperçu dynamique du reste après saisie */}
            <div style={{ marginTop: 10, fontSize: 13 }}>
              {(() => {
                const montantTotal = parseFloat(selectedTx.montant || 0);
                const montantPayeActuel = parseFloat(selectedTx.montant_paye || 0) || 0;
                const montantResteActuel = parseFloat(selectedTx.montant_reste || 0) || Math.max(0, montantTotal - montantPayeActuel);
                const montantSaisi = parseFloat(paymentAmount || 0) || 0;
                const resteApres = Math.max(0, montantResteActuel - montantSaisi);
                if (montantSaisi <= 0) return <div style={{ color: '#6B7280' }}>Saisissez un montant pour voir l'aperçu.</div>;
                return (
                  <div>
                    <div style={{ color: montantSaisi > montantResteActuel ? '#B91C1C' : '#374151' }}>
                      Après paiement: <strong>{Math.round(resteApres).toLocaleString('fr-FR')} XAF</strong>
                    </div>
                    {montantSaisi > montantResteActuel && (
                      <div style={{ color: '#B91C1C', marginTop: 6, fontSize: 12 }}>
                        Le montant saisi dépasse le reste à payer ({Math.round(montantResteActuel).toLocaleString('fr-FR')} XAF).
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
              <button
                onClick={() => setSelectedTx(null)}
                style={{
                  flex: 1,
                  padding: 10,
                  backgroundColor: '#E5E7EB',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Annuler
              </button>
              <button
                onClick={handlePayment}
                style={{
                  flex: 1,
                  padding: 10,
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * COMPOSANT 2 : Mini-affichage du résumé de paiement (pour dashboard)
 */
export function ClientPaymentSummary({ clientId, token }) {
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    const loadTotals = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/payments/clients/${clientId}/account`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        setTotals(data.totals);
      } catch (error) {
        console.error('Erreur:', error);
      }
    };
    loadTotals();
  }, [clientId, token]);

  if (!totals)
    return (
      <div style={{ padding: 15, background: '#F3F4F6', borderRadius: 6 }}>
        Chargement...
      </div>
    );

  const percentagePaid = (totals.total_montant_paye / totals.total_montant) * 100 || 0;

  return (
    <div style={{ padding: 15, background: '#F9FAFB', borderRadius: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Récapitulatif</div>
      
      {/* Barre de progression */}
      <div style={{ marginBottom: 15 }}>
        <div
          style={{
            height: 8,
            background: '#E5E7EB',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentagePaid}%`,
              background: '#10B981',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>
          {percentagePaid.toFixed(1)}% payé ({totals.total_montant_paye} / {totals.total_montant} XAF)
        </div>
      </div>

      {/* Détails */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: '#666' }}>Montant total</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {Math.round(totals.total_montant).toLocaleString('fr-FR')} XAF
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#D97706' }}>Reste</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#D97706' }}>
            {Math.round(totals.total_montant_reste).toLocaleString('fr-FR')} XAF
          </div>
        </div>
      </div>
    </div>
  );
}
