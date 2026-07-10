'use client';

import { useState, useEffect } from 'react';

interface Veiculo {
  id: string;
  tipo: string;
  identificador: string;
  local: string;
  status: string;
}

export default function TransportePage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ tipo: 'Ambulância UTI', identificador: '', local: 'Base Central', status: 'DISPONÍVEL' });

  const fetchVeiculos = () => {
    fetch('/api/transporte')
      .then(res => res.json())
      .then(data => { setVeiculos(data); setLoading(false); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchVeiculos();
  }, []);

  const registrarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/transporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setModalAberto(false);
        setForm({ tipo: 'Ambulância UTI', identificador: '', local: 'Base Central', status: 'DISPONÍVEL' });
        fetchVeiculos();
        alert('Veículo registrado com sucesso!');
      }
    } catch (e) {
      alert('Erro ao registrar.');
    }
  };

  const emUso = veiculos.filter(v => v.status === 'EM ROTA').length;
  const disponiveis = veiculos.filter(v => v.status === 'DISPONÍVEL').length;

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-ambulance"></i> Frota e Transporte</h2>
          <p>Controle de ambulâncias e veículos logísticos</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" style={{ background: '#f97316' }} onClick={() => setModalAberto(true)}>
            <i className="las la-plus"></i> Novo Veículo
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #f97316' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>VEÍCULOS EM ROTA</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{emUso}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>VEÍCULOS DISPONÍVEIS</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{disponiveis}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>EM MANUTENÇÃO</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{veiculos.filter(v => v.status === 'MANUTENÇÃO').length}</div>
        </div>
      </div>

      <div className="card">
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Placa / ID</th>
                <th>Tipo</th>
                <th>Localização Atual</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:20}}>Carregando...</td></tr>
              ) : veiculos.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:20}}>Nenhum veículo registrado.</td></tr>
              ) : (
                veiculos.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{v.identificador}</td>
                    <td>{v.tipo}</td>
                    <td style={{ color: '#475569' }}>{v.local}</td>
                    <td>
                      <span className="status-badge" style={{ 
                        background: v.status === 'DISPONÍVEL' ? '#ecfdf5' : v.status === 'EM ROTA' ? '#fff7ed' : '#fef2f2', 
                        color: v.status === 'DISPONÍVEL' ? '#10b981' : v.status === 'EM ROTA' ? '#f97316' : '#ef4444' 
                      }}>
                        {v.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-primary" style={{ background: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 12px' }}>
                        Atualizar Local
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
            <h3 style={{ marginBottom: '20px' }}>Adicionar Veículo</h3>
            <form onSubmit={registrarVeiculo} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Placa/ID do Veículo</label>
                <input required className="input-field" value={form.identificador} onChange={e => setForm({...form, identificador: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: ABC-1234" />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Tipo de Veículo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{ width: '100%', padding: '10px' }}>
                  <option>Ambulância Básica</option>
                  <option>Ambulância UTI</option>
                  <option>Veículo Administrativo</option>
                  <option>Moto Expresso</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Local Base</label>
                <input required className="input-field" value={form.local} onChange={e => setForm({...form, local: e.target.value})} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Status Inicial</label>
                <select className="input-field" value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ width: '100%', padding: '10px' }}>
                  <option>DISPONÍVEL</option>
                  <option>EM ROTA</option>
                  <option>MANUTENÇÃO</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px', background: '#f97316' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
