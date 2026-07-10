'use client';

import { useState, useEffect } from 'react';

interface Caso {
  id: string;
  pacienteNome: string;
  situacao: string;
  detalhe: string;
  status: string;
  createdAt: string;
}

export default function ServicoSocialPage() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ pacienteNome: '', situacao: 'Vulnerabilidade Social', detalhe: '' });

  const fetchCasos = () => {
    fetch('/api/servico-social')
      .then(res => res.json())
      .then(data => { setCasos(data); setLoading(false); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchCasos();
  }, []);

  const abrirCaso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/servico-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setModalAberto(false);
        setForm({ pacienteNome: '', situacao: 'Vulnerabilidade Social', detalhe: '' });
        fetchCasos();
        alert('Caso aberto com sucesso!');
      }
    } catch (e) {
      alert('Erro ao registrar caso.');
    }
  };

  const ativos = casos.filter(c => c.status === 'EM ACOMPANHAMENTO').length;

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-hands-helping"></i> Serviço Social</h2>
          <p>Acompanhamento de pacientes em vulnerabilidade e apoio familiar</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary"  onClick={() => setModalAberto(true)}>
            <i className="las la-plus"></i> Novo Caso
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #d946ef' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>CASOS ATIVOS</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{ativos}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>TRANSFERÊNCIAS PENDENTES</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>0</div>
        </div>
      </div>

      <div className="card">
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Situação Principal</th>
                <th>Detalhes</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:20}}>Carregando...</td></tr>
              ) : casos.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:20}}>Nenhum caso social registrado.</td></tr>
              ) : (
                casos.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{c.pacienteNome}</td>
                    <td>
                      <span className="status-badge" style={{ background: '#fdf4ff', color: '#d946ef' }}>{c.situacao}</span>
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '13px', color: '#475569' }}>{c.detalhe}</td>
                    <td><div style={{ fontWeight: 700, color: '#f59e0b' }}>{c.status}</div></td>
                    <td>
                      <button className="btn btn-primary" style={{ background: 'transparent', color: '#d946ef', border: '1px solid #fbcfe8', padding: '6px 12px' }}>
                        Atualizar Evolução
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
            <h3 style={{ marginBottom: '20px' }}>Abrir Caso Social</h3>
            <form onSubmit={abrirCaso} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Nome do Paciente</label>
                <input required className="input-field" value={form.pacienteNome} onChange={e => setForm({...form, pacienteNome: e.target.value})} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Situação Principal</label>
                <select className="input-field" value={form.situacao} onChange={e => setForm({...form, situacao: e.target.value})} style={{ width: '100%', padding: '10px' }}>
                  <option>Vulnerabilidade Social</option>
                  <option>Abandono Familiar</option>
                  <option>Alta Problemática</option>
                  <option>Violência Doméstica</option>
                  <option>Dificuldade de Acesso a Medicação</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Detalhes do Caso</label>
                <textarea required className="input-field" value={form.detalhe} onChange={e => setForm({...form, detalhe: e.target.value})} style={{ width: '100%', padding: '10px', height: '100px' }} placeholder="Descreva brevemente a situação atual..."></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" >Abrir Caso</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
