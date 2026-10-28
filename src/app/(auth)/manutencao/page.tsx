'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import './manutencao.css';

export default function ManutencaoPage() {
  const { data: session, status: statusSessao } = useSession();
  const [tabAtiva, setTabAtiva] = useState('nova');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  
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

  const carregarOrdens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manutencao');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Erro ao carregar ordens de manutenção.');
      if (!Array.isArray(data)) throw new Error('Resposta inválida ao carregar ordens de manutenção.');
      setOrdens(data);
      setErroCarga('');
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Erro ao carregar ordens de manutenção.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const agora = new Date();
    const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    setForm(prev => ({ ...prev, data: prev.data || hoje }));
  }, []);

  useEffect(() => {
    if (statusSessao === 'loading') return;
    if (statusSessao !== 'authenticated') {
      setLoading(false);
      setErroCarga('Sua sessão expirou. Entre novamente para acessar as ordens.');
      return;
    }
    setForm(prev => ({ ...prev, solicitante: session?.user?.name || session?.user?.email || 'Usuário autenticado' }));
    void carregarOrdens();
  }, [statusSessao, session?.user?.name, session?.user?.email, carregarOrdens]);

  const criarOS = async () => {
    if (!form.equipamento || !form.solicitante) {
      alert(" Preencha o equipamento/local e o solicitante!");
      return;
    }

    try {
      const res = await fetch('/api/manutencao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof resposta?.error === 'string' ? resposta.error : 'Erro ao criar OS');

      setForm(prev => ({ ...prev, equipamento: '', descricao: '' }));
      alert(` OS criada com sucesso!`);
      setTabAtiva('lista');
      await carregarOrdens();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const concluirOS = async (id: string) => {
    if (!await confirm("Confirmar a conclusão desta OS?")) return;
    
    try {
      const res = await fetch(`/api/manutencao/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Concluída' })
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof resposta?.error === 'string' ? resposta.error : 'Erro ao concluir OS');
      
      await carregarOrdens();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Estatísticas
  const abertas = ordens.filter(o => o.status !== "Concluída").length;
  const concluidas = ordens.filter(o => o.status === "Concluída").length;

  return (
    <div className="conteudo">
      <div className="mnt-container">

        <div className="banner-mnt">
          <div>
            <h1><i className="las la-tools"></i> Manutenção Predial & Equipamentos</h1>
            <p>Controle de ordens de serviço, preventivas e corretivas</p>
          </div>
          <button type="button" className="btn btn-success" onClick={() => setTabAtiva('nova')}>
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
          <button type="button" aria-pressed={tabAtiva === 'nova'} className={`tab-btn ${tabAtiva === 'nova' ? 'ativo' : ''}`} onClick={() => setTabAtiva('nova')}>
            <i className="las la-plus-circle"></i> Nova OS
          </button>
          <button type="button" aria-pressed={tabAtiva === 'lista'} className={`tab-btn ${tabAtiva === 'lista' ? 'ativo' : ''}`} onClick={() => setTabAtiva('lista')}>
            <i className="las la-list"></i> Lista de OS
          </button>
        </div>

        {loading && ordens.length === 0 && <p className="mnt-load" role="status" aria-live="polite">Carregando ordens…</p>}
        {erroCarga && <p className="mnt-error" role="alert" aria-live="assertive">{erroCarga}</p>}

        {tabAtiva === 'nova' && (
          <div className="form-panel">
            <h3><i className="las la-tools"></i> Nova Ordem de Serviço</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label htmlFor="mnt-equipamento">Equipamento/Local *</label>
                <input id="mnt-equipamento" type="text" maxLength={200} required value={form.equipamento} onChange={e => setForm({...form, equipamento: e.target.value})} placeholder="Ex: Ar-condicionado, Elevador, Maca..." />
              </div>
              <div className="form-grupo">
                <label htmlFor="mnt-setor">Setor *</label>
                <select id="mnt-setor" value={form.setor} onChange={e => setForm({...form, setor: e.target.value})}>
                  <option>UTI</option>
                  <option>Centro Cirúrgico</option>
                  <option>Emergência</option>
                  <option>Enfermaria</option>
                  <option>Administração</option>
                  <option>Externo</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="mnt-tipo">Tipo *</label>
                <select id="mnt-tipo" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option>Corretiva</option>
                  <option>Preventiva</option>
                  <option>Preditiva</option>
                  <option>Calibração</option>
                  <option>Emergencial</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="mnt-prioridade">Prioridade</label>
                <select id="mnt-prioridade" value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}>
                  <option>Normal</option>
                  <option>Urgente</option>
                  <option>Emergência</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="mnt-solicitante">Solicitante (usuário autenticado)</label>
                <input id="mnt-solicitante" type="text" value={form.solicitante} readOnly />
              </div>
              <div className="form-grupo">
                <label htmlFor="mnt-data">Data</label>
                <input id="mnt-data" type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
              </div>
              <div className="form-grupo full">
                <label htmlFor="mnt-descricao">Descrição do Problema</label>
                <textarea id="mnt-descricao" rows={3} maxLength={2000} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Detalhe o defeito ou o serviço necessário..."></textarea>
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
              <caption className="mnt-sr-only">Ordens de serviço de manutenção</caption>
              <thead>
                <tr><th>OS</th><th>Data</th><th>Equipamento</th><th>Setor</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {ordens.length === 0 ? (
                  <tr><td colSpan={8} className="mnt-empty">Nenhuma OS registrada.</td></tr>
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
                              <i aria-hidden="true" className="las la-check"></i> Concluir
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
