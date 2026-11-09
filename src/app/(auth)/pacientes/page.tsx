'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, RiscoBadge, SearchInput, StatCard, StatGrid, Tabs } from '@/components/ui';
import { isTerminal, STATUS_PACIENTE } from '@/lib/paciente-status';
import { pode } from '@/lib/permissions';
import { calcularIdade, compararFilaClinica, formatarCPF, MANCHESTER_CORES, ORDEM_MANCHESTER, STATUS_ESPERA, STATUS_SAIDA } from '@/lib/utils';
import { acimaDoAlvo, erroDaApi, Espera, ModalChamada, StatusBadge, useAgora, useCargo } from './componentes';

interface Paciente {
  id: string;
  nome: string;
  cpf?: string | null;
  nascimento: string | null;
  status: string;
  classificacao: string | null;
  leitoTipo: string | null;
  leitoNumero: number | null;
  createdAt: string;
  esperaDesde: string;
}

const ITENS_POR_PAGINA = 15;

type Grupo = 'todos' | 'fila' | 'atendimento' | 'internados' | 'saida';

// Cinco grupos no lugar de onze abas; o filtro "Status" ainda alcança cada situação.
const GRUPOS: Record<Grupo, { label: string; status: readonly string[] | null }> = {
  todos: { label: 'Todos', status: null },
  fila: { label: 'Fila', status: STATUS_ESPERA },
  atendimento: { label: 'Atendimento', status: ['Em Atendimento Médico'] },
  internados: { label: 'Internados', status: ['Internado', 'Internado - UTI'] },
  saida: { label: 'Encerrados', status: STATUS_SAIDA },
};
const ORDEM_GRUPOS = Object.keys(GRUPOS) as Grupo[];

export default function PacientesPage() {
  const cargo = useCargo();
  const agora = useAgora();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [total, setTotal] = useState(0);
  const [grupo, setGrupo] = useState<Grupo>('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroManchester, setFiltroManchester] = useState('todos');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [chamando, setChamando] = useState<Paciente | null>(null);
  const [exportando, setExportando] = useState(false);

  const podeArquivar = pode(cargo, 'paciente:arquivar');
  const podeCadastrar = pode(cargo, 'paciente:editar');
  const podeRecepcao = pode(cargo, 'recepcao:operar');
  const podeChamar = pode(cargo, 'chamada:emitir');

  useEffect(() => {
    const timer = setTimeout(() => setBuscaAplicada(busca.trim()), 300);
    return () => clearTimeout(timer);
  }, [busca]);

  const consulta = useMemo(() => {
    const params = new URLSearchParams();
    if (mostrarArquivados) params.set('arquivados', '1');
    if (buscaAplicada) params.set('q', buscaAplicada);
    return params.toString();
  }, [mostrarArquivados, buscaAplicada]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/pacientes${consulta ? `?${consulta}` : ''}`, { signal: controller.signal });
        if (!res.ok) throw new Error(await erroDaApi(res, 'Não foi possível carregar os pacientes.'));
        const dados: unknown = await res.json();
        if (!Array.isArray(dados)) throw new Error('A resposta de pacientes é inválida.');
        setPacientes(dados as Paciente[]);
        setTotal(Number(res.headers.get('X-Total-Count')) || dados.length);
        setErroCarga('');
      } catch (error) {
        if (controller.signal.aborted) return;
        setPacientes([]);
        setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar os pacientes.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [consulta, recarga]);

  const recarregar = useCallback(() => setRecarga(n => n + 1), []);

  const noGrupo = useCallback((p: Paciente, id: Grupo) => {
    const status = GRUPOS[id].status;
    return !status || status.includes(p.status);
  }, []);

  const filtrados = useMemo(() => pacientes
    .filter(p => noGrupo(p, grupo)
      && (filtroStatus === 'todos' || p.status === filtroStatus)
      && (filtroManchester === 'todos' || p.classificacao === filtroManchester))
    .sort(compararFilaClinica), [pacientes, grupo, filtroStatus, filtroManchester, noGrupo]);

  const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA) || 1;
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  const contar = (status: readonly string[]) => pacientes.filter(p => status.includes(p.status)).length;
  const acimaAlvo = pacientes.filter(p => acimaDoAlvo(p, agora)).length;
  const statusDoGrupo = GRUPOS[grupo].status ?? STATUS_PACIENTE;

  const exportarCSV = async () => {
    setExportando(true);
    try {
      const params = new URLSearchParams(consulta);
      const statusExportacao = filtroStatus !== 'todos' ? [filtroStatus] : GRUPOS[grupo].status;
      statusExportacao?.forEach(status => params.append('status', status));
      if (filtroManchester !== 'todos') params.set('classificacao', filtroManchester);
      const res = await fetch(`/api/pacientes/exportar?${params}`);
      if (!res.ok) {
        alert(await erroDaApi(res, 'Não foi possível exportar.'));
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pacientes.csv';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert('Falha de conexão ao exportar.');
    } finally {
      setExportando(false);
    }
  };

  const arquivar = async (p: Paciente) => {
    if (!await confirm(`Arquivar ${p.nome}? O paciente sairá desta lista, mas o prontuário e os registros clínicos serão preservados.`)) return;
    try {
      const res = await fetch(`/api/pacientes/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        alert(await erroDaApi(res, 'Não foi possível arquivar o paciente.'));
        return;
      }
      recarregar();
    } catch {
      alert('Falha de conexão ao arquivar.');
    }
  };

  const restaurar = async (p: Paciente) => {
    try {
      const res = await fetch(`/api/pacientes/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arquivadoEm: null }),
      });
      if (!res.ok) {
        alert(await erroDaApi(res, 'Não foi possível restaurar o paciente.'));
        return;
      }
      recarregar();
    } catch {
      alert('Falha de conexão ao restaurar.');
    }
  };

  return (
    <div className="pac-pagina">
      <PageHeader
        icon="las la-user-injured"
        title="Pacientes"
        subtitle="Fila por gravidade e tempo de espera"
        actions={<>
          {podeArquivar && (
            <button type="button" className="btn btn-secondary" onClick={() => { setMostrarArquivados(v => !v); setPagina(1); setLoading(true); }}>
              <i className={`las ${mostrarArquivados ? 'la-users' : 'la-archive'}`} aria-hidden="true"></i> {mostrarArquivados ? 'Ativos' : 'Arquivados'}
            </button>
          )}
          {podeCadastrar && (
            <button type="button" className="btn btn-secondary" onClick={exportarCSV} disabled={exportando}>
              <i className="las la-file-csv" aria-hidden="true"></i> {exportando ? 'Exportando...' : 'Exportar CSV'}
            </button>
          )}
          <Link href="/gestao-salas" className="btn btn-secondary"><i className="las la-door-open" aria-hidden="true"></i> Salas</Link>
        </>}
      />

      <StatGrid>
        <StatCard icon="las la-users" value={total} label="Total" />
        <StatCard icon="las la-hourglass-half" tone="warning" alerta value={contar(STATUS_ESPERA)} label="Na fila" hint="Recepção, triagem e espera por médico" />
        <StatCard icon="las la-exclamation-circle" tone="danger" alerta value={acimaAlvo} label="Acima do alvo" hint="Pacientes aguardando mais que o tempo-alvo: Vermelho 0, Laranja 10, Amarelo 60, Verde 120 e Azul 240 min; sem classificação de risco registrada, 60 min." />
        <StatCard icon="las la-stethoscope" value={contar(GRUPOS.atendimento.status ?? [])} label="Em atendimento" />
        <StatCard icon="las la-bed" value={contar(GRUPOS.internados.status ?? [])} label="Internados" />
      </StatGrid>

      <Tabs
        label="Grupos da fila"
        active={grupo}
        onChange={id => { setGrupo(id); setFiltroStatus('todos'); setPagina(1); }}
        tabs={ORDEM_GRUPOS.map(id => ({ id, label: `${GRUPOS[id].label} (${pacientes.filter(p => noGrupo(p, id)).length})` }))}
      />

      <Panel>
        <div className="pac-filtros">
          <SearchInput value={busca} onChange={v => { setBusca(v); setPagina(1); }} placeholder="Nome ou CPF" label="Buscar paciente por nome ou CPF" />
          <div className="form-group">
            <label htmlFor="pac-filtro-status">Status</label>
            <select id="pac-filtro-status" value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }}>
              <option value="todos">Todos</option>
              {statusDoGrupo.map(s => <option key={s} value={s}>{s} ({pacientes.filter(p => p.status === s).length})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="pac-filtro-risco">Classificação</label>
            <select id="pac-filtro-risco" value={filtroManchester} onChange={e => { setFiltroManchester(e.target.value); setPagina(1); }}>
              <option value="todos">Todas</option>
              {ORDEM_MANCHESTER.filter(cor => MANCHESTER_CORES[cor]).map(cor => (
                <option key={cor} value={cor}>{cor} ({pacientes.filter(p => p.classificacao === cor).length})</option>
              ))}
            </select>
          </div>
        </div>
        {total > pacientes.length && (
          <p className="mod-aviso mod-aviso-atencao pac-aviso" role="status">Mostrando {pacientes.length} de {total} pacientes. Refine a busca para encontrar os demais.</p>
        )}
      </Panel>

      <Panel>
        {loading ? (
          <LoadingState message="Carregando pacientes..." />
        ) : erroCarga ? (
          <ErrorState message={erroCarga} onRetry={recarregar} />
        ) : paginados.length === 0 ? (
          <EmptyState icon="las la-user-slash" message="Nenhum paciente encontrado. Pacientes entram pela Recepção."
            action={podeRecepcao && !mostrarArquivados ? <Link href="/recepcao" className="btn btn-secondary"><i className="las la-concierge-bell" aria-hidden="true"></i> Ir para a Recepção</Link> : undefined} />
        ) : (
          <>
            <div className="tabela-wrapper pac-fila-wrapper">
              <table className="tabela pac-fila">
                <caption className="sr-only">Pacientes ordenados por gravidade e tempo de espera</caption>
                <thead>
                  <tr>
                    <th scope="col">Risco</th><th scope="col">Paciente</th><th scope="col">Espera</th>
                    <th scope="col">Status</th><th scope="col">Leito</th><th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map(p => (
                    <tr key={p.id}>
                      <td className="pac-c-risco"><RiscoBadge classificacao={p.classificacao} /></td>
                      <td className="pac-c-nome">
                        <strong className="pac-nome">{p.nome}</strong>
                        <span className="pac-sub">
                          {p.nascimento ? `${calcularIdade(p.nascimento)} anos` : 'Idade não informada'} · {p.cpf ? formatarCPF(p.cpf) : 'CPF não informado'}
                        </span>
                      </td>
                      <td className="pac-c-espera"><Espera status={p.status} desde={p.esperaDesde} classificacao={p.classificacao} agora={agora} /></td>
                      <td className="pac-c-status"><StatusBadge status={p.status} /></td>
                      <td className="pac-c-leito" data-rotulo="Leito">{p.leitoTipo ? `${p.leitoTipo} ${p.leitoNumero ?? ''}` : '-'}</td>
                      <td className="pac-c-acoes">
                        <div className="pac-acoes">
                          {!mostrarArquivados && (
                            <Link href={`/pacientes/${p.id}`} className="btn btn-primary btn-xs" aria-label={`Abrir ficha de ${p.nome}`}>
                              <i className="las la-eye" aria-hidden="true"></i> Ficha
                            </Link>
                          )}
                          {podeChamar && !mostrarArquivados && !isTerminal(p.status) && (
                            <button type="button" className="btn btn-success btn-xs" aria-label={`Chamar ${p.nome} no painel`} onClick={() => setChamando(p)}>
                              <i className="las la-bullhorn" aria-hidden="true"></i> Chamar
                            </button>
                          )}
                          {podeArquivar && (mostrarArquivados ? (
                            <button type="button" className="btn btn-secondary btn-xs" aria-label={`Restaurar ${p.nome}`} onClick={() => restaurar(p)}>
                              <i className="las la-undo" aria-hidden="true"></i> Restaurar
                            </button>
                          ) : (
                            <button type="button" className="btn btn-secondary btn-xs pac-perigo" aria-label={`Arquivar ${p.nome}`} onClick={() => arquivar(p)}>
                              <i className="las la-archive" aria-hidden="true"></i> Arquivar
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <nav className="pac-paginacao" aria-label="Paginação">
                <button type="button" className="btn btn-secondary btn-sm" aria-label="Página anterior" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}><i className="las la-angle-left" aria-hidden="true"></i></button>
                <span>Página {paginaAtual} de {totalPaginas}</span>
                <button type="button" className="btn btn-secondary btn-sm" aria-label="Próxima página" disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}><i className="las la-angle-right" aria-hidden="true"></i></button>
              </nav>
            )}
          </>
        )}
      </Panel>

      {chamando && <ModalChamada paciente={chamando} onFechar={() => setChamando(null)} />}
    </div>
  );
}
