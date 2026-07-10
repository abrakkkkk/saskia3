'use client';

import { useState, useEffect } from 'react';

interface Operadora {
  id: string;
  nome: string;
  codigoAns: string;
  vigencia: string;
  status: string;
  teto: string;
}

export default function PlanosPage() {
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', codigoAns: '', vigencia: '', status: 'ATIVO', teto: '' });

  const fetchOperadoras = () => {
    fetch('/api/planos')
      .then(res => res.json())
      .then(data => { setOperadoras(data); setLoading(false); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchOperadoras();
  }, []);

  const registrarOperadora = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/planos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setModalAberto(false);
        setForm({ nome: '', codigoAns: '', vigencia: '', status: 'ATIVO', teto: '' });
        fetchOperadoras();
        alert('Operadora cadastrada com sucesso!');
      }
    } catch (e) {
      alert('Erro ao cadastrar.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-hand-holding-medical"></i> Planos e Operadoras</h2>
          <p>Gestão de convênios, credenciamento e faturamento ANS</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" style={{ background: '#3b82f6' }} onClick={() => setModalAberto(true)}>
            <i className="las la-plus"></i> Nova Operadora
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>OPERADORAS ATIVAS</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{operadoras.filter(o => o.status === 'ATIVO').length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>EM RENOVAÇÃO</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{operadoras.filter(o => o.status === 'EM RENOVAÇÃO').length}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Operadoras Credenciadas</h3>
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Operadora</th>
                <th>Registro ANS</th>
                <th>Vigência do Contrato</th>
                <th>Teto Mensal</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign:'center', padding:20}}>Carregando...</td></tr>
              ) : operadoras.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center', padding:20}}>Nenhuma operadora cadastrada.</td></tr>
              ) : (
                operadoras.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{o.nome}</td>
                    <td style={{ color: '#475569' }}>{o.codigoAns}</td>
                    <td>{o.vigencia}</td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{o.teto}</td>
                    <td>
                      <span className="status-badge" style={{ 
                        background: o.status === 'ATIVO' ? '#ecfdf5' : o.status === 'SUSPENSO' ? '#fef2f2' : '#fff7ed', 
                        color: o.status === 'ATIVO' ? '#10b981' : o.status === 'SUSPENSO' ? '#ef4444' : '#f59e0b' 
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-primary" style={{ background: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 12px' }}>
                        Tabela de Preços
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '20px' }}>Cadastrar Operadora</h3>
            <form onSubmit={registrarOperadora} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Nome da Operadora</label>
                <input required className="input-field" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: Bradesco Saúde, Unimed..." />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Registro ANS</label>
                <input required className="input-field" value={form.codigoAns} onChange={e => setForm({...form, codigoAns: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: 005711" />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Data de Vigência</label>
                <input required type="date" className="input-field" value={form.vigencia} onChange={e => setForm({...form, vigencia: e.target.value})} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Teto Financeiro Mensal (R$)</label>
                <input required className="input-field" value={form.teto} onChange={e => setForm({...form, teto: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: 50.000,00" />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Status</label>
                <select className="input-field" value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ width: '100%', padding: '10px' }}>
                  <option>ATIVO</option>
                  <option>EM RENOVAÇÃO</option>
                  <option>SUSPENSO</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px', background: '#3b82f6' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
