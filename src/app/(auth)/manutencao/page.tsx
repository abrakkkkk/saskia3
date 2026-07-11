'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './manutencao.css';

export default function ManutencaoPage() {
  const { data: session } = useSession();
  const [tabAtiva, setTabAtiva] = useState('nova');
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [ordens, setOrdens] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    equipamento: '',
    setor: 'UTI',
    tipo: 'Corretiva',
    prioridade: 'Normal',
    solicitante: '',
    data: '',
    descricao: ''
  });

  const carregarOrdens = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manutencao');
      if (res.ok) {
        const data = await res.json();
        setOrdens(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOrdens();
    
    const hoje = new Date().toISOString().split('T')[0];
    setForm(prev => ({ ...prev, data: hoje }));

    if (session?.user?.name) {
      setForm(prev => ({ ...prev, solicitante: session.user.name as string }));
    }
  }, [session]);

  const criarOS = async () => {
    if (!form.equipamento || !form.solicitante) {
      alert("⚠️ Preencha o equipamento/local e o solicitante!");
      return;
    }

    try {
      const res = await fetch('/api/manutencao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error('Erro ao criar OS');

      setForm(prev => ({ ...prev, equipamento: '', descricao: '' }));
      alert(`✅ OS criada com sucesso!`);
      setTabAtiva('lista');
      carregarOrdens();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const concluirOS = async (id: string) => {
    if (!confirm("Confirmar a conclusão desta OS?")) return;
    
    try {
      const res = await fetch(`/api/manutencao/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Concluída' })
      });

      if (!res.ok) throw new Error('Erro ao concluir OS');
      
      carregarOrdens();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Estatísticas
  const abertas = ordens.filter(o => o.status !== "Concluída").length;
  const concluidas = ordens.filter(o => o.status === "Concluída").length;

  if (loading && ordens.length === 0) return <div>Carregando...</div>;

  return (
    <div className="conteudo">
      <div className="mnt-container">

        <div className="banner-mnt">
          <div>
            <h1><i className="las la-tools"></i> Manutenção Predial & Equipamentos</h1>
            <p>Controle de ordens de serviço, preventivas e corretivas</p>
          </div>
          <button className="btn btn-success" onClick={() => setTabAtiva('nova')}>
            <i className="las la-plus-circle"></i> Nova OS
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-numero">{ordens.length}</div>
            <div className="stat-label">Total de OS</div>
          </div>
          <div className="stat-card">
            <div className="stat-numero" style={{ color: '#d97706' }}>{abertas}</div>
            <div className="stat-label">Em Aberto</div>
          </div>
          <div className="stat-card">
            <div className="stat-numero" style={{ color: '#16a34a' }}>{concluidas}</div>
            <div className="stat-label">Concluídas</div>
          </div>
        </div>

        <div className="tabs-mnt">
          <button className={`tab-btn ${tabAtiva === 'nova' ? 'ativo' : ''}`} onClick={() => setTabAtiva('nova')}>
            <i className="las la-plus-circle"></i> Nova OS
          </button>
          <button className={`tab-btn ${tabAtiva === 'lista' ? 'ativo' : ''}`} onClick={() => setTabAtiva('lista')}>
            <i className="las la-list"></i> Lista de OS
          </button>
        </div>

        {tabAtiva === 'nova' && (
          <div className="form-panel">
            <h3><i className="las la-tools"></i> Nova Ordem de Serviço</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Equipamento/Local *</label>
                <input type="text" value={form.equipamento} onChange={e => setForm({...form, equipamento: e.target.value})} placeholder="Ex: Ar-condicionado, Elevador, Maca..." />
              </div>
              <div className="form-grupo">
                <label>Setor *</label>
                <select value={form.setor} onChange={e => setForm({...form, setor: e.target.value})}>
                  <option>UTI</option>
                  <option>Centro Cirúrgico</option>
                  <option>Emergência</option>
                  <option>Enfermaria</option>
                  <option>Administração</option>
                  <option>Externo</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Tipo *</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option>Corretiva</option>
                  <option>Preventiva</option>
                  <option>Preditiva</option>
                  <option>Calibração</option>
                  <option>Emergencial</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Prioridade</label>
                <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}>
                  <option>Normal</option>
                  <option>Urgente</option>
                  <option>Emergência</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Solicitante *</label>
                <input type="text" value={form.solicitante} onChange={e => setForm({...form, solicitante: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label>Data</label>
                <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
              </div>
              <div className="form-grupo full">
                <label>Descrição do Problema</label>
                <textarea rows={3} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Detalhe o defeito ou o serviço necessário..."></textarea>
              </div>
            </div>
            <button className="btn btn-success" onClick={criarOS} style={{ width: '100%', marginTop: '15px' }}>
              <i className="las la-save"></i> Criar OS
            </button>
          </div>
        )}

        {tabAtiva === 'lista' && (
          <div className="tabela-wrapper">
            <table className="tabela-mnt">
              <thead>
                <tr><th>OS</th><th>Data</th><th>Equipamento</th><th>Setor</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {ordens.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhuma OS registrada.</td></tr>
                ) : (
                  ordens.map((o, i) => {
                    let prioridadeBadge = "badge-info";
                    if (o.prioridade === 'Emergência') prioridadeBadge = "badge-danger";
                    if (o.prioridade === 'Urgente') prioridadeBadge = "badge-warning";

                    return (
                      <tr key={o.id}>
                        <td><strong>#{String(ordens.length - i).padStart(3, '0')}</strong></td>
                        <td>{new Date(o.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>{o.equipamento}</td>
                        <td>{o.setor}</td>
                        <td>{o.tipo}</td>
                        <td><span className={`badge ${prioridadeBadge}`}>{o.prioridade}</span></td>
                        <td>
                          <span className={`badge ${o.status === 'Concluída' ? 'badge-success' : 'badge-warning'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          {o.status !== 'Concluída' && (
                            <button className="btn btn-success btn-sm" onClick={() => concluirOS(o.id)}>
                              <i className="las la-check"></i> Concluir
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
