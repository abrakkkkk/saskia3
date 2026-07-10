'use client';

import { useState, useEffect } from 'react';

interface UtiLeito {
  id: string;
  numero: number;
  tipo: string;
  status: string;
  pacienteNome: string | null;
  pacienteCpf: string | null;
}

export default function UtiPage() {
  const [leitos, setLeitos] = useState<UtiLeito[]>([]);
  const [loading, setLoading] = useState(true);

  // States for adding a new bed
  const [showNovoLeito, setShowNovoLeito] = useState(false);
  const [novoNumero, setNovoNumero] = useState('');
  const [novoTipo, setNovoTipo] = useState('ADULTO');

  const carregarDados = () => {
    setLoading(true);
    fetch('/api/uti')
      .then(res => res.json())
      .then(data => {
        setLeitos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const criarLeito = async () => {
    if (!novoNumero) return;
    try {
      const res = await fetch('/api/uti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: novoNumero,
          tipo: novoTipo
        })
      });

      if (res.ok) {
        setNovoNumero('');
        setShowNovoLeito(false);
        carregarDados();
      } else {
        alert('Erro ao criar leito.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVRE': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', icone: 'la-check-circle' };
      case 'OCUPADO': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', icone: 'la-user-injured' };
      case 'RESERVADO': return { bg: '#fef9c3', text: '#854d0e', border: '#fef08a', icone: 'la-clock' };
      case 'LIMPEZA': return { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa', icone: 'la-broom' };
      case 'MANUTENCAO': return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', icone: 'la-tools' };
      default: return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', icone: 'la-bed' };
    }
  };

  const atualizarStatusFake = (id: string) => {
    const steps = ['LIVRE', 'OCUPADO', 'LIMPEZA', 'LIVRE'];
    setLeitos(prev => prev.map(l => {
      if (l.id === id) {
        const nextIdx = steps.indexOf(l.status) + 1;
        const newStatus = nextIdx >= steps.length ? 'LIVRE' : steps[nextIdx];
        return { ...l, status: newStatus };
      }
      return l;
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-procedures"></i> Gestão de Leitos (UTI)</h2>
          <p>Visão de ocupação em tempo real</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowNovoLeito(!showNovoLeito)}>
            <i className="las la-plus"></i> Novo Leito
          </button>
        </div>
      </div>

      {showNovoLeito && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px', background: '#f8fafc' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Cadastrar Novo Leito Físico</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Número do Leito</label>
              <input type="number" className="input-field" placeholder="Ex: 101" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={novoNumero} onChange={(e) => setNovoNumero(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Tipo</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}>
                <option value="ADULTO">Adulto</option>
                <option value="PEDIATRICO">Pediátrico</option>
                <option value="NEONATAL">Neonatal</option>
              </select>
            </div>
            <button className="btn-primary" style={{ padding: '10px 20px', height: '42px' }} onClick={criarLeito}>
              Salvar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Carregando mapa de leitos...</p>
      ) : leitos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <i className="las la-bed" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '15px' }}></i>
          <h3 style={{ color: '#475569' }}>Nenhum leito cadastrado</h3>
          <p style={{ color: '#94a3b8' }}>Clique em "Novo Leito" para começar a mapear a UTI.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {leitos.map(leito => {
            const cores = getStatusColor(leito.status);
            return (
              <div key={leito.id} style={{ 
                background: cores.bg, 
                border: `1px solid ${cores.border}`, 
                borderRadius: '12px', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                transition: 'all 0.3s',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: cores.text }}>
                    {String(leito.numero).padStart(2, '0')}
                  </div>
                  <div style={{ 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    background: 'rgba(255,255,255,0.5)',
                    color: cores.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <i className={`las ${cores.icone}`}></i> {leito.status}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: cores.text, opacity: 0.7, textTransform: 'uppercase' }}>
                    UTI {leito.tipo}
                  </div>
                  {leito.status === 'OCUPADO' ? (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontWeight: 700, color: cores.text, fontSize: '15px' }}>{leito.pacienteNome || 'Paciente Teste'}</div>
                      <div style={{ fontSize: '12px', color: cores.text, opacity: 0.8 }}>CPF: {leito.pacienteCpf || '***.***.***-**'}</div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: cores.text, opacity: 0.8 }}>
                      Leito disponível
                    </div>
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${cores.border}`, paddingTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
                  <button 
                    onClick={() => atualizarStatusFake(leito.id)}
                    style={{ 
                      background: 'rgba(255,255,255,0.4)', 
                      border: 'none', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: cores.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.7)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                  >
                    <i className="las la-sync-alt"></i> Alterar Status
                  </button>
                  <button style={{ background: 'none', border: 'none', color: cores.text, cursor: 'pointer', fontSize: '20px', opacity: 0.6 }}>
                    <i className="las la-cog"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
