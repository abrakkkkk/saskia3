'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, type Tone } from '@/components/ui';
import { Modal, ModalActions } from '@/components/ui/Modal';
import PacienteSelect from '@/components/ui/PacienteSelect';
import { pode } from '@/lib/permissions';
import { TRANSICOES_AGENDAMENTO } from '@/app/api/agendamentos/regras';
import '@/components/ui/modulo.css';
import './agenda.css';

function dataLocalAtual() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

interface PacienteData {
  id?: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
}

type StatusAgendamento = 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'EM_ESPERA' | 'FALTOU';

interface Agendamento {
  id: string;
  dataHora: string;
  tipo: string;
  especialidade: string;
  profissional: string | null;
  sala: string | null;
  status: StatusAgendamento;
  paciente: PacienteData;
  observacoes?: string;
}

const STATUS_ROTULO: Record<StatusAgendamento, { rotulo: string; tom: Tone }> = {
  AGENDADO: { rotulo: 'Agendado', tom: 'info' },
  CONFIRMADO: { rotulo: 'Confirmado', tom: 'success' },
  EM_ESPERA: { rotulo: 'Em espera', tom: 'warning' },
  EM_ATENDIMENTO: { rotulo: 'Em atendimento', tom: 'info' },
  CONCLUIDO: { rotulo: 'Concluído', tom: 'neutral' },
  CANCELADO: { rotulo: 'Cancelado', tom: 'danger' },
  FALTOU: { rotulo: 'Faltou', tom: 'danger' },
};

export default function AgendaPage() {
  const { data: session } = useSession();
  const podeGerir = pode(session?.user?.cargo, 'agenda:gerir');

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacienteId, setPacienteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  // Erro de carga troca a tabela; erro de ação aparece em aviso próprio e a tabela permanece.
  const [erro, setErro] = useState('');
  const [erroAcao, setErroAcao] = useState('');

  const [filtroData, setFiltroData] = useState(dataLocalAtual);
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('Todas');
  const [termoBusca, setTermoBusca] = useState('');

  // Menu de ações do agendamento
  const [agendaSelecionada, setAgendaSelecionada] = useState<Agendamento | null>(null);

  const carregarAgendamentos = async () => {
    setErro('');
    try {
      const res = await fetch('/api/agendamentos');
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(Array.isArray(data) ? data : []);
      } else {
        const result = await res.json().catch(() => ({}));
        setAgendamentos([]);
        setErro(result.error || 'Não foi possível carregar os agendamentos.');
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos', error);
      setAgendamentos([]);
      setErro('Falha de conexão ao carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarAgendamentos();
  }, []);

  const criarAgendamento = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!pacienteId) { setErroAcao('Selecione o paciente.'); return; }
    setSalvando(true);
    setErroAcao('');
    const form = new FormData(formElement);
    const dataHora = new Date(`${form.get('data')}T${form.get('hora')}:00`);
    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacienteId, dataHora: dataHora.toISOString(), tipo: form.get('tipo'), especialidade: form.get('especialidade'), profissional: form.get('profissional') || undefined, sala: form.get('sala') || undefined, observacoes: form.get('observacoes') || undefined }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível criar o agendamento.');
      await carregarAgendamentos();
      setPacienteId('');
      setCriando(false);
    } catch (error) {
      setErroAcao(error instanceof Error ? error.message : 'Erro de conexão ao criar agendamento.');
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatus = async (id: string, novoStatus: Agendamento['status']) => {
    if (novoStatus === 'CANCELADO') {
      const confirmacao = await confirm("Deseja realmente cancelar este agendamento?");
      if (!confirmacao) return;
    }

    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });

      if (res.ok) {
        setErroAcao('');
        void carregarAgendamentos();
      } else {
        const result = await res.json().catch(() => ({}));
        setErroAcao(result.error || 'Erro ao alterar o status do agendamento.');
      }
    } catch {
      setErroAcao('Falha de conexão ao alterar o status do agendamento.');
    }
    setAgendaSelecionada(null);
  };

  const agendamentosFiltrados = agendamentos.filter(a => {
    const dataMatch = new Date(a.dataHora).toLocaleDateString('sv-SE') === filtroData;
    const espMatch = filtroEspecialidade === 'Todas' || a.especialidade === filtroEspecialidade;
    const buscaMatch = termoBusca === '' ||
      a.paciente.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      (a.paciente.cpf && a.paciente.cpf.includes(termoBusca));

    return dataMatch && espMatch && buscaMatch;
  }).sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

  // Estatísticas do dia
  const stats = {
    agendados: agendamentosFiltrados.filter(a => a.status === 'AGENDADO').length,
    confirmados: agendamentosFiltrados.filter(a => a.status === 'CONFIRMADO').length,
    atendidos: agendamentosFiltrados.filter(a => a.status === 'CONCLUIDO').length,
    cancelados: agendamentosFiltrados.filter(a => a.status === 'CANCELADO').length,
  };

  const especialidades = ['Todas', ...Array.from(new Set(agendamentos.map(a => a.especialidade).filter(Boolean)))];
  const transicoes = agendaSelecionada ? TRANSICOES_AGENDAMENTO[agendaSelecionada.status] : [];

  return (
    <div className="ag-pagina">
      <PageHeader
        icon="las la-calendar"
        title="Agenda"
        subtitle="Consultas e atendimentos do dia"
        actions={podeGerir && (
          <button type="button" className="btn btn-primary" onClick={() => { setErroAcao(''); setCriando(true); }}>
            <i className="las la-plus" aria-hidden="true"></i> Novo agendamento
          </button>
        )}
      />

      {erroAcao && !criando && <p role="alert" className="mod-aviso mod-aviso-erro">{erroAcao}</p>}

      <StatGrid>
        <StatCard icon="las la-calendar-day" value={stats.agendados} label="Agendados" />
        <StatCard icon="las la-check-circle" value={stats.confirmados} label="Confirmados" />
        <StatCard icon="las la-stethoscope" value={stats.atendidos} label="Atendidos" />
        <StatCard icon="las la-times-circle" value={stats.cancelados} label="Cancelados" />
      </StatGrid>

      <Panel>
        <div className="ag-filtros">
          <div className="form-group">
            <label htmlFor="agenda-data">Data</label>
            <input id="agenda-data" type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="agenda-especialidade">Especialidade</label>
            <select id="agenda-especialidade" value={filtroEspecialidade} onChange={e => setFiltroEspecialidade(e.target.value)}>
              {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="form-group ag-busca">
            <label htmlFor="agenda-busca">Paciente</label>
            <SearchInput value={termoBusca} onChange={setTermoBusca} placeholder="Nome ou CPF" label="Buscar paciente por nome ou CPF" />
          </div>
        </div>
      </Panel>

      <Panel>
        {loading ? (
          <LoadingState message="Carregando agendamentos..." />
        ) : erro ? (
          <ErrorState message={erro} onRetry={() => { setLoading(true); void carregarAgendamentos(); }} />
        ) : agendamentosFiltrados.length === 0 ? (
          <EmptyState icon="las la-calendar-times" message="Nenhum agendamento para a data e os filtros escolhidos." />
        ) : (
          <div className="tabela-wrapper ag-lista">
            <table className="tabela ag-tabela">
              <caption className="sr-only">Agendamentos do dia</caption>
              <thead>
                <tr>
                  <th scope="col">Horário</th>
                  <th scope="col">Paciente</th>
                  <th scope="col">Detalhes</th>
                  <th scope="col">Status</th>
                  {podeGerir && <th scope="col">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {agendamentosFiltrados.map(agenda => {
                  const atrasado = new Date(agenda.dataHora) < new Date() && agenda.status === 'AGENDADO';
                  const situacao = STATUS_ROTULO[agenda.status] ?? { rotulo: agenda.status, tom: 'neutral' as Tone };
                  return (
                    <tr key={agenda.id}>
                      <td className="ag-c-hora">
                        <span className={`ag-hora${atrasado ? ' ag-hora-atrasada' : ''}`}>
                          {new Date(agenda.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {atrasado && <span className="sr-only"> (horário já passou)</span>}
                        </span>
                      </td>
                      <td className="ag-c-paciente">
                        <strong className="ag-nome">{agenda.paciente.nome}</strong>
                        {(agenda.paciente.cpf || agenda.paciente.telefone) && (
                          <span className="ag-sub">{[agenda.paciente.cpf, agenda.paciente.telefone].filter(Boolean).join(' · ')}</span>
                        )}
                      </td>
                      <td className="ag-c-detalhes">
                        <strong className="ag-nome">{agenda.especialidade}</strong>
                        {(agenda.profissional || agenda.sala) && (
                          <span className="ag-sub">{[agenda.profissional, agenda.sala].filter(Boolean).join(' · ')}</span>
                        )}
                      </td>
                      <td className="ag-c-status"><Badge tone={situacao.tom}>{situacao.rotulo}</Badge></td>
                      {podeGerir && (
                        <td className="ag-c-acoes">
                          {TRANSICOES_AGENDAMENTO[agenda.status].length > 0 && (
                            <button type="button" className="btn btn-secondary btn-xs" aria-label={`Abrir ações de ${agenda.paciente.nome}`} onClick={() => setAgendaSelecionada(agenda)}>
                              <i className="las la-ellipsis-h" aria-hidden="true"></i> Ações
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {agendaSelecionada && (
        <Modal size="sm" title={agendaSelecionada.paciente.nome} closeLabel="Fechar ações" onClose={() => setAgendaSelecionada(null)}>
          <div className="ag-opcoes">
            <button type="button" className="btn btn-success" disabled={!transicoes.includes('CONFIRMADO')} onClick={() => void alterarStatus(agendaSelecionada.id, 'CONFIRMADO')}>
              <i className="las la-check" aria-hidden="true"></i> Confirmar presença
            </button>
            <button type="button" className="btn btn-primary" disabled={!transicoes.includes('EM_ATENDIMENTO')} onClick={() => void alterarStatus(agendaSelecionada.id, 'EM_ATENDIMENTO')}>
              <i className="las la-stethoscope" aria-hidden="true"></i> Iniciar atendimento
            </button>
            <button type="button" className="btn btn-secondary" disabled={!transicoes.includes('CONCLUIDO')} onClick={() => void alterarStatus(agendaSelecionada.id, 'CONCLUIDO')}>
              <i className="las la-flag-checkered" aria-hidden="true"></i> Finalizar consulta
            </button>
            <button type="button" className="btn btn-secondary ag-perigo" disabled={!transicoes.includes('CANCELADO')} onClick={() => void alterarStatus(agendaSelecionada.id, 'CANCELADO')}>
              <i className="las la-ban" aria-hidden="true"></i> Cancelar agendamento
            </button>
          </div>
        </Modal>
      )}

      {criando && (
        <Modal size="lg" title="Novo agendamento" closeLabel="Fechar" onClose={() => setCriando(false)}>
          <form onSubmit={criarAgendamento}>
            {erroAcao && <p role="alert" className="mod-aviso mod-aviso-erro">{erroAcao}</p>}
            <div className="mod-form-grid">
              <div className="mod-largo"><PacienteSelect required value={pacienteId} onChange={id => setPacienteId(id)} /></div>
              <div className="form-group"><label htmlFor="ag-data">Data *</label><input id="ag-data" required name="data" type="date" defaultValue={filtroData} /></div>
              <div className="form-group"><label htmlFor="ag-hora">Horário *</label><input id="ag-hora" required name="hora" type="time" /></div>
              <div className="form-group"><label htmlFor="ag-tipo">Tipo *</label><input id="ag-tipo" required name="tipo" defaultValue="Consulta" maxLength={80} /></div>
              <div className="form-group"><label htmlFor="ag-especialidade">Especialidade *</label><input id="ag-especialidade" required name="especialidade" maxLength={100} /></div>
              <div className="form-group"><label htmlFor="ag-profissional">Profissional</label><input id="ag-profissional" name="profissional" maxLength={120} /></div>
              <div className="form-group"><label htmlFor="ag-sala">Sala</label><input id="ag-sala" name="sala" maxLength={80} /></div>
              <div className="form-group mod-largo"><label htmlFor="ag-obs">Observações</label><textarea id="ag-obs" name="observacoes" maxLength={1000} rows={3} /></div>
            </div>
            <ModalActions>
              <button type="button" className="btn btn-secondary" onClick={() => setCriando(false)}>Fechar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando || !pacienteId}>{salvando ? 'Salvando...' : 'Criar agendamento'}</button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
