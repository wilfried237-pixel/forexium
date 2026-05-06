// ============================================================
// Composant React pour PAIEMENTS FOURNISSEURS
// À intégrer dans App.jsx
// ============================================================

/**
 * COMPOSANT 1 : Affichage de l'extrait de compte fournisseur
 * Affiche toutes les transactions d'achat et l'historique des paiements
 */
export function FournisseurPaymentAccount({ fournisseurId, token, onClose }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDevise, setPaymentDevise] = useState('XAF');

  useEffect(() => {
    loadFournisseurAccount();
  }, [fournisseurId]);

  const loadFournisseurAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/payments/fournisseurs/${fournisseurId}/account`,
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
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Montant invalide');
      return;
    }

    // Si paiement lié à une transaction et devise différente, demander conversion
    if (selectedTx && paymentDevise && selectedTx.devise && paymentDevise !== (selectedTx.devise || 'XAF')) {
      alert('La devise du paiement diffère de celle de la transaction. Veuillez convertir le montant avant d\'enregistrer ou effectuer le paiement sans lier la transaction.');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/payments/fournisseurs/${fournisseurId}/pay`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            montant: parseFloat(paymentAmount),
            devise: paymentDevise,
            transaction_id: selectedTx?.id || null,
          }),
        }
      );

      if (response.ok) {
        alert('Paiement enregistré !');
        setPaymentAmount('');
        setSelectedTx(null);
        loadFournisseurAccount(); // Recharger les données
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
    <div style={{ padding: 20, maxWidth: 1000 }}>
      {/* En-tête Fournisseur */}
      <div style={{ marginBottom: 30, borderBottom: '2px solid #E5E7EB', paddingBottom: 15 }}>
        <h2>{account.fournisseur.nom}</h2>
        <div style={{ fontSize: 13, color: '#666', marginTop: 5 }}>
          {account.fournisseur.numero} • {account.fournisseur.telephone}
        </div>
      </div>

      {/* Soldes actuels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 15,
        marginBottom: 30,
      }}>
        <div style={{ padding: 15, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Solde XAF</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>
            {Math.round(account.totals.solde_xaf).toLocaleString('fr-FR')} XAF
          </div>
        </div>
        <div style={{ padding: 15, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Solde USDT</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937' }}>
            {parseFloat(account.totals.solde_usdt).toFixed(2)} USDT
          </div>
        </div>
        <div style={{ padding: 15, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#991B1B', marginBottom: 8 }}>Dette USDT</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#7F1D1D' }}>
            {parseFloat(account.totals.dette_usdt).toFixed(2)} USDT
          </div>
        </div>
      </div>

      {/* Totaux */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 15,
        marginBottom: 30,
      }}>
        <div style={{ padding: 15, backgroundColor: '#EFF6FF', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#1E40AF', marginBottom: 8 }}>Total acheté</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1E40AF' }}>
            {Math.round(account.totals.total_achete).toLocaleString('fr-FR')} XAF
          </div>
        </div>
        <div style={{ padding: 15, backgroundColor: '#D1FAE5', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#047857', marginBottom: 8 }}>Total payé</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#065F46' }}>
            {Math.round(account.totals.total_paye).toLocaleString('fr-FR')} XAF
          </div>
        </div>
        <div style={{ padding: 15, backgroundColor: '#FEF3C7', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#D97706', marginBottom: 8 }}>Reste à payer</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#92400E' }}>
            {Math.round(account.totals.total_reste).toLocaleString('fr-FR')} XAF
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
        {/* Transactions d'achat */}
        <div>
          <h3 style={{ marginBottom: 15 }}>Transactions d'achat ({account.transactions?.length || 0})</h3>
          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            {account.transactions && account.transactions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {account.transactions.map((tx) => {
                  const montantTotal = parseFloat(tx.prix_achat_total || 0);
                  const montantPaye = parseFloat(tx.montant_paye || 0);
                  const montantReste = parseFloat(tx.montant_reste || 0) || Math.max(0, montantTotal - montantPaye);

                  return (
                    <div
                      key={tx.id}
                      style={{
                        padding: 12,
                        border: '1px solid #E5E7EB',
                        borderRadius: 6,
                        backgroundColor: selectedTx?.id === tx.id ? '#EFF6FF' : 'white',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedTx(tx)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>{tx.id}</span>
                        <span style={{ fontSize: 11, color: '#666' }}>
                          {new Date(tx.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                        <div>
                          <div style={{ color: '#666', marginBottom: 3 }}>Total</div>
                          <div style={{ fontWeight: 600 }}>
                            {Math.round(montantTotal).toLocaleString('fr-FR')} XAF
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#666', marginBottom: 3 }}>Reste</div>
                          <div style={{
                            fontWeight: 600,
                            color: montantReste > 0 ? '#D97706' : '#047857'
                          }}>
                            {Math.round(montantReste).toLocaleString('fr-FR')} XAF
                          </div>
                        </div>
                      </div>
                      {/* Afficher dernier paiement et liste des paiements pour cette transaction */}
                      {tx.payments && tx.payments.length > 0 && (
                        <div style={{ marginTop: 10, fontSize: 12 }}>
                          <div style={{ color: '#666', marginBottom: 6 }}>Derniers paiements</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {tx.payments.map((p) => (
                              <div key={p.id} style={{ fontSize: 12, color: '#374151' }}>
                                +{Math.round(p.montant).toLocaleString('fr-FR')} {p.devise} — {new Date(p.date_paiement).toLocaleDateString('fr-FR')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#666', fontSize: 12 }}>Aucune transaction</div>
            )}
          </div>
        </div>

        {/* Historique des paiements */}
        <div>
          <h3 style={{ marginBottom: 15 }}>Historique des paiements ({account.paymentHistory?.length || 0})</h3>
          <div style={{ overflowY: 'auto', maxHeight: 400 }}>
            {account.paymentHistory && account.paymentHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {account.paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    style={{
                      padding: 12,
                      border: '1px solid #E5E7EB',
                      borderRadius: 6,
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{
                        fontWeight: 600,
                        fontSize: 12,
                        color: '#047857'
                      }}>
                        + {Math.round(payment.montant).toLocaleString('fr-FR')} {payment.devise}
                      </span>
                      <span style={{ fontSize: 11, color: '#666' }}>
                        {new Date(payment.date_paiement).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {payment.notes && (
                      <div style={{ fontSize: 11, color: '#666' }}>
                        {payment.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#666', fontSize: 12 }}>Aucun paiement enregistré</div>
            )}
          </div>
        </div>
      </div>

      {/* Bouton paiement global */}
      <div style={{
        padding: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        marginBottom: 20,
      }}>
        <button
          onClick={() => setSelectedTx(null)} // Ouverture du modal paiement global
          style={{
            padding: '12px 20px',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          💳 Effectuer un paiement
        </button>
      </div>

      {/* Modal de paiement */}
      {(selectedTx !== undefined) && (
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
          onClick={() => setSelectedTx(undefined)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 30,
              width: 450,
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 20 }}>Paiement au fournisseur</h3>

            {selectedTx && (
              <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#F3F4F6', borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>Transaction liée</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {selectedTx.id}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                  Montant total:{' '}
                  <span style={{ fontWeight: 600 }}>
                    {Math.round(parseFloat(selectedTx.prix_achat_total || 0)).toLocaleString('fr-FR')} XAF
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#D97706', marginTop: 4 }}>
                  Reste à payer:{' '}
                  <span style={{ fontWeight: 600 }}>
                    {Math.round(parseFloat(selectedTx.montant_reste || 0)).toLocaleString('fr-FR')} XAF
                  </span>
                </div>
              </div>
            )}

            <label style={{ display: 'block', marginBottom: 15 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Devise</div>
              <select
                value={paymentDevise}
                onChange={(e) => setPaymentDevise(e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #D1D5DB',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              >
                <option value="XAF">XAF (Franc CFA)</option>
                <option value="USDT">USDT (Tether)</option>
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Montant à payer ({paymentDevise})
              </div>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="ex: 10000"
                min="1"
                step="0.01"
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

            {/* Aperçu dynamique du reste (si transaction liée) */}
            {selectedTx && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
                {(() => {
                  const montantTotal = parseFloat(selectedTx.prix_achat_total || 0);
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
                      {paymentDevise !== (selectedTx.devise || 'XAF') && (
                        <div style={{ color: '#B91C1C', marginTop: 6, fontSize: 12 }}>
                          Attention: la devise du paiement ({paymentDevise}) diffère de la devise de la transaction ({selectedTx.devise || 'XAF'}). Conversion requise.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
              <button
                onClick={() => { setSelectedTx(undefined); setPaymentAmount(''); }}
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
                disabled={!(paymentAmount && parseFloat(paymentAmount) > 0)}
                style={{
                  flex: 1,
                  padding: 10,
                  backgroundColor: paymentAmount && parseFloat(paymentAmount) > 0 ? '#10B981' : '#9CA3AF',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: paymentAmount && parseFloat(paymentAmount) > 0 ? 'pointer' : 'not-allowed',
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
 * COMPOSANT 2 : Mini-affichage du résumé pour un fournisseur
 */
export function FournisseurPaymentSummary({ fournisseurId, token }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/payments/fournisseurs/${fournisseurId}/account`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        setSummary({
          solde_xaf: data.totals.solde_xaf,
          solde_usdt: data.totals.solde_usdt,
          dette_usdt: data.totals.dette_usdt,
          total_achete: data.totals.total_achete,
          total_paye: data.totals.total_paye,
          total_reste: data.totals.total_reste,
        });
      } catch (error) {
        console.error('Erreur:', error);
      }
    };
    loadSummary();
  }, [fournisseurId, token]);

  if (!summary) return <div style={{ padding: 15, color: '#666' }}>Chargement...</div>;

  const percentagePaid = (summary.total_paye / summary.total_achete) * 100 || 0;

  return (
    <div style={{ padding: 15, background: '#F9FAFB', borderRadius: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Résumé fournisseur</div>

      {/* Barre de progression */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            height: 6,
            background: '#E5E7EB',
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 5,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentagePaid}%`,
              background: '#3B82F6',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: '#666' }}>
          {percentagePaid.toFixed(0)}% payé - Reste: {Math.round(summary.total_reste).toLocaleString('fr-FR')} XAF
        </div>
      </div>

      {/* Soldes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        fontSize: 11,
      }}>
        <div>
          <div style={{ color: '#666', marginBottom: 3 }}>Solde XAF</div>
          <div style={{ fontWeight: 600 }}>{Math.round(summary.solde_xaf).toLocaleString('fr-FR')}</div>
        </div>
        <div>
          <div style={{ color: '#666', marginBottom: 3 }}>Solde USDT</div>
          <div style={{ fontWeight: 600 }}>{parseFloat(summary.solde_usdt).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
