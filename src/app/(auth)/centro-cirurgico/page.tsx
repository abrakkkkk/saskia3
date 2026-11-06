'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import PacienteSelect from '@/components/ui/PacienteSelect';
import { pode } from '@/lib/permissions';
import '@/components/ui/modulo.css';
import '../setores.css';
import './centro-cirurgico.css';

interface Paciente {
  id: string;
  nome: string;
  cpf: string | null;
}

interface Profissional {
  id: string;
  nome: string;
  cargo?: string;
}

interface Cirurgia {
  id: string;
  pacienteId: string;
  paciente: Paciente;
  procedimento: string;
  sala: string | null;
  dataHora: string | null;
  equipe: string | null;
  anestesia: string | null;
  status: string; // AGENDADA, EM_PREPARO, EM_ANDAMENTO, CONCLUIDA, CANCELADA
  observacoes: string | null;
  createdAt: string;
}

type Aba = 'agendamento' | 'salas' | 'lista';

const ABAS = [
  { id: 'agendamento', label: 'Agendamento', icon: 'las la-calendar-plus' },
  { id: 'salas', label: 'Salas', icon: 'las la-door-open' },
  { id: 'lista', label: 'Cirurgias', icon: 'las la-list' },
] as const;

const STATUS_ROTULO: Record<string, string> = { AGENDADA: 'Agendada', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
const STATUS_TOM: Record<string, Tone> = { AGENDADA: 'neutral', EM_ANDAMENTO: 'info', CONCLUIDA: 'success', CANCELADA: 'neutral' };

function dataLocalKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function CentroCirurgicoPage() {
  const { data: session, status: sessionStatus } = useSession();
  const podeGerenciar = pode(session?.user?.cargo, 'cirurgia:gerir');
  const [activeTab, setActiveTab] = useState<Aba>('agendamento');
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [salas, setSalas] = useState<string[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  // Filters
  const [buscaCirurgia, setBuscaCirurgia] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Forms
  const [formAgendamento, setFormAgendamento] = useState({
    pacienteId: '', sala: 'SO 1', data: '', hora: '', procedimento: '',
    prioridade: 'Eletiva', cirurgiao: '', anestesista: '', instrumentador: '',
    circulante: '', anestesia: 'Geral', duracao: '1', obs: ''
  });


  const carregarDados = async () => {
    try {
      const [resCirurgias, resSalas, resUsuarios] = await Promise.all([
        fetch('/api/cirurgias'),
        fetch('/api/salas'),
        fetch('/api/chat/contatos')
      ]);
      if (!resCirurgias.ok || !resSalas.ok) {
        throw new Error('Não foi possível carregar os dados do centro cirúrgico. Atualize a página e tente novamente.');
      }
      setErroCarga('');
      if (resCirurgias.ok) {
        const dCir = await resCirurgias.json();
        setCirurgias(Array.isArray(dCir) ? dCir : []);
      }
      if (resSalas.ok) {
        const dSalas: unknown = await resSalas.json();
        const salasNomes = Array.isArray(dSalas) ? dSalas.map((s: { nome?: unknown }) => s.nome).filter((nome: unknown): nome is string => typeof nome === 'string' && Boolean(nome.trim())) : [];
        setSalas(salasNomes);
        setFormAgendamento(prev => ({ ...prev, sala: salasNomes.includes(prev.sala) ? prev.sala : (salasNomes[0] || '') }));
      }
      if (resUsuarios.ok) {
        const dUsers = await resUsuarios.json();
        if (Array.isArray(dUsers)) setProfissionais(dUsers);
      }
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Erro ao carregar dados do centro cirúrgico.');
      console.error('Erro ao carregar dados do centro cirúrgico:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormAgendamento(f => ({ ...f, data: dataLocalKey(new Date()) }));
    carregarDados();
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && !podeGerenciar && activeTab === 'agendamento') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('lista');
    }
  }, [sessionStatus, podeGerenciar, activeTab]);

  const tentarNovamente = () => {
    setLoading(true);
    void carregarDados();
  };

  const agendarCirurgia = async () => {
    const { pacienteId, data, hora, procedimento, cirurgiao, anestesista, instrumentador, circulante, anestesia, prioridade, sala, obs } = formAgendamento;
    if (!pacienteId || !sala || !salas.includes(sala) || !data || !hora || !procedimento.trim() || !cirurgiao.trim()) {
      alert('Preencha todos os campos obrigatórios (*).');
      return;
    }

    const duracaoTexto = formAgendamento.duracao.trim();
    const duracaoHoras = duracaoTexto ? Number(duracaoTexto) : 2;
    if (!Number.isFinite(duracaoHoras) || duracaoHoras < 0.5) {
      alert('Informe uma duração prevista de pelo menos 0,5 hora.');
      return;
    }

    const dataHoraSelecionada = new Date(`${data}T${hora}:00`);
    if (Number.isNaN(dataHoraSelecionada.getTime())) {
      alert('Data e horário inválidos.');
      return;
    }
    const dataHoraNova = dataHoraSelecionada.toISOString();

    // O conflito de paciente e de sala é decidido pelo servidor (intervalo real); a mensagem 409 é exibida.
    try {
      const equipe = `Cirurgião: ${cirurgiao}. Anest: ${anestesista}. Instr: ${instrumentador}. Circ: ${circulante}`;
      const observacoes = `Prioridade: ${prioridade}. Obs: ${obs}`;

      const res = await fetch('/api/cirurgias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          procedimento,
          sala,
          dataHora: dataHoraNova,
          duracaoHoras,
          equipe,
          anestesia,
          observacoes
        })
      });

      if (!res.ok) {
        const erro = await res.json().catch(() => null);
        throw new Error(typeof erro?.error === 'string' ? erro.error : 'Erro ao agendar cirurgia.');
      }

      setFormAgendamento({
        ...formAgendamento,
        pacienteId: '', hora: '', procedimento: '', cirurgiao: '', anestesista: '',
        instrumentador: '', circulante: '', obs: ''
      });

      alert('Cirurgia agendada com sucesso.');
      carregarDados();
      setActiveTab('lista');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao agendar cirurgia.');
    }
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    if (!podeGerenciar) return;
    const cirurgia = cirurgias.find(c => c.id === id);
    if (!cirurgia) return;

    let msg = "";
    if (novoStatus === 'EM_ANDAMENTO') msg = `Iniciar cirurgia de ${cirurgia.paciente.nome} - ${cirurgia.procedimento}?`;
    else if (novoStatus === 'CONCLUIDA') msg = `Concluir cirurgia de ${cirurgia.paciente.nome} - ${cirurgia.procedimento}?`;
    else if (novoStatus === 'CANCELADA') msg = `Cancelar cirurgia de ${cirurgia.paciente.nome}?`;

    if (await confirm(msg)) {
      try {
        const res = await fetch(`/api/cirurgias/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: novoStatus })
        });
        if (!res.ok) {
          const erro = await res.json().catch(() => null);
          throw new Error(typeof erro?.error === 'string' ? erro.error : 'Erro ao atualizar cirurgia.');
        }

        if (novoStatus === 'EM_ANDAMENTO') alert('Cirurgia iniciada.');
        if (novoStatus === 'CONCLUIDA') alert('Cirurgia concluída.');
        if (novoStatus === 'CANCELADA') alert('Cirurgia cancelada.');
        carregarDados();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Erro ao atualizar cirurgia.');
      }
    }
  };


  // Stats
  const hojeISO = dataLocalKey(new Date());
  const stats = {
    agendadas: cirurgias.filter(c => c.dataHora && dataLocalKey(new Date(c.dataHora)) === hojeISO).length,
    andamento: cirurgias.filter(c => c.status === "EM_ANDAMENTO").length,
    concluidas: cirurgias.filter(c => c.status === "CONCLUIDA" && c.dataHora && dataLocalKey(new Date(c.dataHora)) === hojeISO).length,
    canceladas: cirurgias.filter(c => c.status === "CANCELADA").length,
  };

  const cirurgiasHoje = cirurgias.filter(c => c.dataHora && dataLocalKey(new Date(c.dataHora)) === hojeISO);

  let cirurgiasFiltradas = [...cirurgias];
  if (filtroStatus !== 'todos') {
    cirurgiasFiltradas = cirurgiasFiltradas.filter(c => c.status === filtroStatus);
  }
  if (buscaCirurgia) {
    const termo = buscaCirurgia.toLowerCase();
    cirurgiasFiltradas = cirurgiasFiltradas.filter(c =>
      c.paciente.nome.toLowerCase().includes(termo) ||
      c.procedimento.toLowerCase().includes(termo) ||
      (c.equipe && c.equipe.toLowerCase().includes(termo))
    );
  }

  const rotuloStatus = (status: string) => STATUS_ROTULO[status] ?? status;
  const abas = podeGerenciar ? ABAS : ABAS.filter(a => a.id !== 'agendamento');

  return (
    <div className="conteudo">
      <div className="cc-container">
        <PageHeader
          icon="las la-hospital"
          title="Centro cirúrgico"
          subtitle="Agendamento de cirurgias e situação das salas"
          actions={podeGerenciar && !loading ? (
            <button type="button" className="btn btn-success" onClick={() => setActiveTab('agendamento')}>
              <i className="las la-plus-circle" aria-hidden="true"></i> Agendar cirurgia
            </button>
          ) : undefined}
        />

        {loading && cirurgias.length === 0 ? <LoadingState message="Carregando dados do centro cirúrgico..." /> : erroCarga && cirurgias.length === 0 && salas.length === 0 ? (
          <ErrorState message={erroCarga} onRetry={tentarNovamente} />
        ) : (
          <>
            {erroCarga && <p className="mod-aviso mod-aviso-erro" role="alert">{erroCarga}</p>}

            <StatGrid>
              <StatCard icon="las la-calendar-check" value={stats.agendadas} label="Cirurgias hoje" />
              <StatCard icon="las la-clock" value={stats.andamento} label="Em andamento" tone="info" alerta />
              <StatCard icon="las la-check-circle" value={stats.concluidas} label="Concluídas hoje" />
              <StatCard icon="las la-door-open" value={salas.length} label="Salas" />
              <StatCard icon="las la-ban" value={stats.canceladas} label="Canceladas" />
            </StatGrid>

            <Tabs tabs={abas} active={activeTab} onChange={setActiveTab} label="Seções do centro cirúrgico" />

            {sessionStatus === 'authenticated' && !podeGerenciar && (
              <p role="status" className="sc-nota sc-nota-superficie">Seu cargo pode consultar cirurgias, mas não agendar nem alterar status.</p>
            )}

            {activeTab === 'agendamento' && podeGerenciar && (
              <div className="cc-colunas">
                <Panel title="Agendar nova cirurgia" icon="las la-calendar-plus">
                  <div className="mod-form-grid">
                    <PacienteSelect required value={formAgendamento.pacienteId} onChange={id => setFormAgendamento({ ...formAgendamento, pacienteId: id })} />
                    <div className="form-group">
                      <label htmlFor="cc-sala">Sala cirúrgica *</label>
                      <select id="cc-sala" value={formAgendamento.sala} onChange={e => setFormAgendamento({...formAgendamento, sala: e.target.value})}>
                        <option value="">{salas.length ? 'Selecione uma sala' : 'Cadastre uma sala antes de agendar'}</option>
                        {salas.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label htmlFor="cc-data">Data *</label><input id="cc-data" type="date" value={formAgendamento.data} onChange={e => setFormAgendamento({...formAgendamento, data: e.target.value})} /></div>
                    <div className="form-group"><label htmlFor="cc-hora">Horário *</label><input id="cc-hora" type="time" value={formAgendamento.hora} onChange={e => setFormAgendamento({...formAgendamento, hora: e.target.value})} /></div>
                    <div className="form-group"><label htmlFor="cc-procedimento">Procedimento *</label><input id="cc-procedimento" type="text" placeholder="Nome do procedimento" value={formAgendamento.procedimento} onChange={e => setFormAgendamento({...formAgendamento, procedimento: e.target.value})} /></div>
                    <div className="form-group">
                      <label htmlFor="cc-prioridade">Prioridade</label>
                      <select id="cc-prioridade" value={formAgendamento.prioridade} onChange={e => setFormAgendamento({...formAgendamento, prioridade: e.target.value})}>
                        <option>Eletiva</option><option>Urgência</option><option>Emergência</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="cc-cirurgiao">Cirurgião responsável *</label>
                      <input
                        id="cc-cirurgiao"
                        type="text"
                        list="medicos-list"
                        placeholder="Selecione ou digite o cirurgião"
                        value={formAgendamento.cirurgiao}
                        onChange={e => setFormAgendamento({...formAgendamento, cirurgiao: e.target.value})}
                      />
                      <datalist id="medicos-list">
                        {profissionais.filter(u => u.cargo?.toLowerCase().includes('medico') || u.cargo === 'ADMIN' || u.cargo === 'diretor_geral').map(u => (
                          <option key={u.id} value={`Dr(a). ${u.nome}`} />
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label htmlFor="cc-anestesista">Anestesista</label>
                      <input
                        id="cc-anestesista"
                        type="text"
                        list="medicos-list"
                        placeholder="Selecione ou digite o anestesista"
                        value={formAgendamento.anestesista}
                        onChange={e => setFormAgendamento({...formAgendamento, anestesista: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cc-instrumentador">Enfermeiro instrumentador</label>
                      <input
                        id="cc-instrumentador"
                        type="text"
                        list="enfermeiros-list"
                        placeholder="Selecione ou digite o instrumentador"
                        value={formAgendamento.instrumentador}
                        onChange={e => setFormAgendamento({...formAgendamento, instrumentador: e.target.value})}
                      />
                      <datalist id="enfermeiros-list">
                        {profissionais.filter(u => u.cargo?.toLowerCase().includes('enferm')).map(u => (
                          <option key={u.id} value={`Enf. ${u.nome}`} />
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label htmlFor="cc-circulante">Enfermeiro circulante</label>
                      <input
                        id="cc-circulante"
                        type="text"
                        list="enfermeiros-list"
                        placeholder="Selecione ou digite o circulante"
                        value={formAgendamento.circulante}
                        onChange={e => setFormAgendamento({...formAgendamento, circulante: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cc-anestesia">Anestesia prevista</label>
                      <select id="cc-anestesia" value={formAgendamento.anestesia} onChange={e => setFormAgendamento({...formAgendamento, anestesia: e.target.value})}>
                        <option>Geral</option><option>Regional</option><option>Local</option><option>Sedativo</option>
                      </select>
                    </div>
                    <div className="form-group"><label htmlFor="cc-duracao">Duração prevista (h)</label><input id="cc-duracao" type="number" min="0.5" step="0.5" value={formAgendamento.duracao} onChange={e => setFormAgendamento({...formAgendamento, duracao: e.target.value})} /></div>
                    <div className="form-group mod-largo"><label htmlFor="cc-obs">Observações</label><textarea id="cc-obs" rows={2} value={formAgendamento.obs} onChange={e => setFormAgendamento({...formAgendamento, obs: e.target.value})}></textarea></div>
                  </div>
                  <div className="mod-acoes">
                    <button type="button" className="btn btn-success" onClick={agendarCirurgia} disabled={!salas.length || loading}>
                      <i className="las la-save" aria-hidden="true"></i> Agendar cirurgia
                    </button>
                  </div>
                </Panel>

                <Panel title="Cirurgias de hoje" icon="las la-list-alt">
                  {cirurgiasHoje.length === 0 ? (
                    <EmptyState icon="las la-calendar" message="Nenhuma cirurgia agendada para hoje." />
                  ) : (
                    <ul className="cc-hoje">
                      {cirurgiasHoje.map(c => (
                        <li key={c.id}>
                          <div className="cc-hoje-topo">
                            <strong className="ui-num">{c.dataHora ? new Date(c.dataHora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : ''}</strong>
                            <Badge tone={STATUS_TOM[c.status] ?? 'neutral'}>{rotuloStatus(c.status)}</Badge>
                          </div>
                          <p className="cc-hoje-paciente">{c.paciente.nome}</p>
                          <p className="mod-secundario">{c.procedimento} · Sala {c.sala}</p>
                          {c.equipe && <p className="mod-secundario">{c.equipe}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            )}

            {activeTab === 'salas' && (salas.length === 0 ? (
              <EmptyState icon="las la-door-open" message="Nenhuma sala cirúrgica cadastrada." />
            ) : (
              <ul className="cc-salas" aria-label="Salas cirúrgicas">
                {salas.map(sala => {
                  const ocupada = cirurgias.find(c => (c.status === "EM_ANDAMENTO" || (c.status === "AGENDADA" && c.dataHora && dataLocalKey(new Date(c.dataHora)) === hojeISO)) && c.sala === sala);
                  const emAndamento = ocupada?.status === 'EM_ANDAMENTO';

                  const situacao = emAndamento ? 'Ocupada' : ocupada ? 'Reservada hoje' : 'Livre';
                  const tom: Tone = emAndamento ? 'info' : ocupada ? 'warning' : 'neutral';

                  return (
                    <li key={sala} className={`cc-sala ${emAndamento ? 'cc-sala-ocupada' : ''}`}>
                      <div className="cc-sala-topo">
                        <span className="cc-sala-nome">{sala}</span>
                        <Badge tone={tom}>{situacao}</Badge>
                      </div>
                      <p className="cc-sala-detalhe">
                        {ocupada ? `${ocupada.procedimento} - ${ocupada.paciente.nome}` : 'Sem cirurgia prevista'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ))}

            {activeTab === 'lista' && (
              <>
                <div className="sc-filtros">
                  <SearchInput value={buscaCirurgia} onChange={setBuscaCirurgia} placeholder="Buscar por paciente, procedimento ou equipe..." label="Buscar cirurgias por paciente, procedimento ou equipe" />
                  <select aria-label="Filtrar cirurgias por status" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                    <option value="todos">Todos os status</option>
                    <option value="AGENDADA">Agendada</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="CONCLUIDA">Concluída</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
                {cirurgiasFiltradas.length === 0 ? (
                  <EmptyState icon="las la-list" message="Nenhuma cirurgia encontrada." />
                ) : (
                  <div className="tabela-wrapper">
                    <table className="tabela">
                      <thead>
                        <tr>
                          <th scope="col">Data e hora</th>
                          <th scope="col">Paciente</th>
                          <th scope="col">Procedimento</th>
                          <th scope="col">Sala</th>
                          <th scope="col">Status</th>
                          {podeGerenciar && <th scope="col">Ações</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {cirurgiasFiltradas.slice(0, 50).map(c => (
                          <tr key={c.id}>
                            <td>{c.dataHora ? new Date(c.dataHora).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'}) : '-'}</td>
                            <td><strong>{c.paciente.nome}</strong></td>
                            <td>
                              {c.procedimento}
                              {c.equipe && <span className="mod-secundario">{c.equipe}</span>}
                            </td>
                            <td>{c.sala}</td>
                            <td><Badge tone={STATUS_TOM[c.status] ?? 'neutral'}>{rotuloStatus(c.status)}</Badge></td>
                            {podeGerenciar && (
                              <td>
                                <div className="mod-acoes-tabela">
                                  <button type="button" className="btn btn-xs btn-primary" aria-label={`Iniciar ${c.procedimento} de ${c.paciente.nome}`} onClick={() => alterarStatus(c.id, 'EM_ANDAMENTO')} disabled={c.status !== 'AGENDADA'}>Iniciar</button>
                                  <button type="button" className="btn btn-xs btn-success" aria-label={`Concluir ${c.procedimento} de ${c.paciente.nome}`} onClick={() => alterarStatus(c.id, 'CONCLUIDA')} disabled={c.status !== 'EM_ANDAMENTO'}>Concluir</button>
                                  <button type="button" className="btn btn-xs btn-danger" aria-label={`Cancelar ${c.procedimento} de ${c.paciente.nome}`} onClick={() => alterarStatus(c.id, 'CANCELADA')} disabled={c.status === 'CANCELADA' || c.status === 'CONCLUIDA'}>Cancelar</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
