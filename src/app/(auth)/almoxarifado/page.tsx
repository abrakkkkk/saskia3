'use client';
import { useState, useEffect } from 'react';
import './almoxarifado.css';

interface EstoqueItem {
  id: string;
  categoria: string;
  nome: string;
  codigo?: string;
  subcategoria?: string;
  quantidade: number;
  unidade?: string;
  minimo: number;
  lote?: string;
  validade?: string;
  fornecedor?: string;
}

interface MovimentacaoEstoque {
  id: string;
  tipo: string;
  itemId: string;
  item?: EstoqueItem;
  quantidade: number;
  setor?: string;
  fornecedor?: string;
  responsavel: string;
  createdAt: string;
}

async function mensagemErroResposta(response: Response, fallback: string) {
  const data: unknown = await response.json().catch(() => null);
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') return data.error;
  return fallback;
}

export default function AlmoxarifadoPage() {
  const [activeTab, setActiveTab] = useState<'estoque' | 'movimentacoes'>('estoque');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  
  const [buscarItem, setBuscarItem] = useState('');
  const [buscarMov, setBuscarMov] = useState('');
  const [filtroTipoMov, setFiltroTipoMov] = useState('todos');

  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalSaida, setModalSaida] = useState(false);
  const [modalNovoItem, setModalNovoItem] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Entrada
  const [entradaItemId, setEntradaItemId] = useState('');
  const [entradaQtd, setEntradaQtd] = useState(1);
  const [entradaFornecedor, setEntradaFornecedor] = useState('');

  // Form Saida
  const [saidaItemId, setSaidaItemId] = useState('');
  const [saidaQtd, setSaidaQtd] = useState(1);
  const [saidaSetor, setSaidaSetor] = useState('Farmácia');

  // Form Novo Item
  const [novoNome, setNovoNome] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoCategoria, setNovoCategoria] = useState('Material Hospitalar');
  const [novoUnidade, setNovoUnidade] = useState('Unidade');
  const [novoQtd, setNovoQtd] = useState(0);
  const [novoMinimo, setNovoMinimo] = useState(10);

  const carregarDados = async () => {
    setLoading(true);
    const erros: string[] = [];
    try {
      const [resItens, resMov] = await Promise.all([
        fetch('/api/estoque?categoria=ALMOXARIFADO'),
        fetch('/api/estoque/movimentacao?categoria=ALMOXARIFADO')
      ]);

      if (resItens.ok) {
        const dataItens = await resItens.json();
        if (Array.isArray(dataItens)) setItens(dataItens);
        else { setItens([]); erros.push('itens do estoque'); }
      } else {
        setItens([]);
        erros.push('itens do estoque');
      }

      if (resMov.ok) {
        const dataMov = await resMov.json();
        if (Array.isArray(dataMov)) setMovimentacoes(dataMov);
        else { setMovimentacoes([]); erros.push('movimentações'); }
      } else {
        setMovimentacoes([]);
        erros.push('movimentações');
      }
      setErroCarga(erros.length ? `Não foi possível carregar: ${erros.join(' e ')}.` : '');
    } catch (e) {
      console.error('Erro ao buscar estoque almoxarifado:', e);
      setItens([]);
      setMovimentacoes([]);
      setErroCarga('Não foi possível conectar aos dados do almoxarifado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (!modalEntrada && !modalSaida && !modalNovoItem) return;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSaving) return;
      setModalEntrada(false);
      setModalSaida(false);
      setModalNovoItem(false);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [modalEntrada, modalSaida, modalNovoItem, isSaving]);

  const confirmarEntrada = async () => {
    if (!entradaItemId || !Number.isSafeInteger(entradaQtd) || entradaQtd <= 0 || entradaQtd > 2147483647) {
      alert('Selecione um item e informe uma quantidade inteira positiva.');
      return;
    }
    setIsSaving(true);
    try {
      const resMov = await fetch('/api/estoque/movimentacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ENTRADA',
          categoria: 'ALMOXARIFADO',
          itemId: entradaItemId,
          quantidade: entradaQtd,
          fornecedor: entradaFornecedor,
        })
      });

      if (!resMov.ok) throw new Error(await mensagemErroResposta(resMov, 'Erro ao registrar entrada.'));

      setModalEntrada(false);
      setEntradaItemId(''); setEntradaQtd(1); setEntradaFornecedor('');
      alert(" Entrada registrada!");
      carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao registrar entrada.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmarSaida = async () => {
    if (!saidaItemId || !Number.isSafeInteger(saidaQtd) || saidaQtd <= 0 || saidaQtd > 2147483647) {
      alert('Selecione um item e informe uma quantidade inteira positiva.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/estoque/movimentacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'SAIDA',
          categoria: 'ALMOXARIFADO',
          itemId: saidaItemId,
          quantidade: saidaQtd,
          setor: saidaSetor,
        })
      });

      if (!res.ok) {
        throw new Error(await mensagemErroResposta(res, 'Erro ao registrar saída.'));
      }

      setModalSaida(false);
      setSaidaItemId(''); setSaidaQtd(1); setSaidaSetor('Farmácia');
      alert(" Saída registrada!");
      carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao registrar saída.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmarNovoItem = async () => {
    if (!novoNome.trim() || !Number.isSafeInteger(novoQtd) || novoQtd < 0 || novoQtd > 2147483647 ||
      !Number.isSafeInteger(novoMinimo) || novoMinimo < 0 || novoMinimo > 2147483647) {
      alert('Informe o nome do item, uma quantidade inicial inteira e um mínimo válido.');
      return;
    }
    setIsSaving(true);
    try {
      const finalCodigo = novoCodigo.trim() || ("MAT-" + String(itens.length + 1).padStart(3, '0'));
      
      const resNovo = await fetch('/api/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: 'ALMOXARIFADO', // Forçando a categoria master
          nome: novoNome.trim(),
          codigo: finalCodigo,
          subcategoria: novoCategoria,
          validade: null,
          quantidade: novoQtd,
          registrarMovimentacaoInicial: true,
          minimo: novoMinimo,
          unidade: novoUnidade
        })
      });

      if (!resNovo.ok) {
        const erro = await resNovo.json().catch(() => null);
        throw new Error(erro?.error || "Erro ao criar item");
      }

      setModalNovoItem(false);
      setNovoNome(''); setNovoCodigo(''); setNovoQtd(0); setNovoMinimo(10);
      alert(" Item cadastrado!");
      carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao cadastrar item.');
    } finally {
      setIsSaving(false);
    }
  };

  const hojeStr = new Date().toLocaleDateString('pt-BR');
  const entradasHoje = movimentacoes.filter(m => m.tipo === 'ENTRADA' && new Date(m.createdAt).toLocaleDateString('pt-BR') === hojeStr);
  const saidasHoje = movimentacoes.filter(m => m.tipo === 'SAIDA' && new Date(m.createdAt).toLocaleDateString('pt-BR') === hojeStr);

  const stats = {
    total: itens.length,
    entradas: entradasHoje.length,
    saidas: saidasHoje.length,
    baixos: itens.filter(i => i.quantidade <= i.minimo).length,
    catTodos: itens.length
  };

  let listaEstoque = itens;
  if (buscarItem.trim()) {
    const t = buscarItem.trim().toLocaleLowerCase('pt-BR');
    listaEstoque = listaEstoque.filter(i => i.nome.toLowerCase().includes(t) || (i.codigo || '').toLowerCase().includes(t));
  }

  let listaMov = [...movimentacoes];
  if (filtroTipoMov !== 'todos') {
    listaMov = listaMov.filter(m => m.tipo === filtroTipoMov.toUpperCase());
  }
  if (buscarMov.trim()) {
    const t = buscarMov.trim().toLocaleLowerCase('pt-BR');
    listaMov = listaMov.filter(m => m.item?.nome?.toLocaleLowerCase('pt-BR').includes(t));
  }

  if (loading && itens.length === 0) {
    return (
      <div className="conteudo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Carregando dados do Almoxarifado...</p>
      </div>
    );
  }

  return (
    <div className="conteudo">
      <div className="almox-container">
        <div className="banner-almox">
          <div>
            <h1><i className="las la-boxes"></i> Almoxarifado</h1>
            <p>Controle de materiais, insumos e equipamentos (Oficial)</p>
          </div>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            <button className="btn-almox btn-success" onClick={() => setModalEntrada(true)}><i className="las la-arrow-down"></i> Entrada</button>
            <button className="btn-almox btn-danger" onClick={() => setModalSaida(true)}><i className="las la-arrow-up"></i> Saída</button>
            <button className="btn-almox" style={{background: '#3b82f6'}} onClick={() => setModalNovoItem(true)}><i className="las la-plus-circle"></i> Novo Item</button>
          </div>
        </div>

        {erroCarga && <div className="almox-load-error" role="alert">{erroCarga}</div>}

        <div className="stats-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '30px', gap: '20px'}}>
          <div className="stat-card" style={{borderLeftColor: '#1e3a8a'}}>
            <div className="stat-icon" style={{background:'#eff6ff', color:'#1e3a8a'}}><i className="las la-boxes"></i></div>
            <div><div className="stat-numero">{stats.total}</div><div className="stat-label">Itens em Estoque</div></div>
          </div>
          <div className="stat-card" style={{borderLeftColor: '#16a34a'}}>
            <div className="stat-icon" style={{background:'#dcfce7', color:'#16a34a'}}><i className="las la-arrow-down"></i></div>
            <div><div className="stat-numero">{stats.entradas}</div><div className="stat-label">Entradas Hoje</div></div>
          </div>
          <div className="stat-card" style={{borderLeftColor: '#dc2626'}}>
            <div className="stat-icon" style={{background:'#fef2f2', color:'#dc2626'}}><i className="las la-arrow-up"></i></div>
            <div><div className="stat-numero">{stats.saidas}</div><div className="stat-label">Saídas Hoje</div></div>
          </div>
          <div className="stat-card" style={{borderLeftColor: '#f59e0b'}}>
            <div className="stat-icon" style={{background:'#fffbeb', color:'#d97706'}}><i className="las la-exclamation-triangle"></i></div>
            <div><div className="stat-numero">{stats.baixos}</div><div className="stat-label">Estoque Baixo</div></div>
          </div>
        </div>

        <div className="categorias-grid">
          <div className="categoria-card ativo"><i className="las la-list"></i><h4>Todos</h4><p>{stats.catTodos} itens</p></div>
        </div>

        <div className="tabs-almox">
          <button type="button" aria-pressed={activeTab === 'estoque'} className={`tab-btn ${activeTab === 'estoque' ? 'ativo' : ''}`} onClick={() => setActiveTab('estoque')}><i className="las la-boxes" aria-hidden="true"></i> Estoque</button>
          <button type="button" aria-pressed={activeTab === 'movimentacoes'} className={`tab-btn ${activeTab === 'movimentacoes' ? 'ativo' : ''}`} onClick={() => setActiveTab('movimentacoes')}><i className="las la-exchange-alt" aria-hidden="true"></i> Movimentações</button>
        </div>

        {activeTab === 'estoque' && (
          <div className="card">
            <div className="busca-wrapper" style={{marginBottom: '20px'}}>
              <i className="las la-search" aria-hidden="true"></i>
              <input type="text" aria-label="Buscar itens por nome ou código" placeholder="Buscar por nome ou código..." value={buscarItem} onChange={e => setBuscarItem(e.target.value)} />
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="tabela-almox">
                <thead><tr><th>Código</th><th>Item</th><th>Unid.</th><th>Qtd.</th><th>Mín.</th><th>Status</th></tr></thead>
                <tbody>
                  {listaEstoque.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        <i className="las la-boxes" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', opacity: 0.5 }}></i>
                        Nenhum item encontrado no estoque do Almoxarifado.
                      </td>
                    </tr>
                  ) : (
                    listaEstoque.map(i => {
                      const baixo = i.quantidade <= i.minimo;
                      const status = i.quantidade === 0 ? 'Zerado' : (baixo ? 'Baixo' : 'OK');
                      return (
                        <tr key={i.id}>
                          <td><strong>{i.codigo || '-'}</strong></td>
                          <td>
                            <div>{i.nome}</div>
                            {i.subcategoria && <small style={{ color: '#64748b' }}>{i.subcategoria}</small>}
                          </td>
                          <td>{i.unidade || '-'}</td>
                          <td style={{color: baixo ? '#dc2626' : '#16a34a', fontWeight: 'bold'}}>{i.quantidade}</td>
                          <td>{i.minimo}</td>
                          <td><span className={`status-badge ${i.quantidade===0?'badge-danger':(baixo?'badge-warning':'badge-success')}`} style={{background: i.quantidade===0?'#fef2f2':(baixo?'#fffbeb':'#dcfce7'), color: i.quantidade===0?'#dc2626':(baixo?'#d97706':'#16a34a')}}>{status}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'movimentacoes' && (
          <div className="card">
            <div className="almox-filter-row">
              <div className="busca-wrapper" style={{flex: 1}}>
                <i className="las la-search" aria-hidden="true"></i>
                <input type="text" aria-label="Buscar movimentações por item" placeholder="Buscar por item..." value={buscarMov} onChange={e => setBuscarMov(e.target.value)} />
              </div>
              <select aria-label="Filtrar movimentações pelo tipo" value={filtroTipoMov} onChange={e => setFiltroTipoMov(e.target.value)} style={{padding:'13px', borderRadius: '8px', border:'1px solid #cbd5e1'}}>
                <option value="todos">Todos</option><option value="ENTRADA">Entradas</option><option value="SAIDA">Saídas</option>
              </select>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="tabela-almox">
                <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Item</th><th>Qtd.</th><th>Destino/Fornecedor</th><th>Responsável</th></tr></thead>
                <tbody>
                  {listaMov.length === 0 ? (
                    <tr><td colSpan={6} style={{textAlign:'center', padding:'30px'}}>Nenhuma movimentação</td></tr>
                  ) : (
                    listaMov.slice(0, 50).map((m, idx) => (
                      <tr key={m.id}>
                        <td>{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
                        <td><span className="status-badge" style={{background: m.tipo==='ENTRADA'?'#dcfce7':'#fef2f2', color: m.tipo==='ENTRADA'?'#16a34a':'#dc2626'}}>{m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</span></td>
                        <td>{m.item?.nome}</td>
                        <td>{m.quantidade}</td>
                        <td>{m.setor || m.fornecedor || '-'}</td>
                        <td>{m.responsavel}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalEntrada && (
        <div className="modal-almox" onClick={e => { if (e.target === e.currentTarget && !isSaving) setModalEntrada(false); }}>
          <div className="modal-almox-conteudo" role="dialog" aria-modal="true" aria-labelledby="almox-entrada-title">
            <h3 id="almox-entrada-title" style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}><i className="las la-arrow-down" aria-hidden="true"></i> Registrar Entrada</h3>
            <div className="form-grid">
              <div className="form-group"><label htmlFor="almox-entrada-item">Item *</label><select id="almox-entrada-item" value={entradaItemId} onChange={e => setEntradaItemId(e.target.value)}><option value="">Selecione...</option>{itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></div>
              <div className="form-group"><label htmlFor="almox-entrada-quantidade">Quantidade *</label><input id="almox-entrada-quantidade" type="number" min="1" step="1" value={Number.isNaN(entradaQtd) ? '' : entradaQtd} onChange={e => setEntradaQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-entrada-fornecedor">Fornecedor</label><input id="almox-entrada-fornecedor" type="text" value={entradaFornecedor} onChange={e => setEntradaFornecedor(e.target.value)} /></div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" onClick={() => setModalEntrada(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn btn-success" onClick={confirmarEntrada} disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {modalSaida && (
        <div className="modal-almox" onClick={e => { if (e.target === e.currentTarget && !isSaving) setModalSaida(false); }}>
          <div className="modal-almox-conteudo" role="dialog" aria-modal="true" aria-labelledby="almox-saida-title">
            <h3 id="almox-saida-title" style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}><i className="las la-arrow-up" aria-hidden="true"></i> Registrar Saída</h3>
            <div className="form-grid">
              <div className="form-group"><label htmlFor="almox-saida-item">Item *</label><select id="almox-saida-item" value={saidaItemId} onChange={e => setSaidaItemId(e.target.value)}><option value="">Selecione...</option>{itens.filter(i => i.quantidade > 0).map(i => <option key={i.id} value={i.id}>{i.nome} ({i.quantidade})</option>)}</select></div>
              <div className="form-group"><label htmlFor="almox-saida-quantidade">Quantidade *</label><input id="almox-saida-quantidade" type="number" min="1" step="1" value={Number.isNaN(saidaQtd) ? '' : saidaQtd} onChange={e => setSaidaQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-saida-setor">Setor Destino</label><select id="almox-saida-setor" value={saidaSetor} onChange={e => setSaidaSetor(e.target.value)}><option>Farmácia</option><option>UTI</option><option>Emergência</option><option>Enfermaria</option><option>Centro Cirúrgico</option><option>Outro</option></select></div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" onClick={() => setModalSaida(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn btn-warning" onClick={confirmarSaida} disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar Saída'}</button>
            </div>
          </div>
        </div>
      )}

      {modalNovoItem && (
        <div className="modal-almox" onClick={e => { if (e.target === e.currentTarget && !isSaving) setModalNovoItem(false); }}>
          <div className="modal-almox-conteudo" role="dialog" aria-modal="true" aria-labelledby="almox-novo-title">
            <h3 id="almox-novo-title" style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}><i className="las la-plus-circle" aria-hidden="true"></i> Cadastrar Novo Item</h3>
            <div className="form-grid">
              <div className="form-group"><label htmlFor="almox-novo-nome">Nome *</label><input id="almox-novo-nome" type="text" placeholder="Nome do item" value={novoNome} onChange={e => setNovoNome(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-codigo">Código</label><input id="almox-novo-codigo" type="text" placeholder="Automático se vazio" value={novoCodigo} onChange={e => setNovoCodigo(e.target.value)} /></div>
              <div className="form-group"><label htmlFor="almox-novo-categoria">Categoria *</label><select id="almox-novo-categoria" value={novoCategoria} onChange={e => setNovoCategoria(e.target.value)}><option>Material Hospitalar</option><option>Equipamentos</option><option>Higiene e Limpeza</option><option>EPIs</option><option>Escritório</option></select></div>
              <div className="form-group"><label htmlFor="almox-novo-unidade">Unidade</label><select id="almox-novo-unidade" value={novoUnidade} onChange={e => setNovoUnidade(e.target.value)}><option>Unidade</option><option>Caixa</option><option>Pacote</option><option>Frasco</option><option>Par</option><option>Metro</option><option>Litro</option><option>Kg</option></select></div>
              <div className="form-group"><label htmlFor="almox-novo-quantidade">Qtd. Inicial</label><input id="almox-novo-quantidade" type="number" min="0" max="2147483647" step="1" value={Number.isNaN(novoQtd) ? '' : novoQtd} onChange={e => setNovoQtd(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
              <div className="form-group"><label htmlFor="almox-novo-minimo">Estoque Mínimo</label><input id="almox-novo-minimo" type="number" min="0" max="2147483647" step="1" value={Number.isNaN(novoMinimo) ? '' : novoMinimo} onChange={e => setNovoMinimo(e.target.value === '' ? 0 : Number(e.target.value))} /></div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" onClick={() => setModalNovoItem(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarNovoItem} disabled={isSaving}>{isSaving ? 'Cadastrando...' : 'Cadastrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
