'use client';

import { useState, useEffect } from 'react';

interface Ocorrencia {
  id: string;
  tipo: string;
  local: string;
  relato: string;
  vigilante: string;
  dataHora: string;
}

export default function EquipeSegurancaPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ tipo: 'Desordem', local: '', relato: '', vigilante: '', dataHora: '' });

  const fetchOcorrencias = () => {
    fetch('/api/equipe-seguranca')
      .then(res => res.json())
      .then(data => { setOcorrencias(data); setLoading(false); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchOcorrencias();
  }, []);

  const registrarOcorrencia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/equipe-seguranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setModalAberto(false);
        setForm({ tipo: 'Desordem', local: '', relato: '', vigilante: '', dataHora: '' });
        fetchOcorrencias();
        alert('Ocorrência registrada com sucesso!');
      }
    } catch (e) {
      alert('Erro ao registrar.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-shield-alt"></i> Equipe de Segurança</h2>
          <p>Registro de ocorrências, controle de acesso e monitoramento</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" style={{ background: '#1e293b' }} onClick={() => setModalAberto(true)}>
            <i className="las la-plus"></i> Registrar Ocorrência
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #1e293b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>OCORRÊNCIAS HOJE</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>{ocorrencias.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>POSTOS COBERTOS</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>12/12</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Livro de Ocorrências (Digital)</h3>
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Tipo</th>
                <th>Local</th>
                <th>Relato Resumido</th>
                <th>Vigilante Responsável</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:20}}>Carregando...</td></tr>
              ) : ocorrencias.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:20}}>Nenhuma ocorrência registrada hoje.</td></tr>
              ) : (
                ocorrencias.map(o => (
                  <tr key={o.id}>
                    <td>{new Date(o.dataHora).toLocaleString('pt-BR')}</td>
                    <td>
                      <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{o.tipo}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{o.local}</td>
                    <td style={{ maxWidth: '300px', fontSize: '13px' }}>{o.relato}</td>
                    <td><div style={{ fontSize: '13px', color: '#475569' }}><i className="las la-user-shield"></i> {o.vigilante}</div></td>
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
            <h3 style={{ marginBottom: '20px' }}>Registrar Ocorrência</h3>
            <form onSubmit={registrarOcorrencia} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Data e Hora da Ocorrência</label>
                <input required type="datetime-local" className="input-field" value={form.dataHora} onChange={e => setForm({...form, dataHora: e.target.value})} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Tipo de Incidente</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{ width: '100%', padding: '10px' }}>
                  <option>Desordem</option>
                  <option>Dano ao Patrimônio</option>
                  <option>Invasão de Área Restrita</option>
                  <option>Achados e Perdidos</option>
                  <option>Atendimento de Apoio</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Local (Setor/Andar)</label>
                <input required className="input-field" value={form.local} onChange={e => setForm({...form, local: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: Portaria Principal, UTI..." />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Nome do Vigilante/Porteiro</label>
                <input required className="input-field" value={form.vigilante} onChange={e => setForm({...form, vigilante: e.target.value})} style={{ width: '100%', padding: '10px' }} placeholder="Ex: João Souza" />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#64748b' }}>Relato</label>
                <textarea required className="input-field" value={form.relato} onChange={e => setForm({...form, relato: e.target.value})} style={{ width: '100%', padding: '10px', height: '100px' }} placeholder="Descreva o que ocorreu..."></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px', background: '#1e293b' }}>Gravar Ocorrência</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
