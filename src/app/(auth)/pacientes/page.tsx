'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs } from '@/components/ui';
import { isTerminal } from '@/lib/paciente-status';
import { pode } from '@/lib/permissions';
import { calcularIdade, compararFilaClinica, formatarCPF, getIniciais, MANCHESTER_CORES, ORDEM_MANCHESTER } from '@/lib/utils';
import { erroDaApi, EsperaBadge, ManchesterBadge, ModalChamada, ModalNovoPaciente, StatusBadge, useAgora, useCargo } from './componentes';

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

const STATUS_FILTRO = [
  { id: 'todos', label: 'Todos' },
  { id: 'Recepção', label: 'Recepção' },
  { id: 'Aguardando Triagem', label: 'Aguardando' },
  { id: 'Em Triagem', label: 'Triagem' },
  { id: 'Aguardando Médico', label: 'Ag. Médico' },
  { id: 'Em Atendimento Médico', label: 'Atendimento' },
  { id: 'Internado', label: 'Internados' },
  { id: 'Internado - UTI', label: 'UTI' },
  { id: 'Alta Médica', label: 'Alta' },
  { id: 'Evasão', label: 'Evasão' },
  { id: 'Óbito', label: 'Óbito' },
] as const;

export default function PacientesPage() {
  const cargo = useCargo();
  const agora = useAgora();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [total, setTotal] = useState(0);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroManchester, setFiltroManchester] = useState('todos');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [modalNovo, setModalNovo] = useState(false);
  const [chamando, setChamando] = useState<Paciente | null>(null);
  const [exportando, setExportando] = useState(false);

  const podeArquivar = pode(cargo, 'paciente:arquivar');
  const podeCadastrar = pode(cargo, 'paciente:cadastrar');
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

  const filtrados = useMemo(() => pacientes
    .filter(p => (filtroStatus === 'todos' || p.status === filtroStatus)
      && (filtroManchester === 'todos' || p.classificacao === filtroManchester))
    .sort(compararFilaClinica), [pacientes, filtroStatus, filtroManchester]);

  const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA) || 1;
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  const contar = (status: string[]) => pacientes.filter(p => status.includes(p.status)).length;

  const exportarCSV = async () => {
    setExportando(true);
    try {
      const params = new URLSearchParams(consulta);
      if (filtroStatus !== 'todos') params.set('status', filtroStatus);
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
        subtitle="Fila clínica por gravidade e tempo de espera"
        actions={<>
          {podeArquivar && (
            <button type="button" className="btn pac-btn-sec" onClick={() => { setMostrarArquivados(v => !v); setPagina(1); setLoading(true); }}>
              <i className={`las ${mostrarArquivados ? 'la-users' : 'la-archive'}`} aria-hidden="true"></i> {mostrarArquivados ? 'Pacientes ativos' : 'Arquivados'}
            </button>
          )}
          {podeCadastrar && !mostrarArquivados && (
            <button type="button" className="btn btn-primary" onClick={() => setModalNovo(true)}>
              <i className="las la-plus" aria-hidden="true"></i> Novo paciente
            </button>
          )}
          {podeCadastrar && (
            <button type="button" className="btn pac-btn-sec" onClick={exportarCSV} disabled={exportando}>
              <i className="las la-file-csv" aria-hidden="true"></i> {exportando ? 'Exportando...' : 'Exportar CSV'}
            </button>
          )}
          <Link href="/gestao-salas" className="btn pac-btn-sec"><i className="las la-door-open" aria-hidden="true"></i> Salas</Link>
        </>}
      />

      <StatGrid>
        <StatCard icon="las la-users" value={total} label="Total" />
        <StatCard icon="las la-hourglass-half" tone="warning" value={contar(['Aguardando Triagem', 'Aguardando Médico'])} label="Aguardando" />
        <StatCard icon="las la-stethoscope" value={contar(['Em Triagem', 'Em Atendimento Médico'])} label="Em atendimento" />
        <StatCard icon="las la-bed" tone="danger" value={contar(['Internado', 'Internado - UTI'])} label="Internados" />
      </StatGrid>

      <Tabs
        label="Filtrar por status"
        active={filtroStatus}
        onChange={id => { setFiltroStatus(id); setPagina(1); }}
        tabs={STATUS_FILTRO.map(s => ({ id: s.id as string, label: `${s.label} (${s.id === 'todos' ? pacientes.length : contar([s.id])})` }))}
      />

      <Panel>
        <div className="pac-filtros">
          <SearchInput value={busca} onChange={v => { setBusca(v); setPagina(1); }} placeholder="Buscar por nome ou CPF..." label="Buscar paciente por nome ou CPF" />
          <select aria-label="Filtrar por classificação de risco" value={filtroManchester} onChange={e => { setFiltroManchester(e.target.value); setPagina(1); }}>
            <option value="todos">Todas as classificações</option>
            {ORDEM_MANCHESTER.filter(cor => MANCHESTER_CORES[cor]).map(cor => (
              <option key={cor} value={cor}>{cor} ({pacientes.filter(p => p.classificacao === cor).length})</option>
            ))}
          </select>
        </div>
        {total > pacientes.length && (
          <p className="pac-aviso" role="status">Mostrando {pacientes.length} de {total} pacientes. Refine a busca para encontrar os demais.</p>
        )}
      </Panel>

      <Panel>
        {loading ? (
          <LoadingState message="Carregando pacientes..." />
        ) : erroCarga ? (
          <ErrorState message={erroCarga} onRetry={recarregar} />
        ) : paginados.length === 0 ? (
          <EmptyState icon="las la-user-slash" message="Nenhum paciente encontrado." />
        ) : (
          <>
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Paciente</th><th scope="col">Identificação</th><th scope="col">Classificação</th>
                    <th scope="col">Status</th><th scope="col">Leito</th><th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map(p => (
                    <tr key={p.id}>
                      <td>
                        <span className="pac-nome">
                          <span className="pac-avatar" aria-hidden="true">{getIniciais(p.nome)}</span>
                          {p.nome}
                        </span>
                      </td>
                      <td>
                        {p.cpf ? formatarCPF(p.cpf) : 'CPF não informado'}
                        <span className="pac-sub">{p.nascimento ? `${calcularIdade(p.nascimento)} anos` : 'Idade não informada'}</span>
                      </td>
                      <td><ManchesterBadge classificacao={p.classificacao} /></td>
                      <td>
                        <StatusBadge status={p.status} />
                        <EsperaBadge status={p.status} desde={p.esperaDesde} agora={agora} />
                      </td>
                      <td>{p.leitoTipo ? `${p.leitoTipo} ${p.leitoNumero ?? ''}` : '-'}</td>
                      <td>
                        <div className="pac-acoes">
                          {podeChamar && !mostrarArquivados && !isTerminal(p.status) && (
                            <button type="button" className="btn btn-success btn-xs" aria-label={`Chamar ${p.nome} no painel`} title="Chamar no painel" onClick={() => setChamando(p)}>
                              <i className="las la-bullhorn" aria-hidden="true"></i>
                            </button>
                          )}
                          {!mostrarArquivados && (
                            <Link href={`/pacientes/${p.id}`} className="btn btn-primary btn-xs" aria-label={`Abrir ficha de ${p.nome}`} title="Abrir ficha">
                              <i className="las la-eye" aria-hidden="true"></i>
                            </Link>
                          )}
                          {podeArquivar && (mostrarArquivados ? (
                            <button type="button" className="btn btn-primary btn-xs" onClick={() => restaurar(p)}>
                              <i className="las la-undo" aria-hidden="true"></i> Restaurar
                            </button>
                          ) : (
                            <button type="button" className="btn btn-danger btn-xs" onClick={() => arquivar(p)}>
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
                <button type="button" aria-label="Página anterior" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}><i className="las la-angle-left" aria-hidden="true"></i></button>
                <span>Página {paginaAtual} de {totalPaginas}</span>
                <button type="button" aria-label="Próxima página" disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}><i className="las la-angle-right" aria-hidden="true"></i></button>
              </nav>
            )}
          </>
        )}
      </Panel>

      {modalNovo && <ModalNovoPaciente permitirInternacao onFechar={() => setModalNovo(false)} onCriado={() => { setModalNovo(false); recarregar(); }} />}
      {chamando && <ModalChamada paciente={chamando} onFechar={() => setChamando(null)} />}
    </div>
  );
}
