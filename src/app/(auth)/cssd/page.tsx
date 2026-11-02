'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import { BOWIE_DICK, INDICADOR_BIOLOGICO, INDICADOR_QUIMICO, INTEGRIDADES, ITEM_REJEITADO, indicadoresConformes } from '@/lib/cssd';
import { pode } from '@/lib/permissions';
import { enviarJson, mensagemErro, textoDoErro } from '@/lib/resposta';
import '@/components/ui/modulo.css';
import './cssd.css';

type Lote = {
  id: string;
  numero: string;
  setor: string;
  operador: string;
  status: string;
  equipamento: string;
  ciclo: string;
  data: string;
  indicadorQuimico: string;
  indicadorBiologico: string;
  bowieDick: string;
  itens: { id: string; integridade: string }[];
};
type Aba = 'lotes' | 'novo' | 'itens' | 'historico';

const FLUXO = ['Recepção', 'Limpeza', 'Preparo', 'Esterilização', 'Pronto'];
const ativo = (lote: Lote) => lote.status !== 'Pronto' && lote.status !== 'Rejeitado';
const dataLocalKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const tomStatus = (status: string): Tone => (status === 'Pronto' ? 'success' : status === 'Rejeitado' ? 'danger' : 'warning');

function tomIndicador(valor: string): Tone {
  if (!valor) return 'neutral';
  if (/OK|Aprovado/.test(valor)) return 'success';
  if (/Rejeitar|Reprovado/.test(valor)) return 'danger';
  return 'warning';
}

function Indicador({ valor }: { valor: string }) {
  return <Badge tone={tomIndicador(valor)}>{valor || 'Pendente'}</Badge>;
}

function IndicadoresForm({ lote, onSalvo, onErro }: { lote: Lote; onSalvo: (mensagem: string) => void; onErro: (mensagem: string) => void }) {
  const [quimico, setQuimico] = useState(lote.indicadorQuimico);
  const [biologico, setBiologico] = useState(lote.indicadorBiologico);
  const [bowieDick, setBowieDick] = useState(lote.bowieDick);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!quimico || !biologico || !bowieDick) {
      onErro(`Informe os três indicadores do lote ${lote.numero}.`);
      return;
    }
    setSalvando(true);
    try {
      const resposta = await enviarJson(`/api/cssd/${lote.id}`, 'PUT', { indicadorQuimico: quimico, indicadorBiologico: biologico, bowieDick }, 'Não foi possível registrar os indicadores.');
      const atualizado: { status?: string } = await resposta.json();
      onSalvo(atualizado.status === 'Rejeitado' ? `Indicador reprovado: o lote ${lote.numero} foi rejeitado.` : `Indicadores do lote ${lote.numero} registrados.`);
    } catch (erro) {
      onErro(textoDoErro(erro, 'Não foi possível registrar os indicadores.'));
    } finally {
      setSalvando(false);
    }
  };

  const campos = [
    { id: 'quimico', rotulo: 'Indicador químico', valor: quimico, muda: setQuimico, opcoes: INDICADOR_QUIMICO },
    { id: 'biologico', rotulo: 'Indicador biológico', valor: biologico, muda: setBiologico, opcoes: INDICADOR_BIOLOGICO },
    { id: 'bowie', rotulo: 'Teste Bowie-Dick', valor: bowieDick, muda: setBowieDick, opcoes: BOWIE_DICK },
  ];

  return (
    <form className="cssd-indicadores" onSubmit={salvar}>
      <h5>Resultado do ciclo</h5>
      {campos.map(campo => (
        <div className="form-group" key={campo.id}>
          <label htmlFor={`${campo.id}-${lote.id}`}>{campo.rotulo}</label>
          <select id={`${campo.id}-${lote.id}`} value={campo.valor} onChange={e => campo.muda(e.target.value)}>
            <option value="">Selecione...</option>
            {campo.opcoes.map(opcao => <option key={opcao}>{opcao}</option>)}
          </select>
        </div>
      ))}
      <button type="submit" className="btn btn-sm btn-info" disabled={salvando}>{salvando ? 'Salvando...' : 'Registrar indicadores'}</button>
    </form>
  );
}

export default function CSSDPage() {
  const { data: session } = useSession();
  const podeGerir = pode(session?.user?.cargo, 'cssd:gerir');

  const abas = [
    { id: 'lotes' as const, label: 'Painel de lotes', icon: 'las la-list' },
    ...(podeGerir ? [
      { id: 'novo' as const, label: 'Registrar lote', icon: 'las la-plus' },
      { id: 'itens' as const, label: 'Adicionar itens', icon: 'las la-tools' },
    ] : []),
    { id: 'historico' as const, label: 'Histórico', icon: 'las la-history' },
  ];
  const [abaEscolhida, setActiveTab] = useState<Aba>('lotes');
  const activeTab = abas.some(aba => aba.id === abaEscolhida) ? abaEscolhida : 'lotes';

  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [lotes, setLotes] = useState<Lote[]>([]);

  const [buscarLote, setBuscarLote] = useState('');
  const [filtroStatusLote, setFiltroStatusLote] = useState('todos');

  const [loteSetor, setLoteSetor] = useState('');
  const [loteData, setLoteData] = useState(() => dataLocalKey(new Date()));
  const [loteEquipamento, setLoteEquipamento] = useState('Autoclave 01');
  const [loteCiclo, setLoteCiclo] = useState('134°C - 7 min (Padrão)');
  const [loteObs, setLoteObs] = useState('');

  const [itemLote, setItemLote] = useState('');
  const [itemNome, setItemNome] = useState('');
  const [itemTipo, setItemTipo] = useState('Instrumental Cirúrgico');
  const [itemQuantidade, setItemQuantidade] = useState(1);
  const [itemEmbalagem, setItemEmbalagem] = useState('Grau Cirúrgico (SMS)');
  const [itemIntegridade, setItemIntegridade] = useState<string>('Íntegra');

  const operadorAtual = session?.user?.name?.trim() || 'Profissional autenticado';

  const carregarDados = useCallback(async () => {
    try {
      const res = await fetch('/api/cssd');
      if (!res.ok) throw new Error(await mensagemErro(res, 'Não foi possível carregar os lotes.'));
      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new Error('A resposta de lotes está inválida.');
      setLotes(data as Lote[]);
      setErroCarregamento('');
    } catch (erro) {
      setErroCarregamento(textoDoErro(erro, 'Erro ao carregar lotes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial: o setState só ocorre depois do await da requisição.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregarDados(); }, [carregarDados]);

  const limparMensagens = () => { setErroAcao(''); setSucesso(''); };

  const criarLote = async (evento: FormEvent) => {
    evento.preventDefault();
    limparMensagens();
    if (!loteSetor || !loteData) {
      setErroAcao('Preencha o setor e a data.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await enviarJson('/api/cssd', 'POST', {
        setor: loteSetor, data: loteData, equipamento: loteEquipamento, ciclo: loteCiclo, obs: loteObs.trim(),
      }, 'Não foi possível criar o lote.');
      const criado: { numero?: string } = await resposta.json();
      setLoteObs('');
      setSucesso(`Lote ${criado.numero ?? ''} criado.`);
      setActiveTab('lotes');
      await carregarDados();
    } catch (erro) {
      setErroAcao(textoDoErro(erro, 'Não foi possível criar o lote.'));
    } finally {
      setSalvando(false);
    }
  };

  const mudarStatus = async (lote: Lote, status: string) => {
    limparMensagens();
    try {
      await enviarJson(`/api/cssd/${lote.id}`, 'PUT', { status }, 'Não foi possível atualizar o lote.');
      setSucesso(`Lote ${lote.numero}: ${status}.`);
    } catch (erro) {
      setErroAcao(textoDoErro(erro, 'Não foi possível atualizar o lote.'));
    }
    await carregarDados();
  };

  const rejeitarLote = async (lote: Lote) => {
    if (await confirm(`Rejeitar lote ${lote.numero}?`)) await mudarStatus(lote, 'Rejeitado');
  };

  const adicionarItem = async (evento: FormEvent) => {
    evento.preventDefault();
    limparMensagens();
    if (!itemLote || !itemNome.trim() || !Number.isInteger(itemQuantidade) || itemQuantidade < 1) {
      setErroAcao('Selecione o lote, informe o material e uma quantidade válida.');
      return;
    }
    setSalvando(true);
    try {
      await enviarJson('/api/cssd/itens', 'POST', {
        loteId: itemLote, nome: itemNome.trim(), tipo: itemTipo, quantidade: itemQuantidade,
        embalagem: itemEmbalagem, integridade: itemIntegridade,
      }, 'Não foi possível adicionar o item.');
      setItemNome('');
      setItemQuantidade(1);
      setSucesso('Item adicionado ao lote.');
      setActiveTab('lotes');
      await carregarDados();
    } catch (erro) {
      setErroAcao(textoDoErro(erro, 'Não foi possível adicionar o item.'));
    } finally {
      setSalvando(false);
    }
  };

  const termo = buscarLote.trim().toLowerCase();
  const lotesVisiveis = lotes.filter(l => ativo(l)
    && (filtroStatusLote === 'todos' || l.status === filtroStatusLote)
    && (!termo || l.numero.toLowerCase().includes(termo) || l.setor.toLowerCase().includes(termo) || l.operador.toLowerCase().includes(termo)));
  const lotesAtivos = lotes.filter(ativo);
  const contar = (status: string) => lotes.filter(l => l.status === status).length;

  if (loading) return <div className="conteudo"><LoadingState message="Carregando lotes de esterilização..." /></div>;

  return (
    <div className="conteudo">
      <div className="cssd-container">
        <PageHeader
          icon="las la-box"
          title="CME - Central de Material e Esterilização"
          subtitle="Controle de ciclos de esterilização e rastreabilidade de instrumentais"
          actions={podeGerir ? <button type="button" className="btn btn-success" onClick={() => setActiveTab('novo')}><i className="las la-plus-circle" aria-hidden="true"></i> Novo lote</button> : undefined}
        />

        {erroCarregamento && <ErrorState message={erroCarregamento} onRetry={() => void carregarDados()} />}
        {sucesso && <p className="mod-aviso mod-aviso-sucesso" role="status">{sucesso}</p>}
        {erroAcao && <p className="mod-aviso mod-aviso-erro" role="alert">{erroAcao}</p>}

        <StatGrid>
          <StatCard icon="las la-inbox" value={contar('Recepção')} label="Na recepção" tone="info" />
          <StatCard icon="las la-soap" value={contar('Limpeza')} label="Em limpeza" tone="neutral" />
          <StatCard icon="las la-box-open" value={contar('Preparo')} label="Em preparo" tone="warning" />
          <StatCard icon="las la-fire" value={contar('Esterilização')} label="Esterilizando" tone="success" />
        </StatGrid>

        <Tabs tabs={abas} active={activeTab} onChange={setActiveTab} label="Seções da CME" />

        {activeTab === 'novo' && (
          <Panel title="Abertura de novo lote" icon="las la-plus-circle">
            <p className="mod-nota">O número é gerado pelo sistema ao salvar. Os indicadores são registrados depois do ciclo, na etapa de esterilização.</p>
            <form onSubmit={criarLote}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="lote-setor">Setor de origem *</label>
                  <select id="lote-setor" value={loteSetor} onChange={e => setLoteSetor(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option>Centro Cirúrgico</option><option>UTI</option><option>Emergência</option><option>Enfermaria</option><option>Ambulatório</option>
                  </select>
                </div>
                <div className="form-group"><label htmlFor="lote-data">Data *</label><input id="lote-data" type="date" value={loteData} onChange={e => setLoteData(e.target.value)} /></div>
                <div className="form-group"><label htmlFor="lote-operador">Operador autenticado</label><input id="lote-operador" type="text" value={operadorAtual} readOnly aria-readonly="true" /></div>
                <div className="form-group">
                  <label htmlFor="lote-equipamento">Equipamento</label>
                  <select id="lote-equipamento" value={loteEquipamento} onChange={e => setLoteEquipamento(e.target.value)}>
                    <option>Autoclave 01</option><option>Autoclave 02</option><option>Autoclave 03 (Rápida)</option><option>Estufa Térmica</option><option>Lavadora Termodesinfectora</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="lote-ciclo">Ciclo</label>
                  <select id="lote-ciclo" value={loteCiclo} onChange={e => setLoteCiclo(e.target.value)}>
                    <option>134°C - 7 min (Padrão)</option><option>134°C - 4 min (Flash)</option><option>121°C - 15 min</option><option>Ciclo Príon</option><option>Lavagem Térmica</option>
                  </select>
                </div>
                <div className="form-group"><label htmlFor="lote-obs">Observações</label><input id="lote-obs" type="text" maxLength={2000} value={loteObs} onChange={e => setLoteObs(e.target.value)} placeholder="Opcional" /></div>
              </div>
              <div className="mod-acoes"><button type="submit" className="btn btn-success" disabled={salvando}><i className="las la-save" aria-hidden="true"></i> {salvando ? 'Criando...' : 'Criar lote'}</button></div>
            </form>
          </Panel>
        )}

        {activeTab === 'itens' && (
          <Panel title="Vincular instrumentais ao lote" icon="las la-tools">
            <p className="mod-nota">Adicione as pinças, caixas e materiais que compõem o lote ativo.</p>
            <form onSubmit={adicionarItem}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="item-lote">Lote aberto *</label>
                  <select id="item-lote" value={itemLote} onChange={e => setItemLote(e.target.value)}>
                    <option value="">Selecione...</option>
                    {lotesAtivos.map(l => <option key={l.id} value={l.id}>{l.numero} ({l.status})</option>)}
                  </select>
                </div>
                <div className="form-group"><label htmlFor="item-nome">Material / caixa *</label><input id="item-nome" type="text" maxLength={200} value={itemNome} onChange={e => setItemNome(e.target.value)} placeholder="Ex.: Caixa de pequena cirurgia" /></div>
                <div className="form-group">
                  <label htmlFor="item-tipo">Tipo</label>
                  <select id="item-tipo" value={itemTipo} onChange={e => setItemTipo(e.target.value)}>
                    <option>Instrumental Cirúrgico</option><option>Caixa Montada</option><option>Tecido / Avental</option><option>Vidraria</option><option>Motor / Perfurador</option>
                  </select>
                </div>
                <div className="form-group"><label htmlFor="item-quantidade">Quantidade</label><input id="item-quantidade" type="number" min="1" step="1" value={itemQuantidade} onChange={e => setItemQuantidade(Number(e.target.value))} /></div>
                <div className="form-group">
                  <label htmlFor="item-embalagem">Embalagem</label>
                  <select id="item-embalagem" value={itemEmbalagem} onChange={e => setItemEmbalagem(e.target.value)}>
                    <option>Grau Cirúrgico (SMS)</option><option>Contêiner Rígido</option><option>Papel Crepado</option><option>Tyvek</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="item-integridade">Integridade visual</label>
                  <select id="item-integridade" value={itemIntegridade} onChange={e => setItemIntegridade(e.target.value)}>
                    {INTEGRIDADES.map(opcao => <option key={opcao}>{opcao}</option>)}
                  </select>
                </div>
              </div>
              <div className="mod-acoes"><button type="submit" className="btn btn-primary" disabled={salvando}><i className="las la-plus" aria-hidden="true"></i> {salvando ? 'Adicionando...' : 'Adicionar material'}</button></div>
            </form>
          </Panel>
        )}

        {activeTab === 'lotes' && (
          <Panel>
            <div className="mod-filtros">
              <SearchInput value={buscarLote} onChange={setBuscarLote} placeholder="Buscar lote, setor ou operador..." />
              <select aria-label="Filtrar lotes por status" value={filtroStatusLote} onChange={e => setFiltroStatusLote(e.target.value)}>
                <option value="todos">Todos os status</option>
                {FLUXO.slice(0, 4).map(status => <option key={status}>{status}</option>)}
              </select>
            </div>

            {lotesVisiveis.length === 0 ? <EmptyState icon="las la-box" message="Nenhum lote ativo encontrado nos filtros selecionados." /> : (
              <div className="lotes-grid">
                {lotesVisiveis.map(l => {
                  const proximo = FLUXO[FLUXO.indexOf(l.status) + 1];
                  const emEsterilizacao = l.status === 'Esterilização';
                  const integros = l.itens.filter(item => item.integridade !== ITEM_REJEITADO).length;
                  const liberavel = indicadoresConformes(l) && integros > 0;
                  return (
                    <div className="lote-card" key={l.id}>
                      <div className="lote-header">
                        <h4><i className="las la-box" aria-hidden="true"></i> {l.numero}</h4>
                        <Badge tone={tomStatus(l.status)}>{l.status}</Badge>
                      </div>
                      <div className="lote-body">
                        <p><strong>Setor:</strong> {l.setor}</p>
                        <p><strong>Operador:</strong> {l.operador}</p>
                        <p><strong>Equipamento:</strong> {l.equipamento}</p>
                        <p><strong>Ciclo:</strong> {l.ciclo}</p>
                        <p><strong>Itens:</strong> {l.itens.length} ({integros} {integros === 1 ? 'íntegro' : 'íntegros'})</p>
                      </div>
                      {emEsterilizacao && podeGerir && <IndicadoresForm key={`${l.id}-${l.indicadorQuimico}-${l.indicadorBiologico}-${l.bowieDick}`} lote={l} onSalvo={mensagem => { limparMensagens(); setSucesso(mensagem); void carregarDados(); }} onErro={mensagem => { limparMensagens(); setErroAcao(mensagem); }} />}
                      {emEsterilizacao && !liberavel && <p className="cssd-pendencia">Para liberar: indicadores conformes e ao menos 1 item íntegro.</p>}
                      {podeGerir && (
                        <div className="lote-actions">
                          {proximo && (
                            <button type="button" className="btn btn-primary btn-sm" disabled={emEsterilizacao && !liberavel} onClick={() => void mudarStatus(l, proximo)}>
                              {emEsterilizacao ? 'Liberar como pronto' : `Avançar para ${proximo}`} <i className="las la-arrow-right" aria-hidden="true"></i>
                            </button>
                          )}
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => void rejeitarLote(l)} aria-label={`Reprovar lote ${l.numero}`} title="Reprovar lote">
                            <i className="las la-times-circle" aria-hidden="true"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {activeTab === 'historico' && (
          <Panel>
            {lotes.length === 0 ? <EmptyState icon="las la-history" message="Nenhum lote registrado." /> : (
              <div className="tabela-wrapper cssd-tabela-branca">
                <table className="tabela-cssd">
                  <thead><tr><th>Nº lote</th><th>Data</th><th>Setor</th><th>Operador</th><th>Equipamento</th><th>Itens</th><th>Químico</th><th>Biológico</th><th>Bowie-Dick</th><th>Status</th></tr></thead>
                  <tbody>
                    {lotes.map(l => (
                      <tr key={l.id}>
                        <td><strong>{l.numero}</strong></td>
                        <td>{/^\d{4}-\d{2}-\d{2}$/.test(l.data) ? new Date(`${l.data}T00:00:00`).toLocaleDateString('pt-BR') : '-'}</td>
                        <td>{l.setor}</td>
                        <td>{l.operador}</td>
                        <td>{l.equipamento}</td>
                        <td>{l.itens.length}</td>
                        <td><Indicador valor={l.indicadorQuimico} /></td>
                        <td><Indicador valor={l.indicadorBiologico} /></td>
                        <td><Indicador valor={l.bowieDick} /></td>
                        <td><Badge tone={tomStatus(l.status)}>{l.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
