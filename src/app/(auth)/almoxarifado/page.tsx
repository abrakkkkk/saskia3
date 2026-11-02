'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import TabelaEstoque, { itensDisponiveis, quantidadeAssinada, rotuloItem, rotuloTipoMovimentacao, type ItemEstoque, type RespostaMovimentacoes } from '@/components/estoque/TabelaEstoque';
import { estaVencido, venceEmBreve } from '@/lib/estoque';
import { pode } from '@/lib/permissions';
import { enviarJson, mensagemErro, textoDoErro } from '@/lib/resposta';
import './almoxarifado.css';

const ABAS = [
  { id: 'estoque', label: 'Estoque', icon: 'las la-boxes' },
  { id: 'movimentacoes', label: 'Movimentações', icon: 'las la-exchange-alt' },
] as const;

const TOM_TIPO: Record<string, Tone> = { ENTRADA: 'success', SAIDA: 'danger', AJUSTE: 'warning' };
const MOVIMENTACOES_VAZIAS: RespostaMovimentacoes = { itens: [], total: 0, entradasHoje: 0, saidasHoje: 0 };

export default function AlmoxarifadoPage() {
  const { data: session } = useSession();
  const podeGerir = pode(session?.user?.cargo, 'estoque:gerir');

  const [activeTab, setActiveTab] = useState<'estoque' | 'movimentacoes'>('estoque');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [erroForm, setErroForm] = useState('');

  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<RespostaMovimentacoes>(MOVIMENTACOES_VAZIAS);

  const [buscarItem, setBuscarItem] = useState('');
  const [buscarMov, setBuscarMov] = useState('');
  const [filtroTipoMov, setFiltroTipoMov] = useState('todos');

  const [modal, setModal] = useState<'entrada' | 'saida' | 'novo' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [entradaItemId, setEntradaItemId] = useState('');
  const [entradaQtd, setEntradaQtd] = useState(1);
  const [entradaFornecedor, setEntradaFornecedor] = useState('');
  const [entradaValidade, setEntradaValidade] = useState('');

  const [saidaItemId, setSaidaItemId] = useState('');
  const [saidaQtd, setSaidaQtd] = useState(1);
  const [saidaSetor, setSaidaSetor] = useState('Farmácia');

  const [novoNome, setNovoNome] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoCategoria, setNovoCategoria] = useState('Material Hospitalar');
  const [novoUnidade, setNovoUnidade] = useState('Unidade');
  const [novoLote, setNovoLote] = useState('');
  const [novoValidade, setNovoValidade] = useState('');
  const [novoQtd, setNovoQtd] = useState(0);
  const [novoMinimo, setNovoMinimo] = useState(10);

  const carregarDados = useCallback(async () => {
    try {
      const [resItens, resMov] = await Promise.all([
        fetch('/api/estoque?categoria=ALMOXARIFADO'),
        fetch('/api/estoque/movimentacao?categoria=ALMOXARIFADO'),
      ]);
      if (!resItens.ok) throw new Error(await mensagemErro(resItens, 'Não foi possível carregar os itens do estoque.'));
      if (!resMov.ok) throw new Error(await mensagemErro(resMov, 'Não foi possível carregar as movimentações.'));
      const [dadosItens, dadosMov] = await Promise.all([resItens.json(), resMov.json()]);
      if (!Array.isArray(dadosItens) || !Array.isArray(dadosMov?.itens)) throw new Error('Resposta inválida ao carregar o almoxarifado.');
      setItens(dadosItens);
      setMovimentacoes(dadosMov);
      setErroCarga('');
    } catch (erro) {
      setErroCarga(textoDoErro(erro, 'Não foi possível conectar aos dados do almoxarifado.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial: o setState só ocorre depois do await da requisição.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregarDados(); }, [carregarDados]);

  useEffect(() => {
    if (!modal) return;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) setModal(null);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [modal, isSaving]);

  const abrir = (qual: 'entrada' | 'saida' | 'novo') => {
    setErroForm('');
    setSucesso('');
    setModal(qual);
  };

  const executar = async (acao: () => Promise<unknown>, mensagem: string, padraoErro: string) => {
    setIsSaving(true);
    setErroForm('');
    try {
      await acao();
      setModal(null);
      setSucesso(mensagem);
      await carregarDados();
      return true;
    } catch (erro) {
      setErroForm(textoDoErro(erro, padraoErro));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const confirmarEntrada = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!entradaItemId || !Number.isSafeInteger(entradaQtd) || entradaQtd <= 0) {
      setErroForm('Selecione um item e informe uma quantidade inteira positiva.');
      return;
    }
    const ok = await executar(() => enviarJson('/api/estoque/movimentacao', 'POST', {
      tipo: 'ENTRADA', itemId: entradaItemId, quantidade: entradaQtd,
      fornecedor: entradaFornecedor.trim(), validade: entradaValidade || null,
    }, 'Não foi possível registrar a entrada.'), 'Entrada registrada.', 'Não foi possível registrar a entrada.');
    if (ok) { setEntradaItemId(''); setEntradaQtd(1); setEntradaFornecedor(''); setEntradaValidade(''); }
  };

  const confirmarSaida = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!saidaItemId || !Number.isSafeInteger(saidaQtd) || saidaQtd <= 0) {
      setErroForm('Selecione um item e informe uma quantidade inteira positiva.');
      return;
    }
    const ok = await executar(() => enviarJson('/api/estoque/movimentacao', 'POST', {
      tipo: 'SAIDA', itemId: saidaItemId, quantidade: saidaQtd, setor: saidaSetor,
    }, 'Não foi possível registrar a saída.'), 'Saída registrada.', 'Não foi possível registrar a saída.');
    if (ok) { setSaidaItemId(''); setSaidaQtd(1); setSaidaSetor('Farmácia'); }
  };

  const confirmarNovoItem = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!novoNome.trim() || !Number.isSafeInteger(novoQtd) || novoQtd < 0 || !Number.isSafeInteger(novoMinimo) || novoMinimo < 0) {
      setErroForm('Informe o nome do item, uma quantidade inicial inteira e um mínimo válido.');
      return;
    }
    const ok = await executar(() => enviarJson('/api/estoque', 'POST', {
      categoria: 'ALMOXARIFADO',
      nome: novoNome.trim(),
      codigo: novoCodigo.trim(),
      subcategoria: novoCategoria,
      lote: novoLote.trim(),
      validade: novoValidade || null,
      quantidade: novoQtd,
      minimo: novoMinimo,
      unidade: novoUnidade,
    }, 'Não foi possível cadastrar o item.'), 'Item cadastrado.', 'Não foi possível cadastrar o item.');
    if (ok) { setNovoNome(''); setNovoCodigo(''); setNovoLote(''); setNovoValidade(''); setNovoQtd(0); setNovoMinimo(10); }
  };

  const fecharPeloFundo = (evento: React.MouseEvent) => {
    if (evento.target === evento.currentTarget && !isSaving) setModal(null);
  };

  const termoItem = buscarItem.trim().toLocaleLowerCase('pt-BR');
  const listaEstoque = itens.filter(i => i.nome.toLocaleLowerCase('pt-BR').includes(termoItem) || (i.codigo || '').toLocaleLowerCase('pt-BR').includes(termoItem));

  const termoMov = buscarMov.trim().toLocaleLowerCase('pt-BR');
  const listaMov = movimentacoes.itens.filter(m => (filtroTipoMov === 'todos' || m.tipo === filtroTipoMov)
    && (!termoMov || m.item?.nome.toLocaleLowerCase('pt-BR').includes(termoMov)));

  const comSaldo = itens.filter(i => i.quantidade > 0);
  const baixos = itens.filter(i => i.quantidade <= i.minimo).length;
  const alertasValidade = comSaldo.filter(i => estaVencido(i.validade) || venceEmBreve(i.validade)).length;

  if (loading) return <div className="conteudo"><LoadingState message="Carregando dados do almoxarifado..." /></div>;

  return (
    <div className="conteudo">
      <div className="almox-container">
        <PageHeader
          icon="las la-boxes"
          title="Almoxarifado"
          subtitle="Controle de materiais, insumos e equipamentos"
          actions={podeGerir ? <>
            <button type="button" className="btn btn-success" onClick={() => abrir('entrada')}><i className="las la-arrow-down" aria-hidden="true"></i> Entrada</button>
            <button type="button" className="btn btn-danger" onClick={() => abrir('saida')}><i className="las la-arrow-up" aria-hidden="true"></i> Saída</button>
            <button type="button" className="btn btn-primary" onClick={() => abrir('novo')}><i className="las la-plus-circle" aria-hidden="true"></i> Novo item</button>
          </> : undefined}
        />

        {erroCarga && <ErrorState message={erroCarga} onRetry={() => void carregarDados()} />}
        {sucesso && <p className="mod-aviso mod-aviso-sucesso" role="status">{sucesso}</p>}

        <StatGrid>
          <StatCard icon="las la-boxes" value={itens.length} label="Itens em estoque" tone="info" />
          <StatCard icon="las la-arrow-down" value={movimentacoes.entradasHoje} label="Entradas hoje" tone="success" />
          <StatCard icon="las la-arrow-up" value={movimentacoes.saidasHoje} label="Saídas hoje" tone="danger" />
          <StatCard icon="las la-exclamation-triangle" value={baixos} label="Estoque baixo" tone="warning" />
          <StatCard icon="las la-calendar-times" value={alertasValidade} label="Vencidos ou a vencer em 30 dias" tone="warning" />
        </StatGrid>

        <Tabs tabs={ABAS} active={activeTab} onChange={setActiveTab} label="Seções do almoxarifado" />

        {activeTab === 'estoque' && (
          <Panel>
            <SearchInput value={buscarItem} onChange={setBuscarItem} placeholder="Buscar por nome ou código..." />
            <TabelaEstoque itens={listaEstoque} podeAjustar={podeGerir} onAjustado={() => void carregarDados()} vazio="Nenhum item encontrado no estoque do almoxarifado." />
          </Panel>
        )}

        {activeTab === 'movimentacoes' && (
          <Panel>
            <div className="mod-filtros">
              <SearchInput value={buscarMov} onChange={setBuscarMov} placeholder="Buscar por item..." />
              <select aria-label="Filtrar movimentações pelo tipo" value={filtroTipoMov} onChange={e => setFiltroTipoMov(e.target.value)}>
                <option value="todos">Todos os tipos</option><option value="ENTRADA">Entradas</option><option value="SAIDA">Saídas</option><option value="AJUSTE">Ajustes</option>
              </select>
            </div>
            {movimentacoes.total > movimentacoes.itens.length && <p className="mod-nota">Mostrando as {movimentacoes.itens.length} movimentações mais recentes de {movimentacoes.total}.</p>}
            {listaMov.length === 0 ? <EmptyState icon="las la-exchange-alt" message="Nenhuma movimentação encontrada." /> : (
              <div className="tabela-almox-wrapper">
                <table className="tabela-almox">
                  <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Item</th><th>Qtd.</th><th>Destino/Fornecedor</th><th>Responsável</th></tr></thead>
                  <tbody>
                    {listaMov.map(m => (
                      <tr key={m.id}>
                        <td>{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
                        <td><Badge tone={TOM_TIPO[m.tipo] ?? 'neutral'}>{rotuloTipoMovimentacao(m.tipo)}</Badge></td>
                        <td>{m.item?.nome}{m.tipo === 'AJUSTE' && <span className="mod-secundario">{m.observacao}</span>}</td>
                        <td><strong>{quantidadeAssinada(m)}</strong></td>
                        <td>{m.setor || m.fornecedor || '-'}</td>
                        <td>{m.responsavel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>

      {modal === 'entrada' && (
        <div className="modal-almox" onClick={fecharPeloFundo}>
          <form className="modal-almox-conteudo" role="dialog" aria-modal="true" aria-labelledby="almox-entrada-title" onSubmit={confirmarEntrada}>
            <h3 id="almox-entrada-title"><i className="las la-arrow-down" aria-hidden="true"></i> Registrar entrada</h3>
            {erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>}
            <div className="form-group"><label htmlFor="almox-entrada-item">Item *</label><select id="almox-entrada-item" value={entradaItemId} onChange={e => setEntradaItemId(e.target.value)}><option value="">Selecione...</option>{itens.map(i => <option key={i.id} value={i.id}>{rotuloItem(i)}</option>)}</select></div>
            <div className="form-grid">
              <div className="form-group"><label htmlFor="almox-entrada-quantidade">Quantidade *</label><input id="almox-entrada-quantidade" type="number" min="1" step="1" value={entradaQtd} onChange={e => setEntradaQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-entrada-validade">Nova validade</label><input id="almox-entrada-validade" type="date" value={entradaValidade} onChange={e => setEntradaValidade(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-entrada-fornecedor">Fornecedor</label><input id="almox-entrada-fornecedor" type="text" maxLength={200} value={entradaFornecedor} onChange={e => setEntradaFornecedor(e.target.value)} /></div>
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-danger" onClick={() => setModal(null)} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-success" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </form>
        </div>
      )}

      {modal === 'saida' && (
        <div className="modal-almox" onClick={fecharPeloFundo}>
          <form className="modal-almox-conteudo" role="dialog" aria-modal="true" aria-labelledby="almox-saida-title" onSubmit={confirmarSaida}>
            <h3 id="almox-saida-title"><i className="las la-arrow-up" aria-hidden="true"></i> Registrar saída</h3>
            {erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>}
            <div className="form-group"><label htmlFor="almox-saida-item">Item, lote e validade *</label><select id="almox-saida-item" value={saidaItemId} onChange={e => setSaidaItemId(e.target.value)}><option value="">Selecione...</option>{itensDisponiveis(itens).map(i => <option key={i.id} value={i.id}>{rotuloItem(i)}</option>)}</select></div>
            <div className="form-grid">
              <div className="form-group"><label htmlFor="almox-saida-quantidade">Quantidade *</label><input id="almox-saida-quantidade" type="number" min="1" step="1" value={saidaQtd} onChange={e => setSaidaQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-saida-setor">Setor de destino</label><select id="almox-saida-setor" value={saidaSetor} onChange={e => setSaidaSetor(e.target.value)}><option>Farmácia</option><option>UTI</option><option>Emergência</option><option>Enfermaria</option><option>Centro Cirúrgico</option><option>Outro</option></select></div>
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-danger" onClick={() => setModal(null)} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-warning" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar saída'}</button>
            </div>
          </form>
        </div>
      )}

      {modal === 'novo' && (
        <div className="modal-almox" onClick={fecharPeloFundo}>
          <form className="modal-almox-conteudo" role="dialog" aria-modal="true" aria-labelledby="almox-novo-title" onSubmit={confirmarNovoItem}>
            <h3 id="almox-novo-title"><i className="las la-plus-circle" aria-hidden="true"></i> Cadastrar novo item</h3>
            {erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>}
            <div className="form-grid">
              <div className="form-group"><label htmlFor="almox-novo-nome">Nome *</label><input id="almox-novo-nome" type="text" maxLength={200} placeholder="Nome do item" value={novoNome} onChange={e => setNovoNome(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-codigo">Código</label><input id="almox-novo-codigo" type="text" maxLength={100} value={novoCodigo} onChange={e => setNovoCodigo(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-categoria">Categoria *</label><select id="almox-novo-categoria" value={novoCategoria} onChange={e => setNovoCategoria(e.target.value)}><option>Material Hospitalar</option><option>Equipamentos</option><option>Higiene e Limpeza</option><option>EPIs</option><option>Escritório</option></select></div>
              <div className="form-group"><label htmlFor="almox-novo-unidade">Unidade</label><select id="almox-novo-unidade" value={novoUnidade} onChange={e => setNovoUnidade(e.target.value)}><option>Unidade</option><option>Caixa</option><option>Pacote</option><option>Frasco</option><option>Par</option><option>Metro</option><option>Litro</option><option>Kg</option></select></div>
              <div className="form-group"><label htmlFor="almox-novo-lote">Lote</label><input id="almox-novo-lote" type="text" maxLength={100} value={novoLote} onChange={e => setNovoLote(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-validade">Validade</label><input id="almox-novo-validade" type="date" value={novoValidade} onChange={e => setNovoValidade(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-quantidade">Qtd. inicial</label><input id="almox-novo-quantidade" type="number" min="0" step="1" value={novoQtd} onChange={e => setNovoQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-novo-minimo">Estoque mínimo</label><input id="almox-novo-minimo" type="number" min="0" step="1" value={novoMinimo} onChange={e => setNovoMinimo(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-danger" onClick={() => setModal(null)} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Cadastrando...' : 'Cadastrar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
