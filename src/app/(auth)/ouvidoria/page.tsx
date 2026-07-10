'use client';

import { useState, useEffect } from 'react';

interface Ticket {
  id: string;
  protocolo: string;
  tipo: string;
  setor: string;
  paciente: string;
  mensagem: string;
  status: string;
  prazo: string;
  createdAt: string;
}

export default function OuvidoriaPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ tipo: 'Reclamação', setor: '', paciente: '', mensagem: '' });

  const fetchTickets = () => {
    fetch('/api/ouvidoria')
      .then(res => res.json())
      .then(data => { setTickets(data); setLoading(false); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const criarTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ouvidoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setModalAberto(false);
        setForm({ tipo: 'Reclamação', setor: '', paciente: '', mensagem: '' });
        fetchTickets();
        alert('Manifestação registrada com sucesso!');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao criar ticket.');
    }
  };

  // Stats
  const abertas = tickets.filter(t => t.tipo === 'Reclamação' && t.status !== 'FINALIZADO').length;
  const elogios = tickets.filter(t => t.tipo === 'Elogio').length;

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-headset"></i> Ouvidoria e SAC</h2>
          <p>Gestão de reclamações, elogios e sugestões de pacientes</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" style={{ background: '#475569' }} onClick={() => setModalAberto(true)}>
            <i className="las la-plus"></i> Nova Manifestação
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>RECLAMAÇÕES ABERTAS</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{abertas}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>ELOGIOS TOTAIS</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{elogios}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>MÉDIA DE RESPOSTA</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>24h</div>
        </div>
      </div>

      <div className="card">
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Tipo / Setor</th>
                <th>Relato</th>
                <th>Paciente</th>
                <th>Status / SLA</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{textAlign: 'center', padding: '20px'}}>Carregando...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign: 'center', padding: '20px'}}>Nenhuma manifestação registrada.</td></tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: '#64748b' }}>{t.protocolo}</td>
                    <td>
                      <span className="status-badge" style={{ 
                        background: t.tipo === 'Reclamação' ? '#fef2f2' : t.tipo === 'Elogio' ? '#ecfdf5' : '#eff6ff',
                        color: t.tipo === 'Reclamação' ? '#ef4444' : t.tipo === 'Elogio' ? '#10b981' : '#3b82f6',
                        display: 'inline-block', marginBottom: '4px'
                      }}>
                        {t.tipo}
                      </span>
                      <div style={{ fontSize: '12px', color: '#475569' }}>{t.setor}</div>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{t.mensagem}"</div>
                    </td>
                    <td style={{ color: '#1e293b', fontWeight: 600 }}>{t.paciente}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: t.status === 'FINALIZADO' ? '#10b981' : t.status === 'ABERTO' ? '#f59e0b' : '#64748b' }}>{t.status}</div>
                      <div style={{ fontSize: '11px', color: t.prazo.includes('Vence') ? '#ef4444' : '#64748b' }}>{t.prazo}</div>
                    </td>
                    <td>
                      <button className="btn-primary" style={{ background: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 12px', fontSize: '12px' }}>
                        Responder
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
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '20px' }}>Nova Manifestação</h3>
            <form onSubmit={criarTicket} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Tipo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{ width: '100%', padding: '10px' }}>
                  <option>Reclamação</option>
                  <option>Elogio</option>
                  <option>Sugestão</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Setor</label>
                <input required className="input-field" value={form.setor} onChange={e => setForm({...form, setor: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: Recepção, UTI..." />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Nome do Paciente/Acompanhante</label>
                <input required className="input-field" value={form.paciente} onChange={e => setForm({...form, paciente: e.target.value})} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Mensagem/Relato</label>
                <textarea required className="input-field" value={form.mensagem} onChange={e => setForm({...form, mensagem: e.target.value})} style={{ width: '100%', padding: '10px', height: '100px' }}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px' }}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
