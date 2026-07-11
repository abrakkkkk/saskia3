'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './manutencao.css';

export default function ManutencaoPage() {
  const { data: session } = useSession();
  const [tabAtiva, setTabAtiva] = useState('nova');
  
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

  const getHospitalId = () => {
    const u = localStorage.getItem('usuarioLogado');
    const usuario = session?.user || (u ? JSON.parse(u) : null);
    return usuario?.hospitalId || 'hospital_001';
  };

  useEffect(() => {
    const hid = getHospitalId();
    try {
      const o = JSON.parse(localStorage.getItem(`${hid}_mntOrdens`) || '[]');
      setOrdens(o);
      
      const hoje = new Date().toISOString().split('T')[0];
      setForm(prev => ({ ...prev, data: hoje }));

      // Autopreencher solicitante
      const u = localStorage.getItem('usuarioLogado');
      const usuario = session?.user || (u ? JSON.parse(u) : null);
      if (usuario?.name || usuario?.nome) {
        setForm(prev => ({ ...prev, solicitante: usuario.name || usuario.nome }));
      }
    } catch(e) {}
  }, [session]);

  const criarOS = () => {
    if (!form.equipamento || !form.solicitante) {
      alert("⚠️ Preencha o equipamento/local e o solicitante!");
      return;
    }

    const nova = {
      id: Date.now(),
      ...form,
      status: "Aberta"
    };

    const hid = getHospitalId();
    const atualizados = [...ordens, nova];
    setOrdens(atualizados);
    localStorage.setItem(`${hid}_mntOrdens`, JSON.stringify(atualizados));

    setForm(prev => ({ ...prev, equipamento: '', descricao: '' }));
    alert(`✅ OS criada com sucesso! Nº ${atualizados.length}`);
    setTabAtiva('lista');
  };

  const concluirOS = (id: number) => {
    if (!confirm("Confirmar a conclusão desta OS?")) return;
    const hid = getHospitalId();
    const novas = ordens.map(o => o.id === id ? { ...o, status: "Concluída" } : o);
    setOrdens(novas);
    localStorage.setItem(`${hid}_mntOrdens`, JSON.stringify(novas));
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
                  ordens.slice().reverse().map((o, i) => {
                    let prioridadeBadge = "badge-info";
                    if (o.prioridade === 'Emergência') prioridadeBadge = "badge-danger";
                    if (o.prioridade === 'Urgente') prioridadeBadge = "badge-warning";

                    return (
                      <tr key={i}>
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
