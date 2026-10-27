'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './servico-social.css';

export default function ServicoSocialPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [tabAtiva, setTabAtiva] = useState('atendimento');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  
  // Dados
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [atendimentos, setAtendimentos] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    pacienteId: '',
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

  const carregarDados = async () => {
    setLoading(true);
    try {
      const resP = await fetch('/api/pacientes');
      const resA = await fetch('/api/servico-social');
      if (!resP.ok || !resA.ok) throw new Error('Não foi possível carregar os dados do Serviço Social. Atualize a página.');
      const [dadosPacientes, dadosAtendimentos] = await Promise.all([resP.json(), resA.json()]);
      if (!Array.isArray(dadosPacientes) || !Array.isArray(dadosAtendimentos)) throw new Error('A resposta do servidor está inválida.');
      setPacientes(dadosPacientes);
      setAtendimentos(dadosAtendimentos);
      setErroCarga('');
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Erro ao carregar os dados do Serviço Social.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated' || !session?.user) {
      setPacientes([]);
      setAtendimentos([]);
      setLoading(false);
      return;
    }
    void carregarDados();
    const hoje = new Date();
    const hojeLocal = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    setForm(prev => ({ ...prev, data: prev.data || hojeLocal, profissional: session.user.name || '' }));
  }, [sessionStatus, session?.user]);

  const registrarAtendimento = async () => {
    if (!form.pacienteId || !form.data || !form.relato.trim()) {
      alert(" Selecione o paciente e preencha a data e o relato do atendimento.");
      return;
    }
    if (salvando) return;
    setSalvando(true);
    const payload = {
      pacienteId: form.pacienteId,
      situacao: form.demanda,
      tipo: form.tipo,
      status: form.status,
      data: form.data,
      relato: form.relato.trim(),
      encaminhamentos: form.encaminhamentos.trim(),
    };

    try {
      const res = await fetch('/api/servico-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || 'Erro ao registrar atendimento');
      
      setForm(prev => ({ ...prev, relato: '', encaminhamentos: '', pacienteId: '' }));
      alert(" Atendimento registrado com sucesso!");
      await carregarDados();
      setTabAtiva('lista');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSalvando(false);
    }
  };

  // Filtros de Tabela
  let listaFiltrada = atendimentos.slice();
  if (buscaLista) {
    const t = buscaLista.toLowerCase();
    listaFiltrada = listaFiltrada.filter(a => 
      (a.pacienteNome || '').toLowerCase().includes(t) ||
      (a.situacao || '').toLowerCase().includes(t)
    );
  }

  // Estatísticas
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;
  const anoAtual = agora.getFullYear();
  const atendimentosMes = atendimentos.filter(a => {
    const d = new Date(a.createdAt);
    return (d.getMonth() + 1) === mesAtual && d.getFullYear() === anoAtual;
  }).length;
  
  const pendentes = atendimentos.filter(a => {
    const s = (a.status || '').toUpperCase();
    return s.includes('ACOMPANHAMENTO') || s.includes('PENDENTE') || s.includes('ANDAMENTO');
  }).length;
  const concluidos = atendimentos.filter(a => {
    const s = (a.status || '').toUpperCase();
    return s.includes('CONCLU') || s.includes('RESOLVIDO') || s.includes('FINALIZADO');
  }).length;
  const comEncaminhamentos = atendimentos.filter(a => {
    return (a.detalhe || '').toLowerCase().includes('encaminhamentos:');
  }).length;

  if (loading && atendimentos.length === 0) {
    return (
      <div className="conteudo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Carregando dados do Serviço Social...</p>
      </div>
    );
  }

  return (
    <div className="conteudo">
      <div className="ss-container">

        {erroCarga && <p role="alert" style={{ color: '#b91c1c', background: '#fff', padding: 12, borderRadius: 8 }}>{erroCarga}</p>}

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
                <label htmlFor="social-paciente">Paciente *</label>
                <select id="social-paciente" required value={form.pacienteId} onChange={e => setForm({...form, pacienteId: e.target.value})}>
                  <option value="">Selecione um paciente...</option>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="social-tipo">Tipo de Atendimento *</label>
                <select id="social-tipo" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option>Orientação Social</option>
                  <option>Acolhimento</option>
                  <option>Visita Domiciliar</option>
                  <option>Entrevista Social</option>
                  <option>Grupo de Apoio</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="social-demanda">Demanda Principal *</label>
                <select id="social-demanda" value={form.demanda} onChange={e => setForm({...form, demanda: e.target.value})}>
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
                <label htmlFor="social-profissional">Profissional responsável</label>
                <input id="social-profissional" type="text" value={form.profissional} readOnly aria-readonly="true" />
              </div>
              <div className="form-grupo">
                <label htmlFor="social-data">Data *</label>
                <input id="social-data" type="date" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
              </div>
              <div className="form-grupo">
                <label htmlFor="social-status">Status</label>
                <select id="social-status" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option>Em Andamento</option>
                  <option>Aguardando Retorno</option>
                  <option>Concluído</option>
                </select>
              </div>
              <div className="form-grupo full">
                <label htmlFor="social-relato">Relato / Evolução *</label>
                <textarea id="social-relato" rows={3} required maxLength={4000} value={form.relato} onChange={e => setForm({...form, relato: e.target.value})} placeholder="Descreva o atendimento ou evolução do caso..."></textarea>
              </div>
              <div className="form-grupo full">
                <label htmlFor="social-encaminhamentos">Encaminhamentos Realizados</label>
                <textarea id="social-encaminhamentos" rows={2} maxLength={1000} value={form.encaminhamentos} onChange={e => setForm({...form, encaminhamentos: e.target.value})} placeholder="Ex: Encaminhado ao CRAS para benefício eventual."></textarea>
              </div>
            </div>
            <button className="btn btn-success" onClick={registrarAtendimento} disabled={salvando || loading || sessionStatus !== 'authenticated'} style={{ width: '100%', marginTop: '15px' }}>
              <i className="las la-save"></i> {salvando ? 'Salvando...' : 'Salvar Atendimento'}
            </button>
          </div>
        )}

        {tabAtiva === 'lista' && (
          <div>
            <div className="search-box">
              <input aria-label="Buscar por paciente ou demanda" type="text" placeholder="Buscar por paciente ou demanda..." value={buscaLista} onChange={e => setBuscaLista(e.target.value)} />
            </div>
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <table className="tabela-ss">
                <thead>
                  <tr><th>Data</th><th>Paciente</th><th>Demanda</th><th>Detalhe</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {listaFiltrada.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Nenhum atendimento registrado.</td></tr>
                  ) : (
                    listaFiltrada.map((a) => {
                      let badge = "badge-info";
                      const status = (a.status || '').toUpperCase();
                      if (status.includes('CONCLU')) badge = "badge-success";
                      if (status.includes('AGUARDANDO') || status.includes('ACOMPANHAMENTO') || status.includes('ANDAMENTO')) badge = "badge-warning";
                      
                      return (
                        <tr key={a.id}>
                          <td>{new Date(a.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td><strong>{a.pacienteNome}</strong></td>
                          <td>{a.situacao}</td>
                          <td>{a.detalhe}</td>
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
          <div>
            <p role="note" style={{ padding: '12px 16px', borderRadius: 8, background: '#fff7ed', color: '#9a3412', marginBottom: 16 }}>
              O sistema não envia ofícios, notificações ou pedidos de vaga. Use os canais institucionais autorizados e registre o encaminhamento no atendimento.
            </p>
            <div className="encaminhamentos-grid">
            <div className="enc-card">
              <h4>CRAS / CREAS</h4>
              <p>Centro de Referência de Assistência Social</p>
            </div>
            <div className="enc-card">
              <h4>Conselho Tutelar</h4>
              <p>Para casos de vulnerabilidade infantil</p>
            </div>
            <div className="enc-card">
              <h4>Delegacia da Mulher (DEAM)</h4>
              <p>Violência doméstica</p>
            </div>
            <div className="enc-card">
              <h4>Abrigos Institucionais</h4>
              <p>Pessoas em situação de rua</p>
            </div>
            <div className="enc-card">
              <h4>INSS</h4>
              <p>Auxílio doença e benefícios</p>
            </div>
            <div className="enc-card">
              <h4>Vara da Infância/Idoso</h4>
              <p>Ministério Público</p>
            </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
