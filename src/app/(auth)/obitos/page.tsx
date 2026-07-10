'use client';

import { useState, useEffect } from 'react';

interface Obito {
  id: string;
  pacienteNome: string;
  dataHora: string;
  medicoCrm: string;
  causaBasi: string;
  createdAt: string;
}

export default function ObitosPage() {
  const [obitos, setObitos] = useState<Obito[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ pacienteNome: '', dataHora: '', medicoCrm: '', causaBasi: '' });

  const fetchObitos = () => {
    fetch('/api/obitos')
      .then(res => res.json())
      .then(data => { setObitos(data); setLoading(false); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchObitos();
  }, []);

  const registrarObito = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/obitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setModalAberto(false);
        setForm({ pacienteNome: '', dataHora: '', medicoCrm: '', causaBasi: '' });
        fetchObitos();
        alert('Declaração de óbito registrada!');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao registrar.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-book-dead"></i> Gestão de Óbitos</h2>
          <p>Controle e emissão de Declarações de Óbito (DO)</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" style={{ background: '#1e293b' }} onClick={() => setModalAberto(true)}>
            <i className="las la-plus"></i> Registrar Óbito
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #94a3b8' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>ÓBITOS ESTE MÊS</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{obitos.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>MORTALIDADE INSTITUCIONAL</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>1.2%</div>
        </div>
      </div>

      <div className="card">
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Data e Hora do Óbito</th>
                <th>Causa Básica</th>
                <th>Médico Responsável (CRM)</th>
                <th>Status DO</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Carregando...</td></tr>
              ) : obitos.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Nenhum registro encontrado.</td></tr>
              ) : (
                obitos.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{o.pacienteNome}</td>
                    <td>{new Date(o.dataHora).toLocaleString('pt-BR')}</td>
                    <td style={{ color: '#475569' }}>{o.causaBasi}</td>
                    <td>{o.medicoCrm}</td>
                    <td><span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>Emitida</span></td>
                    <td>
                      <button className="btn-primary" style={{ background: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 12px' }}>
                        <i className="las la-print"></i> Imprimir DO
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
            <h3 style={{ marginBottom: '20px' }}>Registrar Declaração de Óbito</h3>
            <form onSubmit={registrarObito} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Nome do Paciente</label>
                <input required className="input-field" value={form.pacienteNome} onChange={e => setForm({...form, pacienteNome: e.target.value})} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Data e Hora</label>
                <input required type="datetime-local" className="input-field" value={form.dataHora} onChange={e => setForm({...form, dataHora: e.target.value})} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Causa Básica</label>
                <input required className="input-field" value={form.causaBasi} onChange={e => setForm({...form, causaBasi: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: Choque Séptico, Parada Cardiorrespiratória..." />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>CRM do Médico Atestante</label>
                <input required className="input-field" value={form.medicoCrm} onChange={e => setForm({...form, medicoCrm: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: CRM-SP 123456" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px', background: '#1e293b' }}>Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
