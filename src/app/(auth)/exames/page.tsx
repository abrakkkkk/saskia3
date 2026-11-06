'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import PacienteSelect, { formatarNascimento } from '@/components/ui/PacienteSelect';
import { pode } from '@/lib/permissions';
import { enviarJson, mensagemErro, textoDoErro } from '@/lib/resposta';
import '@/components/ui/modulo.css';
import './exames.css';

interface Exame {
  id: string;
  tipo: string;
  pacienteId: string;
  paciente: { nome: string; nascimento?: string | null };
  nome: string;
  status: string;
  resultado: string | null;
  observacoes: string | null;
  prioridade: string | null;
  indicacao: string | null;
  profissional: string | null;
  solicitante: { nome: string } | null;
  liberadoPor: { nome: string } | null;
  liberadoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

type Contadores = { laboratorio: number; imagem: number; pendentes: number; concluidosHoje: number; criticos: number };
type RespostaExames = { itens: Exame[]; total: number; pagina: number; limite: number; contadores: Contadores; ultimosCriticos: Exame[] };
type Aba = 'solicitacao' | 'listagem' | 'resultados';

const POR_PAGINA = 20;
const STATUS: Record<string, { nome: string; tom: Tone }> = {
  SOLICITADO: { nome: 'Solicitado', tom: 'info' },
  AGENDADO: { nome: 'Agendado', tom: 'info' },
  COLETADO: { nome: 'Coletado', tom: 'neutral' },
  EM_ANALISE: { nome: 'Em análise', tom: 'warning' },
  CONCLUIDO: { nome: 'Concluído', tom: 'success' },
  CANCELADO: { nome: 'Cancelado', tom: 'neutral' },
  ALTERADO_CRITICO: { nome: 'Crítico', tom: 'danger' },
};

function tipoNormalizado(tipo: string) {
  const valor = tipo.trim().toLocaleLowerCase('pt-BR');
  if (valor === 'laboratorio' || valor === 'laboratorial') return 'laboratorio';
  if (valor === 'imagem' || valor === 'imagens') return 'imagem';
  return valor;
}

const rotuloTipo = (tipo: string) => (tipoNormalizado(tipo) === 'imagem' ? 'Imagem' : 'Lab');
const nomeSolicitante = (exame: Exame) => exame.solicitante?.nome || exame.profissional || '-';
const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS[status]?.tom ?? 'neutral'}>{STATUS[status]?.nome ?? status}</Badge>;

function Prioridade({ valor }: { valor: string | null }) {
  if (!valor) return <>-</>;
  const chave = valor.trim().toLocaleLowerCase('pt-BR');
  if (chave === 'emergência' || chave === 'emergencia') return <Badge tone="danger">{valor}</Badge>;
  if (chave === 'urgente') return <Badge tone="warning">{valor}</Badge>;
  return <>{valor}</>;
}

function liberacao(exame: Exame) {
  if (!exame.liberadoPor) return 'Liberação sem autor registrado';
  const quando = exame.liberadoEm ? ` em ${new Date(exame.liberadoEm).toLocaleString('pt-BR')}` : '';
  return `Liberado por ${exame.liberadoPor.nome}${quando}`;
}

const examesDisponiveis: Record<string, string[]> = {
  laboratorio: ["Hemograma Completo","Glicemia de Jejum","HbA1c","Colesterol Total e Frações","Triglicerídeos","TGO/AST","TGP/ALT","Creatinina","Ureia","Ácido Úrico","TSH","T4 Livre","PSA Total","VHS","PCR","TAP/INR","KPTT","Gasometria Arterial","Eletrólitos (Na/K/Ca/Mg)","Sumário de Urina (EAS)","Urocultura com Antibiograma","Hemocultura","Sorologia COVID-19","Sorologia Dengue","Teste Rápido HIV/Sífilis","Marcadores Cardíacos (Troponina/CK-MB)"],
  imagem: ["Raio-X de Tórax (PA e Perfil)","Raio-X de Abdome","Raio-X de Crânio","Raio-X de Coluna Cervical","Raio-X de Coluna Lombar","Raio-X de Seios da Face","Raio-X de Membros","Tomografia de Crânio","Tomografia de Tórax","Tomografia de Abdome","Tomografia de Coluna","Ressonância de Crânio","Ressonância de Coluna","Ressonância de Joelho","Ultrassonografia Abdominal","Ultrassonografia Pélvica","Ultrassonografia Obstétrica","Doppler Venoso de MMII","Ecocardiograma","Eletrocardiograma (ECG)","Mamografia","Densitometria Óssea"]
};

export default function ExamesPage() {
  const { data: session } = useSession();
  const cargo = session?.user?.cargo;
  const podeSolicitar = pode(cargo, 'exame:solicitar');
  const podeColetar = pode(cargo, 'exame:coletar');
  const podeLaudar = pode(cargo, 'exame:laudar');

  const abas = [
    ...(podeSolicitar ? [{ id: 'solicitacao' as const, label: 'Solicitações', icon: 'las la-plus-circle' }] : []),
    { id: 'listagem' as const, label: 'Listagem', icon: 'las la-list' },
    ...(podeLaudar ? [{ id: 'resultados' as const, label: 'Resultados', icon: 'las la-clipboard-check' }] : []),
  ];
  const [abaEscolhida, setActiveTab] = useState<Aba>('solicitacao');
  const activeTab = abas.some(aba => aba.id === abaEscolhida) ? abaEscolhida : 'listagem';

  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [aviso, setAviso] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [dados, setDados] = useState<RespostaExames | null>(null);
  const [fila, setFila] = useState<Exame[]>([]);
  const [concluidos, setConcluidos] = useState<Exame[]>([]);

  const [solTipo, setSolTipo] = useState('laboratorio');
  const [solPacienteId, setSolPacienteId] = useState('');
  const [solExame, setSolExame] = useState('');
  const [solPrioridade, setSolPrioridade] = useState('Normal');
  const [solIndicacao, setSolIndicacao] = useState('');

  const [buscarExame, setBuscarExame] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [pagina, setPagina] = useState(1);

  const [resExameId, setResExameId] = useState('');
  const [resValor, setResValor] = useState('');
  const [resStatus, setResStatus] = useState('CONCLUIDO');

  const [modalLaudo, setModalLaudo] = useState<Exame | null>(null);

  const carregarLista = useCallback(async () => {
    const parametros = new URLSearchParams({ pagina: String(pagina), limite: String(POR_PAGINA) });
    if (filtroTipo !== 'todos') parametros.set('tipo', filtroTipo);
    if (filtroStatus !== 'todos') parametros.set('status', filtroStatus);
    if (buscarExame.trim()) parametros.set('busca', buscarExame.trim());
    try {
      const resposta = await fetch(`/api/exames?${parametros}`);
      if (!resposta.ok) throw new Error(await mensagemErro(resposta, 'Não foi possível carregar os exames.'));
      setDados(await resposta.json());
      setErroCarga('');
    } catch (erro) {
      setErroCarga(textoDoErro(erro, 'Não foi possível carregar os exames.'));
    } finally {
      setLoading(false);
    }
  }, [pagina, filtroTipo, filtroStatus, buscarExame]);

  const carregarResultados = useCallback(async () => {
    try {
      const [resFila, resConcluidos] = await Promise.all([
        fetch('/api/exames?fila=laudo&limite=100'),
        fetch('/api/exames?status=CONCLUIDO&limite=10'),
      ]);
      if (!resFila.ok) throw new Error(await mensagemErro(resFila, 'Não foi possível carregar a fila de resultados.'));
      if (!resConcluidos.ok) throw new Error(await mensagemErro(resConcluidos, 'Não foi possível carregar os resultados recentes.'));
      const [dadosFila, dadosConcluidos] = await Promise.all([resFila.json(), resConcluidos.json()]);
      setFila(dadosFila.itens);
      setConcluidos(dadosConcluidos.itens);
    } catch (erro) {
      setErroCarga(textoDoErro(erro, 'Não foi possível carregar os resultados.'));
    }
  }, []);

  // A busca espera a digitação parar antes de consultar o servidor.
  useEffect(() => {
    const espera = window.setTimeout(() => { void carregarLista(); }, 300);
    return () => window.clearTimeout(espera);
  }, [carregarLista]);

  // Carga inicial: o setState só ocorre depois do await da requisição.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregarResultados(); }, [carregarResultados]);

  const recarregar = () => Promise.all([carregarLista(), carregarResultados()]);

  const limparMensagens = () => { setAviso(''); setErroAcao(''); };

  const abrirSolicitacao = (tipo: string) => {
    setSolTipo(tipo);
    setSolExame('');
    setActiveTab('solicitacao');
  };

  const selecionarParaResultado = (id: string, exame?: Exame) => {
    setResExameId(id);
    // Exame antigo pode ter resultado gravado na solicitação: serve de ponto de partida do laudo.
    setResValor(exame?.resultado ?? fila.find(item => item.id === id)?.resultado ?? '');
  };

  const solicitarExame = async (evento: FormEvent) => {
    evento.preventDefault();
    limparMensagens();
    if (!solPacienteId || !solExame) {
      setErroAcao('Preencha todos os campos obrigatórios (*).');
      return;
    }
    setSalvando(true);
    try {
      await enviarJson('/api/exames', 'POST', {
        pacienteId: solPacienteId, tipo: solTipo, nome: solExame,
        prioridade: solPrioridade, indicacao: solIndicacao.trim(),
      }, 'Não foi possível solicitar o exame.');
      setSolPacienteId(''); setSolExame(''); setSolIndicacao(''); setSolPrioridade('Normal');
      setAviso('Exame solicitado.');
      await recarregar();
    } catch (erro) {
      setErroAcao(textoDoErro(erro, 'Não foi possível solicitar o exame.'));
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatus = async (id: string, status: 'COLETADO' | 'CANCELADO') => {
    limparMensagens();
    if (status === 'CANCELADO' && !(await confirm('Cancelar este exame?'))) return;
    try {
      await enviarJson(`/api/exames/${id}`, 'PUT', { status }, 'Não foi possível atualizar o exame.');
      setAviso(status === 'COLETADO' ? 'Coleta registrada.' : 'Exame cancelado.');
      await recarregar();
    } catch (erro) {
      setErroAcao(textoDoErro(erro, 'Não foi possível atualizar o exame.'));
    }
  };

  const lancarResultado = async (evento: FormEvent) => {
    evento.preventDefault();
    limparMensagens();
    if (!resExameId || !resValor.trim()) {
      setErroAcao('Selecione o exame e informe o resultado.');
      return;
    }
    setSalvando(true);
    try {
      await enviarJson(`/api/exames/${resExameId}`, 'PUT', { status: resStatus, resultado: resValor.trim() }, 'Não foi possível lançar o resultado.');
      setResExameId(''); setResValor('');
      setAviso(resStatus === 'ALTERADO_CRITICO'
        ? 'Resultado crítico registrado. O sistema não notifica ninguém automaticamente: acione o protocolo institucional.'
        : 'Resultado lançado.');
      setResStatus('CONCLUIDO');
      await recarregar();
    } catch (erro) {
      setErroAcao(textoDoErro(erro, 'Não foi possível lançar o resultado.'));
    } finally {
      setSalvando(false);
    }
  };

  const cabecalho = (
    <PageHeader
      icon="las la-flask"
      title="Exames"
      subtitle="Laboratório e imagem"
      actions={!loading && podeSolicitar && <>
        <button type="button" className="btn btn-secondary" onClick={() => abrirSolicitacao('imagem')}><i className="las la-x-ray" aria-hidden="true"></i> Solicitar imagem</button>
        <button type="button" className="btn btn-primary" onClick={() => abrirSolicitacao('laboratorio')}><i className="las la-flask" aria-hidden="true"></i> Solicitar laboratório</button>
      </>}
    />
  );

  if (loading) return <div className="conteudo mod-pagina">{cabecalho}<LoadingState message="Carregando exames..." /></div>;

  const contadores = dados?.contadores;
  const total = dados?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const criticos = dados?.ultimosCriticos ?? [];

  return (
    <div className="conteudo mod-pagina">
      {cabecalho}

      {erroCarga && <ErrorState message={erroCarga} onRetry={() => void recarregar()} />}
      {aviso && <p className="mod-aviso mod-aviso-sucesso" role="status">{aviso}</p>}
      {erroAcao && <p className="mod-aviso mod-aviso-erro" role="alert">{erroAcao}</p>}

      {criticos.length > 0 && (
        <section className="mod-aviso mod-aviso-erro exames-criticos" aria-label="Resultados críticos">
          <strong><i className="las la-exclamation-triangle" aria-hidden="true"></i> {contadores?.criticos} {contadores?.criticos === 1 ? 'resultado crítico registrado' : 'resultados críticos registrados'}</strong>
          <p>Este destaque não substitui a comunicação: o sistema não notifica ninguém automaticamente. Siga o protocolo institucional.</p>
          <ul>
            {criticos.map(exame => (
              <li key={exame.id}>
                <button type="button" className="exames-link" onClick={() => setModalLaudo(exame)}>{exame.paciente.nome}: {exame.nome}</button>
                {' '}<span>({liberacao(exame)})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StatGrid>
        <StatCard icon="las la-flask" value={contadores?.laboratorio ?? '-'} label="Laboratório" hint="Exames laboratoriais" />
        <StatCard icon="las la-x-ray" value={contadores?.imagem ?? '-'} label="Imagem" hint="Exames de imagem" />
        <StatCard icon="las la-clock" value={contadores?.pendentes ?? '-'} label="Pendentes" tone="warning" alerta hint="Exames aguardando coleta ou resultado" />
        <StatCard icon="las la-check-circle" value={contadores?.concluidosHoje ?? '-'} label="Concluídos hoje" />
        <StatCard icon="las la-exclamation-triangle" value={contadores?.criticos ?? '-'} label="Críticos" tone="danger" alerta hint="Resultados críticos registrados" />
      </StatGrid>

      <Tabs tabs={abas} active={activeTab} onChange={setActiveTab} label="Seções de exames" />

      {activeTab === 'solicitacao' && (
        <Panel title={solTipo === 'imagem' ? 'Solicitar exame de imagem' : 'Solicitar exame laboratorial'} icon={solTipo === 'imagem' ? 'las la-x-ray' : 'las la-flask'}>
          <form onSubmit={solicitarExame}>
            <PacienteSelect value={solPacienteId} onChange={id => setSolPacienteId(id)} required />
            <div className="mod-form-grid">
              <div className="form-group">
                <label htmlFor="sol-tipo">Tipo de exame *</label>
                <select id="sol-tipo" value={solTipo} onChange={e => { setSolTipo(e.target.value); setSolExame(''); }}>
                  <option value="laboratorio">Laboratorial</option>
                  <option value="imagem">Imagem / Radiologia</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sol-exame">Exame *</label>
                <select id="sol-exame" value={solExame} onChange={e => setSolExame(e.target.value)}>
                  <option value="">Selecione...</option>
                  {(examesDisponiveis[solTipo] || []).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-group"><label htmlFor="sol-prioridade">Prioridade</label><select id="sol-prioridade" value={solPrioridade} onChange={e => setSolPrioridade(e.target.value)}><option>Normal</option><option>Urgente</option><option>Emergência</option></select></div>
              <div className="form-group mod-largo"><label htmlFor="sol-indicacao">Indicação clínica</label><textarea id="sol-indicacao" rows={2} maxLength={2000} placeholder="Informações clínicas relevantes" value={solIndicacao} onChange={e => setSolIndicacao(e.target.value)}></textarea></div>
            </div>
            <div className="mod-acoes"><button type="submit" className="btn btn-primary" disabled={salvando}><i className="las la-paper-plane" aria-hidden="true"></i> {salvando ? 'Solicitando...' : 'Solicitar exame'}</button></div>
          </form>
        </Panel>
      )}

      {activeTab === 'listagem' && (
        <Panel>
          <div className="mod-filtros">
            <SearchInput value={buscarExame} onChange={valor => { setBuscarExame(valor); setPagina(1); }} placeholder="Buscar paciente ou exame" />
            <select aria-label="Filtrar por tipo" value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1); }}><option value="todos">Todos os tipos</option><option value="laboratorio">Laboratório</option><option value="imagem">Imagem</option></select>
            <select aria-label="Filtrar por status" value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }}>
              <option value="todos">Todos os status</option>
              {Object.entries(STATUS).map(([valor, { nome }]) => <option key={valor} value={valor}>{nome}</option>)}
            </select>
          </div>
          {(dados?.itens.length ?? 0) === 0 ? <EmptyState icon="las la-flask" message="Nenhum exame encontrado." /> : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <caption className="sr-only">Exames solicitados</caption>
                <thead><tr><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Paciente</th><th scope="col">Exame</th><th scope="col">Prioridade</th><th scope="col">Solicitante</th><th scope="col">Status</th><th scope="col">Ações</th></tr></thead>
                <tbody>
                  {dados?.itens.map(e => {
                    const aberto = ['SOLICITADO', 'AGENDADO', 'COLETADO', 'EM_ANALISE'].includes(e.status);
                    return (
                      <tr key={e.id} className={e.status === 'ALTERADO_CRITICO' ? 'mod-linha-critica' : undefined}>
                        <td>{new Date(e.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td><Badge tone="info">{rotuloTipo(e.tipo)}</Badge></td>
                        <td><strong>{e.paciente.nome}</strong><span className="mod-secundario">{formatarNascimento(e.paciente.nascimento)}</span></td>
                        <td>{e.nome}</td>
                        <td><Prioridade valor={e.prioridade} /></td>
                        <td>{nomeSolicitante(e)}</td>
                        <td><StatusBadge status={e.status} /></td>
                        <td>
                          <div className="mod-acoes-tabela">
                            <button type="button" className="btn btn-xs btn-secondary" aria-label={`Ver exame ${e.nome} de ${e.paciente.nome}`} onClick={() => setModalLaudo(e)}><i className="las la-eye" aria-hidden="true"></i> Ver</button>
                            {podeColetar && (e.status === 'SOLICITADO' || e.status === 'AGENDADO') && <button type="button" className="btn btn-xs btn-primary" aria-label={`Coletar ${e.nome} de ${e.paciente.nome}`} onClick={() => void alterarStatus(e.id, 'COLETADO')}><i className="las la-syringe" aria-hidden="true"></i> Coletar</button>}
                            {podeLaudar && (e.status === 'COLETADO' || e.status === 'EM_ANALISE') && <button type="button" className="btn btn-xs btn-primary" aria-label={`Resultado de ${e.nome} de ${e.paciente.nome}`} onClick={() => { selecionarParaResultado(e.id, e); setActiveTab('resultados'); }}><i className="las la-check" aria-hidden="true"></i> Resultado</button>}
                            {podeSolicitar && aberto && <button type="button" className="btn btn-xs btn-secondary" aria-label={`Cancelar ${e.nome} de ${e.paciente.nome}`} onClick={() => void alterarStatus(e.id, 'CANCELADO')}><i className="las la-times" aria-hidden="true"></i> Cancelar</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <nav className="mod-paginacao" aria-label="Paginação de exames">
            <span>{total} {total === 1 ? 'exame' : 'exames'}. Página {pagina} de {totalPaginas}.</span>
            <span className="mod-acoes-tabela">
              <button type="button" className="btn btn-sm btn-secondary" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
              <button type="button" className="btn btn-sm btn-secondary" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</button>
            </span>
          </nav>
        </Panel>
      )}

      {activeTab === 'resultados' && (
        <>
          <Panel title="Lançar resultado" icon="las la-clipboard-check">
            <form onSubmit={lancarResultado}>
              <div className="mod-form-grid">
                <div className="form-group mod-largo">
                  <label htmlFor="res-exame">Exame coletado *</label>
                  <select id="res-exame" value={resExameId} onChange={e => selecionarParaResultado(e.target.value)}>
                    <option value="">{fila.length ? 'Selecione o exame...' : 'Nenhum exame aguardando resultado'}</option>
                    {fila.map(e => <option key={e.id} value={e.id}>{e.paciente.nome} ({formatarNascimento(e.paciente.nascimento)}): {e.nome} | {STATUS[e.status]?.nome ?? e.status}</option>)}
                  </select>
                </div>
                <div className="form-group"><label htmlFor="res-status">Classificação</label><select id="res-status" value={resStatus} onChange={e => setResStatus(e.target.value)}><option value="CONCLUIDO">Normal / Concluído</option><option value="ALTERADO_CRITICO">Alterado / Crítico</option></select></div>
                <div className="form-group mod-largo"><label htmlFor="res-valor">Resultado e laudo *</label><textarea id="res-valor" rows={4} maxLength={5000} placeholder="Valores, descrição e conclusão do exame" value={resValor} onChange={e => setResValor(e.target.value)}></textarea></div>
              </div>
              <div className="mod-acoes"><button type="submit" className="btn btn-primary" disabled={salvando}><i className="las la-save" aria-hidden="true"></i> {salvando ? 'Salvando...' : 'Lançar resultado'}</button></div>
            </form>
          </Panel>

          <Panel title="Resultados recentes" icon="las la-history">
            {concluidos.length === 0 ? <EmptyState message="Nenhum resultado lançado." /> : (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <caption className="sr-only">Resultados lançados recentemente</caption>
                  <thead><tr><th scope="col">Paciente</th><th scope="col">Exame</th><th scope="col">Tipo</th><th scope="col">Resultado</th><th scope="col">Liberação</th><th scope="col">Ações</th></tr></thead>
                  <tbody>
                    {concluidos.map(e => (
                      <tr key={e.id}>
                        <td><strong>{e.paciente.nome}</strong></td>
                        <td>{e.nome}</td>
                        <td><Badge tone="info">{rotuloTipo(e.tipo)}</Badge></td>
                        <td><span className="exames-resumo">{e.resultado}</span></td>
                        <td>{liberacao(e)}</td>
                        <td><button type="button" className="btn btn-xs btn-secondary" aria-label={`Ver detalhes de ${e.nome} de ${e.paciente.nome}`} onClick={() => setModalLaudo(e)}><i className="las la-file-alt" aria-hidden="true"></i> Detalhes</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {modalLaudo && (
        <Modal title="Exame e resultado" icon="las la-file-alt" size="lg" onClose={() => setModalLaudo(null)}>
          <dl className="exames-laudo-dados">
            <dt>Paciente</dt><dd>{modalLaudo.paciente.nome} ({formatarNascimento(modalLaudo.paciente.nascimento)})</dd>
            <dt>Exame</dt><dd>{modalLaudo.nome}</dd>
            <dt>Tipo</dt><dd>{rotuloTipo(modalLaudo.tipo)}</dd>
            <dt>Status</dt><dd><StatusBadge status={modalLaudo.status} /></dd>
            <dt>Prioridade</dt><dd>{modalLaudo.prioridade || 'Não registrada'}</dd>
            <dt>Solicitante</dt><dd>{nomeSolicitante(modalLaudo)}</dd>
            <dt>Solicitado em</dt><dd>{new Date(modalLaudo.createdAt).toLocaleString('pt-BR')}</dd>
          </dl>
          {modalLaudo.indicacao && <div className="exames-laudo-bloco"><h3>Indicação clínica</h3><p className="mod-texto-longo">{modalLaudo.indicacao}</p></div>}
          {modalLaudo.observacoes && <div className="exames-laudo-bloco"><h3>Observações (registro anterior)</h3><p className="mod-texto-longo">{modalLaudo.observacoes}</p></div>}
          <div className={`exames-laudo-bloco${modalLaudo.status === 'ALTERADO_CRITICO' ? ' mod-aviso mod-aviso-erro' : ''}`}>
            <h3>{modalLaudo.status === 'ALTERADO_CRITICO' ? 'Resultado crítico' : 'Resultado'}</h3>
            <p className="mod-texto-longo">{modalLaudo.resultado || 'Aguardando'}</p>
            {(modalLaudo.status === 'CONCLUIDO' || modalLaudo.status === 'ALTERADO_CRITICO') && <span className="mod-secundario">{liberacao(modalLaudo)}</span>}
          </div>
          <div className="mod-acoes"><button type="button" className="btn btn-primary" onClick={() => setModalLaudo(null)}>Fechar</button></div>
        </Modal>
      )}
    </div>
  );
}
