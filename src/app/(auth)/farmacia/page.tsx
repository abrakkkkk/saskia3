'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import PacienteSelect from '@/components/ui/PacienteSelect';
import TabelaEstoque, { itensDisponiveis, rotuloItem, type ItemEstoque, type RespostaMovimentacoes } from '@/components/estoque/TabelaEstoque';
import { estaVencido, venceEmBreve } from '@/lib/estoque';
import { pode } from '@/lib/permissions';
import { enviarJson, mensagemErro, textoDoErro } from '@/lib/resposta';
import '@/components/ui/modulo.css';

type Aba = 'dispensacoes' | 'estoque' | 'entradas';

const ABAS = [
  { id: 'dispensacoes', label: 'Dispensações', icon: 'las la-user-injured' },
  { id: 'estoque', label: 'Estoque', icon: 'las la-boxes' },
  { id: 'entradas', label: 'Entradas', icon: 'las la-arrow-down' },
] as const;

const MOVIMENTACOES_VAZIAS: RespostaMovimentacoes = { itens: [], total: 0, entradasHoje: 0, saidasHoje: 0 };

export default function FarmaciaPage() {
  const { data: session } = useSession();
  const podeDispensar = pode(session?.user?.cargo, 'farmacia:dispensar');
  const podeGerir = pode(session?.user?.cargo, 'estoque:gerir');

  const [activeTab, setActiveTab] = useState<Aba>('dispensacoes');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<RespostaMovimentacoes>(MOVIMENTACOES_VAZIAS);

  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalDispensacao, setModalDispensacao] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [buscarMedicamento, setBuscarMedicamento] = useState('');

  const [entMed, setEntMed] = useState('');
  const [entPrincipio, setEntPrincipio] = useState('');
  const [entLote, setEntLote] = useState('');
  const [entValidade, setEntValidade] = useState('');
  const [entQtd, setEntQtd] = useState(1);
  const [entMinima, setEntMinima] = useState(10);
  const [entFornecedor, setEntFornecedor] = useState('');
  const [entUnidade, setEntUnidade] = useState('Comprimido');

  const [dispPaciente, setDispPaciente] = useState('');
  const [dispMedicamentoId, setDispMedicamentoId] = useState('');
  const [dispQtd, setDispQtd] = useState(1);
  const [dispVia, setDispVia] = useState('Oral');
  const [dispLeito, setDispLeito] = useState('');

  const carregarDados = useCallback(async () => {
    try {
      const [resEstoque, resMov] = await Promise.all([
        fetch('/api/estoque?categoria=FARMACIA'),
        fetch('/api/estoque/movimentacao?categoria=FARMACIA'),
      ]);
      if (!resEstoque.ok) throw new Error(await mensagemErro(resEstoque, 'Não foi possível carregar o estoque.'));
      if (!resMov.ok) throw new Error(await mensagemErro(resMov, 'Não foi possível carregar as movimentações.'));
      const [dadosEstoque, dadosMov] = await Promise.all([resEstoque.json(), resMov.json()]);
      if (!Array.isArray(dadosEstoque) || !Array.isArray(dadosMov?.itens)) throw new Error('Resposta inválida ao carregar a farmácia.');
      setEstoque(dadosEstoque);
      setMovimentacoes(dadosMov);
      setLoadError('');
    } catch (erro) {
      setLoadError(textoDoErro(erro, 'Não foi possível conectar aos dados da farmácia.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial: o setState só ocorre depois do await da requisição.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void carregarDados(); }, [carregarDados]);

  const abrirModal = (qual: 'entrada' | 'dispensacao') => {
    setErroForm('');
    setSucesso('');
    if (qual === 'entrada') setModalEntrada(true);
    else setModalDispensacao(true);
  };

  const confirmarEntrada = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!entMed.trim() || !Number.isSafeInteger(entQtd) || entQtd <= 0 || !Number.isSafeInteger(entMinima) || entMinima < 0) {
      setErroForm('Informe o medicamento, uma quantidade inteira positiva e um mínimo válido.');
      return;
    }
    setIsSaving(true);
    setErroForm('');
    try {
      // O servidor reconhece o item por nome e lote: não duplica nem perde a validade informada.
      await enviarJson('/api/estoque', 'POST', {
        categoria: 'FARMACIA',
        nome: entMed.trim(),
        codigo: entPrincipio.trim(),
        lote: entLote.trim(),
        validade: entValidade || null,
        quantidade: entQtd,
        minimo: entMinima,
        unidade: entUnidade,
        fornecedor: entFornecedor.trim(),
      }, 'Não foi possível registrar a entrada.');
      setModalEntrada(false);
      setEntMed(''); setEntPrincipio(''); setEntLote(''); setEntValidade('');
      setEntQtd(1); setEntMinima(10); setEntFornecedor(''); setEntUnidade('Comprimido');
      setSucesso('Entrada registrada.');
      await carregarDados();
    } catch (erro) {
      setErroForm(textoDoErro(erro, 'Não foi possível registrar a entrada.'));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmarDispensacao = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!dispPaciente || !dispMedicamentoId || !Number.isSafeInteger(dispQtd) || dispQtd <= 0) {
      setErroForm('Selecione paciente e medicamento e informe uma quantidade inteira positiva.');
      return;
    }
    setIsSaving(true);
    setErroForm('');
    try {
      await enviarJson('/api/estoque/movimentacao', 'POST', {
        tipo: 'SAIDA',
        itemId: dispMedicamentoId,
        quantidade: dispQtd,
        pacienteId: dispPaciente,
        setor: dispLeito.trim() || 'Farmácia',
        observacao: `Via: ${dispVia}`,
      }, 'Não foi possível registrar a dispensação.');
      setModalDispensacao(false);
      setDispPaciente(''); setDispMedicamentoId(''); setDispQtd(1);
      setDispVia('Oral'); setDispLeito('');
      setSucesso('Dispensação registrada.');
      await carregarDados();
    } catch (erro) {
      setErroForm(textoDoErro(erro, 'Não foi possível registrar a dispensação.'));
    } finally {
      setIsSaving(false);
    }
  };

  const entradas = movimentacoes.itens.filter(m => m.tipo === 'ENTRADA');
  const termoPaciente = buscarPaciente.trim().toLocaleLowerCase('pt-BR');
  const saidas = movimentacoes.itens.filter(m => m.tipo !== 'ENTRADA'
    && (!termoPaciente || m.paciente?.nome.toLocaleLowerCase('pt-BR').includes(termoPaciente)));

  const termoMedicamento = buscarMedicamento.trim().toLocaleLowerCase('pt-BR');
  const listaEstoque = estoque.filter(m => m.nome.toLocaleLowerCase('pt-BR').includes(termoMedicamento)
    || (m.codigo || '').toLocaleLowerCase('pt-BR').includes(termoMedicamento));

  const comSaldo = estoque.filter(m => m.quantidade > 0);
  const vencidos = comSaldo.filter(m => estaVencido(m.validade)).length;
  const aVencer = comSaldo.filter(m => venceEmBreve(m.validade)).length;

  const cabecalho = (
    <PageHeader
      icon="las la-prescription"
      title="Farmácia"
      subtitle="Medicamentos, dispensação e estoque"
      actions={!loading && <>
        {podeGerir && <button type="button" className="btn btn-secondary" onClick={() => abrirModal('entrada')}><i className="las la-box" aria-hidden="true"></i> Entrada de estoque</button>}
        {podeDispensar && <button type="button" className="btn btn-primary" onClick={() => abrirModal('dispensacao')}><i className="las la-plus-circle" aria-hidden="true"></i> Nova dispensação</button>}
      </>}
    />
  );

  if (loading) return <div className="conteudo mod-pagina">{cabecalho}<LoadingState message="Carregando a farmácia..." /></div>;

  const opcoesDispensacao = itensDisponiveis(estoque);
  const notaLimite = movimentacoes.total > movimentacoes.itens.length
    ? `Mostrando as ${movimentacoes.itens.length} movimentações mais recentes de ${movimentacoes.total}.`
    : '';

  return (
    <div className="conteudo mod-pagina">
      {cabecalho}

      {loadError && <ErrorState message={loadError} onRetry={() => void carregarDados()} />}
      {sucesso && <p className="mod-aviso mod-aviso-sucesso" role="status">{sucesso}</p>}
      {vencidos > 0 && <p className="mod-aviso mod-aviso-erro" role="alert">{vencidos} {vencidos === 1 ? 'lote vencido' : 'lotes vencidos'} com saldo: a saída está bloqueada. Baixe por ajuste, na aba Estoque.</p>}

      <StatGrid>
        <StatCard icon="las la-box" value={movimentacoes.entradasHoje} label="Entradas hoje" />
        <StatCard icon="las la-truck" value={movimentacoes.saidasHoje} label="Dispensações hoje" />
        <StatCard icon="las la-warehouse" value={estoque.length} label="Lotes" hint="Lotes cadastrados" />
        <StatCard icon="las la-calendar-times" value={vencidos} label="Vencidos" tone="danger" alerta hint="Lotes vencidos com saldo: a saída fica bloqueada" />
        <StatCard icon="las la-hourglass-half" value={aVencer} label="A vencer" tone="warning" alerta hint="Lotes com saldo que vencem em até 30 dias" />
      </StatGrid>

      <Tabs tabs={ABAS} active={activeTab} onChange={setActiveTab} label="Seções da farmácia" />

      {activeTab === 'dispensacoes' && (
        <Panel>
          <SearchInput value={buscarPaciente} onChange={setBuscarPaciente} placeholder="Buscar paciente" />
          {notaLimite && <p className="mod-nota">{notaLimite}</p>}
          {saidas.length === 0 ? <EmptyState icon="las la-capsules" message="Nenhuma dispensação encontrada." /> : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <caption className="sr-only">Dispensações e ajustes de medicamentos</caption>
                <thead><tr><th scope="col">Data/hora</th><th scope="col">Paciente</th><th scope="col">Medicamento</th><th scope="col">Lote</th><th scope="col">Qtd.</th><th scope="col">Setor</th><th scope="col">Responsável</th></tr></thead>
                <tbody>
                  {saidas.map(s => (
                    <tr key={s.id}>
                      <td>{new Date(s.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{s.paciente?.nome || '-'}</td>
                      <td>{s.item?.nome}{s.tipo === 'AJUSTE' && <> <Badge tone="warning">Ajuste</Badge><span className="mod-secundario">{s.observacao}</span></>}</td>
                      <td>{s.item?.lote || '-'}</td>
                      <td><strong>{s.tipo === 'SAIDA' ? `-${s.quantidade}` : s.quantidade > 0 ? `+${s.quantidade}` : s.quantidade}</strong></td>
                      <td>{s.setor || '-'}</td>
                      <td>{s.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {activeTab === 'estoque' && (
        <Panel>
          <SearchInput value={buscarMedicamento} onChange={setBuscarMedicamento} placeholder="Buscar medicamento" />
          <p className="mod-nota">Ordenado por produto e validade: o lote que vence primeiro aparece antes.</p>
          <TabelaEstoque itens={listaEstoque} podeAjustar={podeGerir} onAjustado={() => void carregarDados()} vazio="Nenhum medicamento encontrado." />
        </Panel>
      )}

      {activeTab === 'entradas' && (
        <Panel>
          {notaLimite && <p className="mod-nota">{notaLimite}</p>}
          {entradas.length === 0 ? <EmptyState icon="las la-box" message="Nenhuma entrada registrada." /> : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <caption className="sr-only">Entradas de medicamentos</caption>
                <thead><tr><th scope="col">Data/hora</th><th scope="col">Medicamento</th><th scope="col">Lote</th><th scope="col">Fornecedor</th><th scope="col">Qtd.</th><th scope="col">Responsável</th></tr></thead>
                <tbody>
                  {entradas.map(e => (
                    <tr key={e.id}>
                      <td>{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{e.item?.nome}</td>
                      <td>{e.item?.lote || '-'}</td>
                      <td>{e.fornecedor || '-'}</td>
                      <td><strong>+{e.quantidade}</strong></td>
                      <td>{e.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {modalDispensacao && (
        <Modal title="Nova dispensação" icon="las la-prescription" busy={isSaving} onClose={() => setModalDispensacao(false)}>
          <form onSubmit={confirmarDispensacao}>
            {erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>}
            <PacienteSelect value={dispPaciente} onChange={id => setDispPaciente(id)} required />
            <div className="form-group">
              <label htmlFor="disp-medicamento">Medicamento, lote e validade *</label>
              <select id="disp-medicamento" value={dispMedicamentoId} onChange={e => setDispMedicamentoId(e.target.value)}>
                <option value="">{opcoesDispensacao.length ? 'Selecione...' : 'Nenhum lote disponível'}</option>
                {opcoesDispensacao.map(m => <option key={m.id} value={m.id}>{rotuloItem(m)}</option>)}
              </select>
              <span className="mod-secundario">Lotes vencidos não aparecem. O que vence primeiro vem antes.</span>
            </div>
            <div className="mod-form-grid">
              <div className="form-group"><label htmlFor="disp-qtd">Quantidade *</label><input id="disp-qtd" type="number" min="1" step="1" value={dispQtd} onChange={e => setDispQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="disp-via">Via</label><select id="disp-via" value={dispVia} onChange={e => setDispVia(e.target.value)}><option>Oral</option><option>Intravenosa</option><option>Intramuscular</option><option>Subcutânea</option><option>Tópica</option></select></div>
              <div className="form-group"><label htmlFor="disp-leito">Leito ou setor</label><input id="disp-leito" type="text" maxLength={200} placeholder="Ex.: Leito 12" value={dispLeito} onChange={e => setDispLeito(e.target.value)} /></div>
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-secondary" onClick={() => setModalDispensacao(false)} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Confirmar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modalEntrada && (
        <Modal title="Entrada de estoque" icon="las la-box" busy={isSaving} onClose={() => setModalEntrada(false)}>
          <form onSubmit={confirmarEntrada}>
            {erroForm && <p className="mod-aviso mod-aviso-erro" role="alert">{erroForm}</p>}
            <div className="mod-form-grid">
              <div className="form-group"><label htmlFor="ent-med">Medicamento *</label><input id="ent-med" type="text" maxLength={200} placeholder="Nome do medicamento" value={entMed} onChange={e => setEntMed(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="ent-principio">Princípio ativo</label><input id="ent-principio" type="text" maxLength={100} value={entPrincipio} onChange={e => setEntPrincipio(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="ent-lote">Lote</label><input id="ent-lote" type="text" maxLength={100} value={entLote} onChange={e => setEntLote(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="ent-validade">Validade</label><input id="ent-validade" type="date" value={entValidade} onChange={e => setEntValidade(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="ent-qtd">Quantidade *</label><input id="ent-qtd" type="number" min="1" step="1" value={entQtd} onChange={e => setEntQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="ent-minima">Mínimo de alerta</label><input id="ent-minima" type="number" min="0" step="1" value={entMinima} onChange={e => setEntMinima(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="ent-fornecedor">Fornecedor</label><input id="ent-fornecedor" type="text" maxLength={200} value={entFornecedor} onChange={e => setEntFornecedor(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="ent-unidade">Unidade</label><select id="ent-unidade" value={entUnidade} onChange={e => setEntUnidade(e.target.value)}><option>Comprimido</option><option>Ampola</option><option>Frasco</option><option>Seringa</option><option>Bisnaga</option><option>Caixa</option></select></div>
            </div>
            <div className="mod-acoes">
              <button type="button" className="btn btn-secondary" onClick={() => setModalEntrada(false)} disabled={isSaving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
