'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './servico-social.css';

export default function ServicoSocialPage() {
  const { data: session } = useSession();
  const [tabAtiva, setTabAtiva] = useState('atendimento');
  
  // Dados
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [atendimentos, setAtendimentos] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    paciente: '',
    tipo: 'Orientação Social',
    demanda: 'Vulnerabilidade Social',
    profissional: '',
    data: '',
    status: 'Em Andamento',
    relato: '',
    encaminhamentos: ''
  });

  // Filtros
  const [buscaLista, setBuscaLista] = useState('');

  const getHospitalId = () => {
    const u = localStorage.getItem('usuarioLogado');
    const usuario = session?.user || (u ? JSON.parse(u) : null);
    return usuario?.hospitalId || 'hospital_001';
  };

  useEffect(() => {
    const hid = getHospitalId();
    try {
      const p = JSON.parse(localStorage.getItem(`${hid}_pacientes`) || '[]');
      const a = JSON.parse(localStorage.getItem(`${hid}_ssAtendimentos`) || '[]');
      setPacientes(p);
      setAtendimentos(a);
      
      const hoje = new Date().toISOString().split('T')[0];
      setForm(prev => ({ ...prev, data: hoje }));

      // Se houver session.user, preenche profissional
      const u = localStorage.getItem('usuarioLogado');
      const usuario = session?.user || (u ? JSON.parse(u) : null);
      if (usuario?.name || usuario?.nome) {
        setForm(prev => ({ ...prev, profissional: usuario.name || usuario.nome }));
      }
    } catch(e) {}
  }, [session]);

  const registrarAtendimento = () => {
    if (!form.paciente || !form.profissional) {
      alert("⚠️ Preencha paciente e assistente social!");
      return;
    }

    const novo = {
      id: Date.now(),
      ...form,
      dataCriacao: new Date().toISOString()
    };

    const hid = getHospitalId();
    const atualizados = [...atendimentos, novo];
    setAtendimentos(atualizados);
    localStorage.setItem(`${hid}_ssAtendimentos`, JSON.stringify(atualizados));
    
    setForm(prev => ({ ...prev, relato: '', encaminhamentos: '', paciente: '' }));
    alert("✅ Atendimento registrado com sucesso!");
  };

  // Filtros de Tabela
  let listaFiltrada = atendimentos.slice().reverse();
  if (buscaLista) {
    const t = buscaLista.toLowerCase();
    listaFiltrada = listaFiltrada.filter(a => 
      a.paciente.toLowerCase().includes(t) || 
      a.demanda.toLowerCase().includes(t)
    );
  }

  // Estatísticas
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  const atendimentosMes = atendimentos.filter(a => {
    const d = new Date(a.data);
    return (d.getMonth() + 1) === mesAtual && d.getFullYear() === anoAtual;
  }).length;
  
  const pendentes = atendimentos.filter(a => a.status !== "Concluído").length;
  const concluidos = atendimentos.filter(a => a.status === "Concluído").length;
  const comEncaminhamentos = atendimentos.filter(a => a.encaminhamentos && a.encaminhamentos.trim() !== "").length;

  return (
    <div className="conteudo">
      <div className="ss-container">

        <div className="banner-ss">
          <div>
            <h1><i className="las la-hands-helping"></i> Serviço Social</h1>
            <p>Atendimento social, acolhimento e controle de demandas do paciente.</p>
          </div>
          <button className="btn btn-success" onClick={() => setTabAtiva('atendimento')}>
            <i className="las la-plus-circle"></i> Novo Atendimento
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><i className="las la-users"></i></div>
            <div className="stat-numero">{atendimentosMes}</div>
            <div className="stat-label">Atendimentos (Mês)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#f59e0b' }}><i className="las la-clock"></i></div>
            <div className="stat-numero">{pendentes}</div>
            <div className="stat-label">Pendentes</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#16a34a' }}><i className="las la-check-circle"></i></div>
            <div className="stat-numero">{concluidos}</div>
            <div className="stat-label">Concluídos</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#7c3aed' }}><i className="las la-share"></i></div>
            <div className="stat-numero">{comEncaminhamentos}</div>
            <div className="stat-label">Encaminhamentos</div>
          </div>
        </div>

        <div className="tabs-ss">
          <button className={`tab-btn ${tabAtiva === 'atendimento' ? 'ativo' : ''}`} onClick={() => setTabAtiva('atendimento')}>
            <i className="las la-plus-circle"></i> Atendimento
          </button>
          <button className={`tab-btn ${tabAtiva === 'lista' ? 'ativo' : ''}`} onClick={() => setTabAtiva('lista')}>
            <i className="las la-list"></i> Lista Completa
          </button>
          <button className={`tab-btn ${tabAtiva === 'encaminhamentos' ? 'ativo' : ''}`} onClick={() => setTabAtiva('encaminhamentos')}>
            <i className="las la-share"></i> Encaminhamentos
          </button>
        </div>

        {tabAtiva === 'atendimento' && (
          <div className="form-panel">
            <h3><i className="las la-hands-helping"></i> Registrar Atendimento Social</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Paciente *</label>
                <select value={form.paciente} onChange={e => setForm({...form, paciente: e.target.value})}>
                  <option value="">Selecione um paciente...</option>
                  {pacientes.map((p, i) => <option key={i} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label>Tipo de Atendimento *</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option>Orientação Social</option>
                  <option>Acolhimento</option>
                  <option>Visita Domiciliar</option>
                  <option>Entrevista Social</option>
                  <option>Grupo de Apoio</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Demanda Principal *</label>
                <select value={form.demanda} onChange={e => setForm({...form, demanda: e.target.value})}>
                  <option>Vulnerabilidade Social</option>
                  <option>Violência Doméstica</option>
                  <option>Abandono Familiar</option>
                  <option>Dependência Química</option>
                  <option>Moradia/Habitação</option>
                  <option>Benefícios/Previdência</option>
                  <option>Documentação</option>
                  <option>Óbito/Trâmites</option>
                  <option>Alta Hospitalar Complexa</option>
                  <option>Outra</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Assistente Social *</label>
                <input type="text" value={form.profissional} onChange={e => setForm({...form, profissional: e.target.value})} placeholder="Nome do profissional" />
              </div>
              <div className="form-grupo">
                <label>Data</label>
                <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option>Em Andamento</option>
                  <option>Aguardando Retorno</option>
                  <option>Concluído</option>
                </select>
              </div>
              <div className="form-grupo full">
                <label>Relato / Evolução</label>
                <textarea rows={3} value={form.relato} onChange={e => setForm({...form, relato: e.target.value})} placeholder="Descreva o atendimento ou evolução do caso..."></textarea>
              </div>
              <div className="form-grupo full">
                <label>Encaminhamentos Realizados</label>
                <textarea rows={2} value={form.encaminhamentos} onChange={e => setForm({...form, encaminhamentos: e.target.value})} placeholder="Ex: Encaminhado ao CRAS para benefício eventual."></textarea>
              </div>
            </div>
            <button className="btn btn-success" onClick={registrarAtendimento} style={{ width: '100%', marginTop: '15px' }}>
              <i className="las la-save"></i> Salvar Atendimento
            </button>
          </div>
        )}

        {tabAtiva === 'lista' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por paciente ou demanda..." value={buscaLista} onChange={e => setBuscaLista(e.target.value)} />
            </div>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <table className="tabela-ss">
                <thead>
                  <tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Demanda</th><th>Profissional</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {listaFiltrada.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum atendimento registrado.</td></tr>
                  ) : (
                    listaFiltrada.map((a, i) => {
                      let badge = "badge-info";
                      if (a.status === 'Concluído') badge = "badge-success";
                      if (a.status === 'Aguardando Retorno') badge = "badge-warning";
                      
                      return (
                        <tr key={i}>
                          <td>{new Date(a.data).toLocaleDateString('pt-BR')}</td>
                          <td><strong>{a.paciente}</strong></td>
                          <td>{a.tipo}</td>
                          <td>{a.demanda}</td>
                          <td>{a.profissional}</td>
                          <td><span className={`badge ${badge}`}>{a.status}</span></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tabAtiva === 'encaminhamentos' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '25px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#0a1f44', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="las la-share"></i> Encaminhamentos Registrados
            </h3>
            {atendimentos.filter(a => a.encaminhamentos && a.encaminhamentos.trim() !== '').length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center' }}>Nenhum encaminhamento registrado.</p>
            ) : (
              atendimentos.filter(a => a.encaminhamentos && a.encaminhamentos.trim() !== '').reverse().map((a, i) => (
                <div key={i} className="encaminhamento-card">
                  <p style={{ margin: '0 0 5px 0', fontSize: '15px' }}>
                    <strong>{a.paciente}</strong> - {new Date(a.data).toLocaleDateString('pt-BR')}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                    <i className="las la-arrow-right"></i> {a.encaminhamentos}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
