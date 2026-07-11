'use client';
import { getSessionUser } from '@/lib/session';
import { useState, useEffect } from 'react';
import './almoxarifado.css';

interface EstoqueItem {
  id: string;
  categoria: string;
  nome: string;
  codigo?: string;
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

export default function AlmoxarifadoPage() {
  const [activeTab, setActiveTab] = useState<'estoque' | 'movimentacoes'>('estoque');
  const [loading, setLoading] = useState(true);
  
  const [itens, setItens] = useState<EstoqueItem[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
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
    try {
      const [resItens, resMov] = await Promise.all([
        fetch('/api/estoque?categoria=ALMOXARIFADO'),
        fetch('/api/estoque/movimentacao?categoria=ALMOXARIFADO')
      ]);

      if (resItens.ok) setItens(await resItens.json());
      if (resMov.ok) setMovimentacoes(await resMov.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const getResponsavel = () => {
    try {
      const u = JSON.stringify(getSessionUser());
      return (u ? JSON.parse(u) : null)?.nome || "Sistema";
    } catch {
      return "Sistema";
    }
  };

  const confirmarEntrada = async () => {
    if (!entradaItemId || !entradaQtd) {
      alert("Selecione item e quantidade!");
      return;
    }
    setIsSaving(true);
    try {
      const resMov = await fetch('/api/estoque/movimentacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ENTRADA',
          itemId: entradaItemId,
          quantidade: entradaQtd,
          fornecedor: entradaFornecedor,
          responsavel: getResponsavel()
        })
      });

      if (!resMov.ok) throw new Error("Erro ao registrar entrada");

      setModalEntrada(false);
      setEntradaItemId(''); setEntradaQtd(1); setEntradaFornecedor('');
      alert("✅ Entrada registrada!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmarSaida = async () => {
    if (!saidaItemId || !saidaQtd) {
      alert("Selecione item e quantidade!");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/estoque/movimentacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'SAIDA',
          itemId: saidaItemId,
          quantidade: saidaQtd,
          setor: saidaSetor,
          responsavel: getResponsavel()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao registrar saída");
      }

      setModalSaida(false);
      setSaidaItemId(''); setSaidaQtd(1); setSaidaSetor('Farmácia');
      alert("📦 Saída registrada!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmarNovoItem = async () => {
    if (!novoNome) {
      alert("Digite o nome do item!");
      return;
    }
    setIsSaving(true);
    try {
      const finalCodigo = novoCodigo || ("MAT-" + String(itens.length + 1).padStart(3, '0'));
      
      const resNovo = await fetch('/api/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: 'ALMOXARIFADO', // Forçando a categoria master
          nome: novoNome,
          codigo: finalCodigo,
          validade: null,
          quantidade: novoQtd,
          minimo: novoMinimo,
          unidade: novoUnidade,
          observacao: `Sub-categoria: ${novoCategoria}`
        })
      });

      if (!resNovo.ok) throw new Error("Erro ao criar item");
      
      const itemCriado = await resNovo.json();

      // Se tiver qtd inicial > 0, cria a movimentação de entrada inicial
      if (novoQtd > 0) {
        await fetch('/api/estoque/movimentacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'ENTRADA',
            itemId: itemCriado.id,
            quantidade: novoQtd,
            fornecedor: 'Estoque Inicial',
            responsavel: getResponsavel()
          })
        });
      }

      setModalNovoItem(false);
      setNovoNome(''); setNovoCodigo(''); setNovoQtd(0); setNovoMinimo(10);
      alert("✅ Item cadastrado!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
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
    catTodos: itens.length,
    // O mock antigo contava baseado no campo categoria. Como agora ALMOXARIFADO é a categoria master no banco, 
    // a sub-categoria estava no mock. Aqui vamos fazer um fallback ou apenas mostrar tudo.
    catHospitalar: itens.length,
    catEquipamentos: 0,
    catHigiene: 0,
    catEPIs: 0,
    catEscritorio: 0
  };

  let listaEstoque = itens;
  if (categoriaFiltro !== 'todos') {
    // Para simplificar a refatoração, vamos ignorar a subcategoria visual se não estiver usando o observacao para guardar
  }
  if (buscarItem) {
    const t = buscarItem.toLowerCase();
    listaEstoque = listaEstoque.filter(i => i.nome.toLowerCase().includes(t) || (i.codigo || '').toLowerCase().includes(t));
  }

  let listaMov = [...movimentacoes];
  if (filtroTipoMov !== 'todos') {
    listaMov = listaMov.filter(m => m.tipo === filtroTipoMov.toUpperCase());
  }
  if (buscarMov) {
    listaMov = listaMov.filter(m => m.item?.nome?.toLowerCase().includes(buscarMov.toLowerCase()));
  }

  if (loading) return <div style={{padding:'50px',textAlign:'center'}}><h2>Carregando Almoxarifado...</h2></div>;

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
          <button className={`tab-btn ${activeTab === 'estoque' ? 'ativo' : ''}`} onClick={() => setActiveTab('estoque')}><i className="las la-boxes"></i> Estoque</button>
          <button className={`tab-btn ${activeTab === 'movimentacoes' ? 'ativo' : ''}`} onClick={() => setActiveTab('movimentacoes')}><i className="las la-exchange-alt"></i> Movimentações</button>
        </div>

        {activeTab === 'estoque' && (
          <div className="card">
            <div className="busca-wrapper" style={{marginBottom: '20px'}}>
              <i className="las la-search"></i>
              <input type="text" placeholder="Buscar por nome ou código..." value={buscarItem} onChange={e => setBuscarItem(e.target.value)} />
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="tabela-almox">
                <thead><tr><th>Código</th><th>Item</th><th>Unid.</th><th>Qtd.</th><th>Mín.</th><th>Status</th></tr></thead>
                <tbody>
                  {listaEstoque.length === 0 ? (
                    <tr><td colSpan={6} style={{textAlign:'center', padding:'30px'}}>Nenhum item</td></tr>
                  ) : (
                    listaEstoque.map(i => {
                      const baixo = i.quantidade <= i.minimo;
                      const status = i.quantidade === 0 ? 'Zerado' : (baixo ? 'Baixo' : 'OK');
                      return (
                        <tr key={i.id}>
                          <td><strong>{i.codigo || '-'}</strong></td>
                          <td>{i.nome}</td>
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
            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
              <div className="busca-wrapper" style={{flex: 1}}>
                <i className="las la-search"></i>
                <input type="text" placeholder="Buscar por item..." value={buscarMov} onChange={e => setBuscarMov(e.target.value)} />
              </div>
              <select value={filtroTipoMov} onChange={e => setFiltroTipoMov(e.target.value)} style={{padding:'13px', borderRadius:'8px', border:'1px solid #cbd5e1', outline:'none'}}>
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
        <div className="modal-almox" onClick={e => { if (e.target === e.currentTarget) setModalEntrada(false); }}>
          <div className="modal-almox-conteudo">
            <h3 style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}><i className="las la-arrow-down"></i> Registrar Entrada</h3>
            <div className="form-grid">
              <div className="form-group"><label>Item *</label><select value={entradaItemId} onChange={e => setEntradaItemId(e.target.value)}><option value="">Selecione...</option>{itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></div>
              <div className="form-group"><label>Quantidade *</label><input type="number" min="1" value={entradaQtd} onChange={e => setEntradaQtd(parseInt(e.target.value))} /></div>
              <div className="form-group"><label>Fornecedor</label><input type="text" value={entradaFornecedor} onChange={e => setEntradaFornecedor(e.target.value)} /></div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" onClick={() => setModalEntrada(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn btn-success" onClick={confirmarEntrada} disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {modalSaida && (
        <div className="modal-almox" onClick={e => { if (e.target === e.currentTarget) setModalSaida(false); }}>
          <div className="modal-almox-conteudo">
            <h3 style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}><i className="las la-arrow-up"></i> Registrar Saída</h3>
            <div className="form-grid">
              <div className="form-group"><label>Item *</label><select value={saidaItemId} onChange={e => setSaidaItemId(e.target.value)}><option value="">Selecione...</option>{itens.filter(i => i.quantidade > 0).map(i => <option key={i.id} value={i.id}>{i.nome} ({i.quantidade})</option>)}</select></div>
              <div className="form-group"><label>Quantidade *</label><input type="number" min="1" value={saidaQtd} onChange={e => setSaidaQtd(parseInt(e.target.value))} /></div>
              <div className="form-group"><label>Setor Destino</label><select value={saidaSetor} onChange={e => setSaidaSetor(e.target.value)}><option>Farmácia</option><option>UTI</option><option>Emergência</option><option>Enfermaria</option><option>Centro Cirúrgico</option><option>Outro</option></select></div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" onClick={() => setModalSaida(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn btn-warning" onClick={confirmarSaida} disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar Saída'}</button>
            </div>
          </div>
        </div>
      )}

      {modalNovoItem && (
        <div className="modal-almox" onClick={e => { if (e.target === e.currentTarget) setModalNovoItem(false); }}>
          <div className="modal-almox-conteudo">
            <h3 style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}><i className="las la-plus-circle"></i> Cadastrar Novo Item</h3>
            <div className="form-grid">
              <div className="form-group"><label>Nome *</label><input type="text" placeholder="Nome do item" value={novoNome} onChange={e => setNovoNome(e.target.value)} /></div>
              <div className="form-group"><label>Código</label><input type="text" placeholder="Automático se vazio" value={novoCodigo} onChange={e => setNovoCodigo(e.target.value)} /></div>
              <div className="form-group"><label>Categoria *</label><select value={novoCategoria} onChange={e => setNovoCategoria(e.target.value)}><option>Material Hospitalar</option><option>Equipamentos</option><option>Higiene e Limpeza</option><option>EPIs</option><option>Escritório</option></select></div>
              <div className="form-group"><label>Unidade</label><select value={novoUnidade} onChange={e => setNovoUnidade(e.target.value)}><option>Unidade</option><option>Caixa</option><option>Pacote</option><option>Frasco</option><option>Par</option><option>Metro</option><option>Litro</option><option>Kg</option></select></div>
              <div className="form-group"><label>Qtd. Inicial</label><input type="number" min="0" value={novoQtd} onChange={e => setNovoQtd(parseInt(e.target.value))} /></div>
              <div className="form-group"><label>Estoque Mínimo</label><input type="number" min="1" value={novoMinimo} onChange={e => setNovoMinimo(parseInt(e.target.value))} /></div>
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
