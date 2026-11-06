'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import TabelaEstoque, { itensDisponiveis, quantidadeAssinada, rotuloItem, rotuloTipoMovimentacao, type ItemEstoque, type RespostaMovimentacoes } from '@/components/estoque/TabelaEstoque';
import { estaVencido, venceEmBreve } from '@/lib/estoque';
import { pode } from '@/lib/permissions';
import { enviarJson, mensagemErro, textoDoErro } from '@/lib/resposta';
import '@/components/ui/modulo.css';

const ABAS = [
  { id: 'estoque', label: 'Estoque', icon: 'las la-boxes' },
  { id: 'movimentacoes', label: 'Movimentações', icon: 'las la-exchange-alt' },
] as const;

const TOM_TIPO: Record<string, Tone> = { ENTRADA: 'success', SAIDA: 'info', AJUSTE: 'warning' };
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

  const termoItem = buscarItem.trim().toLocaleLowerCase('pt-BR');
  const listaEstoque = itens.filter(i => i.nome.toLocaleLowerCase('pt-BR').includes(termoItem) || (i.codigo || '').toLocaleLowerCase('pt-BR').includes(termoItem));

  const termoMov = buscarMov.trim().toLocaleLowerCase('pt-BR');
  const listaMov = movimentacoes.itens.filter(m => (filtroTipoMov === 'todos' || m.tipo === filtroTipoMov)
    && (!termoMov || m.item?.nome.toLocaleLowerCase('pt-BR').includes(termoMov)));

  const comSaldo = itens.filter(i => i.quantidade > 0);
  const baixos = itens.filter(i => i.quantidade <= i.minimo).length;
  const alertasValidade = comSaldo.filter(i => estaVencido(i.validade) || venceEmBreve(i.validade)).length;

  const cabecalho = (
    <PageHeader
      icon="las la-boxes"
      title="Almoxarifado"
      subtitle="Materiais, insumos e equipamentos"
      actions={!loading && podeGerir && <>
        <button type="button" className="btn btn-secondary" onClick={() => abrir('entrada')}><i className="las la-arrow-down" aria-hidden="true"></i> Entrada</button>
        <button type="button" className="btn btn-secondary" onClick={() => abrir('saida')}><i className="las la-arrow-up" aria-hidden="true"></i> Saída</button>
        <button type="button" className="btn btn-primary" onClick={() => abrir('novo')}><i className="las la-plus-circle" aria-hidden="true"></i> Novo item</button>
      </>}
    />
  );

  if (loading) return <div className="conteudo mod-pagina">{cabecalho}<LoadingState message="Carregando o almoxarifado..." /></div>;

  return (
    <div className="conteudo mod-pagina">
      {cabecalho}

      {erroCarga && <ErrorState message={erroCarga} onRetry={() => void carregarDados()} />}
      {sucesso && <p className="mod-aviso mod-aviso-sucesso" role="status">{sucesso}</p>}

      <StatGrid>
        <StatCard icon="las la-boxes" value={itens.length} label="Itens" hint="Itens cadastrados no almoxarifado" />
        <StatCard icon="las la-arrow-down" value={movimentacoes.entradasHoje} label="Entradas hoje" />
        <StatCard icon="las la-arrow-up" value={movimentacoes.saidasHoje} label="Saídas hoje" />
        <StatCard icon="las la-exclamation-triangle" value={baixos} label="Estoque baixo" tone="warning" alerta hint="Itens com saldo igual ou abaixo do mínimo" />
        <StatCard icon="las la-calendar-times" value={alertasValidade} label="Validade" tone="warning" alerta hint="Itens com saldo vencidos ou que vencem em até 30 dias" />
      </StatGrid>

      <Tabs tabs={ABAS} active={activeTab} onChange={setActiveTab} label="Seções do almoxarifado" />

      {activeTab === 'estoque' && (
        <Panel>
          <SearchInput value={buscarItem} onChange={setBuscarItem} placeholder="Buscar por nome ou código" />
          <TabelaEstoque itens={listaEstoque} podeAjustar={podeGerir} onAjustado={() => void carregarDados()} vazio="Nenhum item encontrado no estoque do almoxarifado." />
        </Panel>
      )}

      {activeTab === 'movimentacoes' && (
        <Panel>
          <div className="mod-filtros">
            <SearchInput value={buscarMov} onChange={setBuscarMov} placeholder="Buscar por item" />
            <select aria-label="Filtrar movimentações pelo tipo" value={filtroTipoMov} onChange={e => setFiltroTipoMov(e.target.value)}>
              <option value="todos">Todos os tipos</option><option value="ENTRADA">Entradas</option><option value="SAIDA">Saídas</option><option value="AJUSTE">Ajustes</option>
            </select>
          </div>
          {movimentacoes.total > movimentacoes.itens.length && <p className="mod-nota">Mostrando as {movimentacoes.itens.length} movimentações mais recentes de {movimentacoes.total}.</p>}
          {listaMov.length === 0 ? <EmptyState icon="las la-exchange-alt" message="Nenhuma movimentação encontrada." /> : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <caption className="sr-only">Movimentações do almoxarifado</caption>
                <thead><tr><th scope="col">Data/hora</th><th scope="col">Tipo</th><th scope="col">Item</th><th scope="col">Qtd.</th><th scope="col">Destino ou fornecedor</th><th scope="col">Responsável</th></tr></thead>
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

      {modal === 'entrada' && (
        <Modal title="Registrar entrada" icon="las la-arrow-down" busy={isSaving} onClose={() => setModal(null)}>
          <form onSubmit={confirmarEntrada}>
            {erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>}
            <div className="form-group"><label htmlFor="almox-entrada-item">Item *</label><select id="almox-entrada-item" value={entradaItemId} onChange={e => setEntradaItemId(e.target.value)}><option value="">Selecione...</option>{itens.map(i => <option key={i.id} value={i.id}>{rotuloItem(i)}</option>)}</select></div>
            <div className="mod-form-grid">
              <div className="form-group"><label htmlFor="almox-entrada-quantidade">Quantidade *</label><input id="almox-entrada-quantidade" type="number" min="1" step="1" value={entradaQtd} onChange={e => setEntradaQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-entrada-validade">Nova validade</label><input id="almox-entrada-validade" type="date" value={entradaValidade} onChange={e => setEntradaValidade(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-entrada-fornecedor">Fornecedor</label><input id="almox-entrada-fornecedor" type="text" maxLength={200} value={entradaFornecedor} onChange={e => setEntradaFornecedor(e.target.value)} /></div>
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'saida' && (
        <Modal title="Registrar saída" icon="las la-arrow-up" busy={isSaving} onClose={() => setModal(null)}>
          <form onSubmit={confirmarSaida}>
            {erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>}
            <div className="form-group"><label htmlFor="almox-saida-item">Item, lote e validade *</label><select id="almox-saida-item" value={saidaItemId} onChange={e => setSaidaItemId(e.target.value)}><option value="">Selecione...</option>{itensDisponiveis(itens).map(i => <option key={i.id} value={i.id}>{rotuloItem(i)}</option>)}</select></div>
            <div className="mod-form-grid">
              <div className="form-group"><label htmlFor="almox-saida-quantidade">Quantidade *</label><input id="almox-saida-quantidade" type="number" min="1" step="1" value={saidaQtd} onChange={e => setSaidaQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-saida-setor">Setor de destino</label><select id="almox-saida-setor" value={saidaSetor} onChange={e => setSaidaSetor(e.target.value)}><option>Farmácia</option><option>UTI</option><option>Emergência</option><option>Enfermaria</option><option>Centro Cirúrgico</option><option>Outro</option></select></div>
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar saída'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'novo' && (
        <Modal title="Novo item" icon="las la-plus-circle" busy={isSaving} onClose={() => setModal(null)}>
          <form onSubmit={confirmarNovoItem}>
            {erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>}
            <div className="mod-form-grid">
              <div className="form-group"><label htmlFor="almox-novo-nome">Nome *</label><input id="almox-novo-nome" type="text" maxLength={200} placeholder="Nome do item" value={novoNome} onChange={e => setNovoNome(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-codigo">Código</label><input id="almox-novo-codigo" type="text" maxLength={100} value={novoCodigo} onChange={e => setNovoCodigo(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-categoria">Categoria *</label><select id="almox-novo-categoria" value={novoCategoria} onChange={e => setNovoCategoria(e.target.value)}><option>Material Hospitalar</option><option>Equipamentos</option><option>Higiene e Limpeza</option><option>EPIs</option><option>Escritório</option></select></div>
              <div className="form-group"><label htmlFor="almox-novo-unidade">Unidade</label><select id="almox-novo-unidade" value={novoUnidade} onChange={e => setNovoUnidade(e.target.value)}><option>Unidade</option><option>Caixa</option><option>Pacote</option><option>Frasco</option><option>Par</option><option>Metro</option><option>Litro</option><option>Kg</option></select></div>
              <div className="form-group"><label htmlFor="almox-novo-lote">Lote</label><input id="almox-novo-lote" type="text" maxLength={100} value={novoLote} onChange={e => setNovoLote(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-validade">Validade</label><input id="almox-novo-validade" type="date" value={novoValidade} onChange={e => setNovoValidade(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-quantidade">Quantidade inicial</label><input id="almox-novo-quantidade" type="number" min="0" step="1" value={novoQtd} onChange={e => setNovoQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-novo-minimo">Estoque mínimo</label><input id="almox-novo-minimo" type="number" min="0" step="1" value={novoMinimo} onChange={e => setNovoMinimo(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Cadastrando...' : 'Cadastrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
