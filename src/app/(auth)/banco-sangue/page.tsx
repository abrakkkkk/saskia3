'use client';

import { useState, useEffect } from 'react';

interface Bolsa {
  id: string;
  tipo: string;
  quantidade: number;
  status: string;
}

export default function BancoSanguePage() {
  const [estoque, setEstoque] = useState<Bolsa[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ tipo: 'O-', quantidade: '' });

  const fetchEstoque = () => {
    fetch('/api/banco-sangue')
      .then(res => res.json())
      .then(data => { setEstoque(data); setLoading(false); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchEstoque();
  }, []);

  const darEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/banco-sangue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setModalAberto(false);
        setForm({ tipo: 'O-', quantidade: '' });
        fetchEstoque();
        alert('Entrada de bolsas registrada!');
      }
    } catch (e) {
      alert('Erro ao registrar.');
    }
  };

  const totalBolsas = estoque.reduce((acc, curr) => acc + curr.quantidade, 0);
  const criticos = estoque.filter(e => e.status === 'CRÍTICO').length;

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-tint"></i> Banco de Sangue / Agência Transfusional</h2>
          <p>Gestão de bolsas de sangue, hemocomponentes e transfusões</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary"  onClick={() => setModalAberto(true)}>
            <i className="las la-plus"></i> Entrada de Bolsas
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>TOTAL DE BOLSAS</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{totalBolsas}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>TIPOS EM NÍVEL CRÍTICO</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{criticos}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>REQUISIÇÕES DE TRANSFUSÃO</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>0</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Níveis de Estoque por Tipo Sanguíneo</h3>
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Tipo Sanguíneo / Fator RH</th>
                <th>Quantidade em Estoque</th>
                <th>Status do Estoque</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{textAlign:'center', padding:20}}>Carregando...</td></tr>
              ) : estoque.length === 0 ? (
                <tr><td colSpan={4} style={{textAlign:'center', padding:20}}>Nenhum registro no banco de sangue.</td></tr>
              ) : (
                estoque.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, border: '1px solid #fca5a5' }}>
                        {e.tipo}
                      </div>
                    </td>
                    <td style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{e.quantidade} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>bolsas</span></td>
                    <td>
                      <span className="status-badge" style={{ 
                        background: e.status === 'NORMAL' ? '#ecfdf5' : '#fef2f2', 
                        color: e.status === 'NORMAL' ? '#10b981' : '#ef4444' 
                      }}>
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-primary" style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 12px' }}>
                        <i className="las la-minus"></i> Baixa (Transfusão)
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
            <h3 style={{ marginBottom: '20px' }}>Entrada de Bolsas</h3>
            <form onSubmit={darEntrada} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Tipo Sanguíneo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{ width: '100%', padding: '10px' }}>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Quantidade de Bolsas</label>
                <input required type="number" min="1" className="input-field" value={form.quantidade} onChange={e => setForm({...form, quantidade: e.target.value})} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" >Registrar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
