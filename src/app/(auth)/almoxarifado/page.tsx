'use client';
import { useState, useEffect } from 'react';
import './almoxarifado.css';

interface AlmoxItem {
  codigo: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  minima: number;
}

interface AlmoxMov {
  data: string;
  hora: string;
  tipo: string;
  item: string;
  codigo: string;
  quantidade: number;
  setor?: string;
  fornecedor?: string;
  responsavel: string;
}

export default function AlmoxarifadoPage() {
  const [hospitalId, setHospitalId] = useState('hospital_001');
  const [activeTab, setActiveTab] = useState<'estoque' | 'movimentacoes'>('estoque');
  
  const [itens, setItens] = useState<AlmoxItem[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<AlmoxMov[]>([]);
  
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [buscarItem, setBuscarItem] = useState('');
  const [buscarMov, setBuscarMov] = useState('');
  const [filtroTipoMov, setFiltroTipoMov] = useState('todos');

  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalSaida, setModalSaida] = useState(false);
  const [modalNovoItem, setModalNovoItem] = useState(false);

  // Form Entrada
  const [entradaCodigo, setEntradaCodigo] = useState('');
  const [entradaQtd, setEntradaQtd] = useState(1);
  const [entradaFornecedor, setEntradaFornecedor] = useState('');

  // Form Saida
  const [saidaCodigo, setSaidaCodigo] = useState('');
  const [saidaQtd, setSaidaQtd] = useState(1);
  const [saidaSetor, setSaidaSetor] = useState('Farmácia');

  // Form Novo Item
  const [novoNome, setNovoNome] = useState('');
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoCategoria, setNovoCategoria] = useState('Material Hospitalar');
  const [novoUnidade, setNovoUnidade] = useState('Unidade');
  const [novoQtd, setNovoQtd] = useState(0);
  const [novoMinimo, setNovoMinimo] = useState(10);

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      let storedItens = JSON.parse(localStorage.getItem(`${hid}_almoxItens`) || '[]');
      if (storedItens.length === 0) {
        storedItens = [
          { codigo: "MAT-001", nome: "Seringa 10ml", categoria: "Material Hospitalar", unidade: "Unidade", quantidade: 250, minima: 50 },
          { codigo: "MAT-002", nome: "Luvas de Procedimento P", categoria: "EPIs", unidade: "Caixa", quantidade: 120, minima: 20 },
          { codigo: "MAT-003", nome: "Álcool 70% 1L", categoria: "Higiene e Limpeza", unidade: "Frasco", quantidade: 45, minima: 20 },
          { codigo: "MAT-004", nome: "Papel A4", categoria: "Escritório", unidade: "Pacote", quantidade: 80, minima: 20 },
          { codigo: "MAT-005", nome: "Termômetro Digital", categoria: "Equipamentos", unidade: "Unidade", quantidade: 15, minima: 5 }
        ];
        localStorage.setItem(`${hid}_almoxItens`, JSON.stringify(storedItens));
      }
      setItens(storedItens);
      setMovimentacoes(JSON.parse(localStorage.getItem(`${hid}_almoxMov`) || '[]'));
    } catch(e) {}
  }, []);

  const saveItens = (data: AlmoxItem[]) => {
    setItens(data);
    localStorage.setItem(`${hospitalId}_almoxItens`, JSON.stringify(data));
  };

  const saveMov = (data: AlmoxMov[]) => {
    setMovimentacoes(data);
    localStorage.setItem(`${hospitalId}_almoxMov`, JSON.stringify(data));
  };

  const confirmarEntrada = () => {
    if (!entradaCodigo || !entradaQtd) {
      alert("Selecione item e quantidade!");
      return;
    }
    const novosItens = [...itens];
    const idx = novosItens.findIndex(i => i.codigo === entradaCodigo);
    if (idx >= 0) {
      novosItens[idx].quantidade += entradaQtd;
    }

    saveItens(novosItens);

    const u = localStorage.getItem('usuarioLogado');
    const resp = (u ? JSON.parse(u) : null)?.nome || "Sistema";

    saveMov([...movimentacoes, {
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR'),
      tipo: "Entrada",
      item: idx >= 0 ? novosItens[idx].nome : "",
      codigo: entradaCodigo,
      quantidade: entradaQtd,
      fornecedor: entradaFornecedor,
      responsavel: resp
    }]);

    setModalEntrada(false);
    setEntradaCodigo(''); setEntradaQtd(1); setEntradaFornecedor('');
    alert("✅ Entrada registrada!");
  };

  const confirmarSaida = () => {
    if (!saidaCodigo || !saidaQtd) {
      alert("Selecione item e quantidade!");
      return;
    }
    const novosItens = [...itens];
    const idx = novosItens.findIndex(i => i.codigo === saidaCodigo);
    
    if (idx < 0 || novosItens[idx].quantidade < saidaQtd) {
      alert("Estoque insuficiente!");
      return;
    }
    
    novosItens[idx].quantidade -= saidaQtd;
    saveItens(novosItens);

    const u = localStorage.getItem('usuarioLogado');
    const resp = (u ? JSON.parse(u) : null)?.nome || "Sistema";

    saveMov([...movimentacoes, {
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR'),
      tipo: "Saída",
      item: novosItens[idx].nome,
      codigo: saidaCodigo,
      quantidade: saidaQtd,
      setor: saidaSetor,
      responsavel: resp
    }]);

    setModalSaida(false);
    setSaidaCodigo(''); setSaidaQtd(1); setSaidaSetor('Farmácia');
    alert("📦 Saída registrada!");
  };

  const confirmarNovoItem = () => {
    if (!novoNome) {
      alert("Digite o nome do item!");
      return;
    }
    const finalCodigo = novoCodigo || ("MAT-" + String(itens.length + 1).padStart(3, '0'));
    
    saveItens([...itens, {
      codigo: finalCodigo,
      nome: novoNome,
      categoria: novoCategoria,
      unidade: novoUnidade,
      quantidade: novoQtd,
      minima: novoMinimo
    }]);

    setModalNovoItem(false);
    setNovoNome(''); setNovoCodigo(''); setNovoQtd(0); setNovoMinimo(10);
    alert("✅ Item cadastrado!");
  };

  const hoje = new Date().toLocaleDateString('pt-BR');
  const stats = {
    total: itens.length,
    entradas: movimentacoes.filter(m => m.data === hoje && m.tipo === 'Entrada').length,
    saidas: movimentacoes.filter(m => m.data === hoje && m.tipo === 'Saída').length,
    baixos: itens.filter(i => i.quantidade <= i.minima).length,
    catTodos: itens.length,
    catHospitalar: itens.filter(i => i.categoria === 'Material Hospitalar').length,
    catEquipamentos: itens.filter(i => i.categoria === 'Equipamentos').length,
    catHigiene: itens.filter(i => i.categoria === 'Higiene e Limpeza').length,
    catEPIs: itens.filter(i => i.categoria === 'EPIs').length,
    catEscritorio: itens.filter(i => i.categoria === 'Escritório').length
  };

  let listaEstoque = itens;
  if (categoriaFiltro !== 'todos') {
    listaEstoque = listaEstoque.filter(i => i.categoria === categoriaFiltro);
  }
  if (buscarItem) {
    const t = buscarItem.toLowerCase();
    listaEstoque = listaEstoque.filter(i => i.nome.toLowerCase().includes(t) || i.codigo.toLowerCase().includes(t));
  }

  let listaMov = [...movimentacoes].reverse();
  if (filtroTipoMov !== 'todos') {
    listaMov = listaMov.filter(m => m.tipo === filtroTipoMov);
  }
  if (buscarMov) {
    listaMov = listaMov.filter(m => m.item.toLowerCase().includes(buscarMov.toLowerCase()));
  }

  return (
    <div className="conteudo">
      <div className="almox-container">
        <div className="banner-almox">
          <div>
            <h1><i className="las la-boxes"></i> Almoxarifado</h1>
            <p>Controle de materiais, insumos e equipamentos hospitalares</p>
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
          <div className={`categoria-card ${categoriaFiltro === 'todos' ? 'ativo' : ''}`} onClick={() => setCategoriaFiltro('todos')}><i className="las la-list"></i><h4>Todos</h4><p>{stats.catTodos} itens</p></div>
          <div className={`categoria-card ${categoriaFiltro === 'Material Hospitalar' ? 'ativo' : ''}`} onClick={() => setCategoriaFiltro('Material Hospitalar')}><i className="las la-syringe"></i><h4>Material Hospitalar</h4><p>{stats.catHospitalar} itens</p></div>
          <div className={`categoria-card ${categoriaFiltro === 'Equipamentos' ? 'ativo' : ''}`} onClick={() => setCategoriaFiltro('Equipamentos')}><i className="las la-tools"></i><h4>Equipamentos</h4><p>{stats.catEquipamentos} itens</p></div>
          <div className={`categoria-card ${categoriaFiltro === 'Higiene e Limpeza' ? 'ativo' : ''}`} onClick={() => setCategoriaFiltro('Higiene e Limpeza')}><i className="las la-pump-soap"></i><h4>Higiene/Limpeza</h4><p>{stats.catHigiene} itens</p></div>
          <div className={`categoria-card ${categoriaFiltro === 'EPIs' ? 'ativo' : ''}`} onClick={() => setCategoriaFiltro('EPIs')}><i className="las la-hard-hat"></i><h4>EPIs</h4><p>{stats.catEPIs} itens</p></div>
          <div className={`categoria-card ${categoriaFiltro === 'Escritório' ? 'ativo' : ''}`} onClick={() => setCategoriaFiltro('Escritório')}><i className="las la-paperclip"></i><h4>Escritório</h4><p>{stats.catEscritorio} itens</p></div>
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
                <thead><tr><th>Código</th><th>Item</th><th>Categoria</th><th>Unid.</th><th>Qtd.</th><th>Mín.</th><th>Status</th></tr></thead>
                <tbody>
                  {listaEstoque.length === 0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center', padding:'30px'}}>Nenhum item</td></tr>
                  ) : (
                    listaEstoque.map(i => {
                      const baixo = i.quantidade <= i.minima;
                      const status = i.quantidade === 0 ? 'Zerado' : (baixo ? 'Baixo' : 'OK');
                      return (
                        <tr key={i.codigo}>
                          <td><strong>{i.codigo}</strong></td>
                          <td>{i.nome}</td>
                          <td>{i.categoria}</td>
                          <td>{i.unidade}</td>
                          <td style={{color: baixo ? '#dc2626' : '#16a34a', fontWeight: 'bold'}}>{i.quantidade}</td>
                          <td>{i.minima}</td>
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
                <option value="todos">Todos</option><option value="Entrada">Entradas</option><option value="Saída">Saídas</option>
              </select>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="tabela-almox">
                <thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th>Qtd.</th><th>Destino/Fornecedor</th><th>Responsável</th></tr></thead>
                <tbody>
                  {listaMov.length === 0 ? (
                    <tr><td colSpan={6} style={{textAlign:'center', padding:'30px'}}>Nenhuma movimentação</td></tr>
                  ) : (
                    listaMov.slice(0, 50).map((m, idx) => (
                      <tr key={idx}>
                        <td>{m.data} {m.hora}</td>
                        <td><span className="status-badge" style={{background: m.tipo==='Entrada'?'#dcfce7':'#fef2f2', color: m.tipo==='Entrada'?'#16a34a':'#dc2626'}}>{m.tipo}</span></td>
                        <td>{m.item}</td>
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
              <div className="form-group"><label>Item *</label><select value={entradaCodigo} onChange={e => setEntradaCodigo(e.target.value)}><option value="">Selecione...</option>{itens.map(i => <option key={i.codigo} value={i.codigo}>{i.nome}</option>)}</select></div>
              <div className="form-group"><label>Quantidade *</label><input type="number" min="1" value={entradaQtd} onChange={e => setEntradaQtd(parseInt(e.target.value))} /></div>
              <div className="form-group"><label>Fornecedor</label><input type="text" value={entradaFornecedor} onChange={e => setEntradaFornecedor(e.target.value)} /></div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" onClick={() => setModalEntrada(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={confirmarEntrada}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {modalSaida && (
        <div className="modal-almox" onClick={e => { if (e.target === e.currentTarget) setModalSaida(false); }}>
          <div className="modal-almox-conteudo">
            <h3 style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}><i className="las la-arrow-up"></i> Registrar Saída</h3>
            <div className="form-grid">
              <div className="form-group"><label>Item *</label><select value={saidaCodigo} onChange={e => setSaidaCodigo(e.target.value)}><option value="">Selecione...</option>{itens.filter(i => i.quantidade > 0).map(i => <option key={i.codigo} value={i.codigo}>{i.nome} ({i.quantidade})</option>)}</select></div>
              <div className="form-group"><label>Quantidade *</label><input type="number" min="1" value={saidaQtd} onChange={e => setSaidaQtd(parseInt(e.target.value))} /></div>
              <div className="form-group"><label>Setor Destino</label><select value={saidaSetor} onChange={e => setSaidaSetor(e.target.value)}><option>Farmácia</option><option>UTI</option><option>Emergência</option><option>Enfermaria</option><option>Centro Cirúrgico</option><option>Outro</option></select></div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" onClick={() => setModalSaida(false)}>Cancelar</button>
              <button className="btn btn-warning" onClick={confirmarSaida}>Registrar Saída</button>
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
              <button className="btn btn-danger" onClick={() => setModalNovoItem(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarNovoItem}>Cadastrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
