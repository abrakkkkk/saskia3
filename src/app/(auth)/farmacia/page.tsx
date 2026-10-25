'use client';
import { getSessionUser } from '@/lib/session';
import { useState, useEffect } from 'react';
import './farmacia.css';

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
  pacienteId?: string;
  paciente?: any;
  setor?: string;
  fornecedor?: string;
  responsavel: string;
  observacao?: string;
  createdAt: string;
}

interface Paciente {
  id: string;
  nome: string;
}

export default function FarmaciaPage() {
  const [activeTab, setActiveTab] = useState<'pacientes' | 'estoque' | 'entradas' | 'saidas'>('pacientes');
  const [loading, setLoading] = useState(true);

  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalDispensacao, setModalDispensacao] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filtros
  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [buscarMedicamento, setBuscarMedicamento] = useState('');

  // Form Entrada
  const [entMed, setEntMed] = useState('');
  const [entPrincipio, setEntPrincipio] = useState('');
  const [entLote, setEntLote] = useState('');
  const [entValidade, setEntValidade] = useState('');
  const [entQtd, setEntQtd] = useState(1);
  const [entMinima, setEntMinima] = useState(10);
  const [entFornecedor, setEntFornecedor] = useState('');
  const [entUnidade, setEntUnidade] = useState('Comprimido');

  // Form Dispensação
  const [dispPaciente, setDispPaciente] = useState('');
  const [dispMedicamentoId, setDispMedicamentoId] = useState('');
  const [dispQtd, setDispQtd] = useState(1);
  const [dispVia, setDispVia] = useState('Oral');
  const [dispLeito, setDispLeito] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resEstoque, resMov, resPacientes] = await Promise.all([
        fetch('/api/estoque?categoria=FARMACIA'),
        fetch('/api/estoque/movimentacao?categoria=FARMACIA'),
        fetch('/api/pacientes')
      ]);

      if (resEstoque.ok) {
        const dataEst = await resEstoque.json();
        setEstoque(Array.isArray(dataEst) ? dataEst : []);
      } else {
        setEstoque([]);
      }

      if (resMov.ok) {
        const dataMov = await resMov.json();
        setMovimentacoes(Array.isArray(dataMov) ? dataMov : []);
      } else {
        setMovimentacoes([]);
      }

      if (resPacientes.ok) {
        const dataPac = await resPacientes.json();
        setPacientes(Array.isArray(dataPac) ? dataPac : []);
      } else {
        setPacientes([]);
      }
    } catch (e) {
      console.error('Erro ao carregar dados da farmácia:', e);
      setEstoque([]);
      setMovimentacoes([]);
      setPacientes([]);
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
    if (!entMed) {
      alert("Preencha o nome do medicamento!");
      return;
    }
    setIsSaving(true);
    try {
      // 1. Check if item exists, if not, create it first
      let item = estoque.find(s => s.nome.toLowerCase() === entMed.toLowerCase() && s.lote === entLote);
      if (!item) {
        const resNovo = await fetch('/api/estoque', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoria: 'FARMACIA',
            nome: entMed,
            codigo: entPrincipio,
            lote: entLote,
            validade: entValidade || null,
            quantidade: 0, // Movimentação que vai somar
            minimo: entMinima,
            unidade: entUnidade,
            fornecedor: entFornecedor
          })
        });
        if (!resNovo.ok) throw new Error("Erro ao criar item");
        item = await resNovo.json();
      }

      // 2. Add Entrada
      const resMov = await fetch('/api/estoque/movimentacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ENTRADA',
          itemId: item!.id,
          quantidade: entQtd,
          fornecedor: entFornecedor,
          responsavel: getResponsavel()
        })
      });

      if (!resMov.ok) throw new Error("Erro ao registrar entrada");

      setModalEntrada(false);
      setEntMed(''); setEntPrincipio(''); setEntLote(''); setEntValidade('');
      setEntQtd(1); setEntMinima(10); setEntFornecedor(''); setEntUnidade('Comprimido');
      alert("✅ Entrada registrada com sucesso!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmarDispensacao = async () => {
    if (!dispPaciente || !dispMedicamentoId) {
      alert("Selecione paciente e medicamento!");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/estoque/movimentacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'SAIDA',
          itemId: dispMedicamentoId,
          quantidade: dispQtd,
          pacienteId: dispPaciente,
          setor: dispLeito || 'Farmácia',
          observacao: `Via: ${dispVia}`,
          responsavel: getResponsavel()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao registrar dispensação");
      }

      setModalDispensacao(false);
      setDispPaciente(''); setDispMedicamentoId(''); setDispQtd(1);
      setDispVia('Oral'); setDispLeito('');
      alert("✅ Dispensação realizada com sucesso!");
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
    entradas: entradasHoje.length,
    saidas: saidasHoje.length,
    estoque: estoque.length,
    pendentes: 0
  };

  const entradas = movimentacoes.filter(m => m.tipo === 'ENTRADA');
  const saidas = movimentacoes.filter(m => m.tipo === 'SAIDA');

  let listaPacientes = saidas.slice().reverse();
  if (buscarPaciente) {
    listaPacientes = listaPacientes.filter(s => s.paciente?.nome?.toLowerCase().includes(buscarPaciente.toLowerCase()));
  }

  const listaEstoque = estoque.filter(m => 
    m.nome.toLowerCase().includes(buscarMedicamento.toLowerCase()) || 
    (m.codigo || '').toLowerCase().includes(buscarMedicamento.toLowerCase())
  );

  if (loading && estoque.length === 0) {
    return (
      <div className="conteudo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Carregando dados da Farmácia Hospitalar...</p>
      </div>
    );
  }

  return (
    <div className="conteudo">
      <div className="farmacia-container">

        <div className="banner-farmacia">
          <div>
            <h1><i className="las la-prescription"></i> Farmácia Hospitalar</h1>
            <p>Controle de medicamentos, dispensação e estoque oficial do sistema</p>
          </div>
          <div>
            <button className="btn-farmacia btn-primary" onClick={() => setModalDispensacao(true)}><i className="las la-plus-circle"></i> Nova Dispensação</button>
            <button className="btn-farmacia btn-success" onClick={() => setModalEntrada(true)} style={{marginLeft:'10px'}}><i className="las la-box"></i> Entrada de Estoque</button>
          </div>
        </div>

        <div className="status-cards">
          <div className="status-card entrada"><div className="card-icon"><i className="las la-box"></i></div><div className="card-numero">{stats.entradas}</div><div className="card-label">Entradas Hoje</div></div>
          <div className="status-card saida"><div className="card-icon"><i className="las la-truck"></i></div><div className="card-numero">{stats.saidas}</div><div className="card-label">Dispensações Hoje</div></div>
          <div className="status-card estoque"><div className="card-icon"><i className="las la-warehouse"></i></div><div className="card-numero">{stats.estoque}</div><div className="card-label">Medicamentos em Estoque</div></div>
          <div className="status-card pendente"><div className="card-icon"><i className="las la-clock"></i></div><div className="card-numero">{stats.pendentes}</div><div className="card-label">Pacientes Aguardando</div></div>
        </div>

        <div className="tabs-farmacia">
          <button className={`tab-btn ${activeTab === 'pacientes' ? 'ativo' : ''}`} onClick={() => setActiveTab('pacientes')}><i className="las la-user-injured"></i> Pacientes</button>
          <button className={`tab-btn ${activeTab === 'estoque' ? 'ativo' : ''}`} onClick={() => setActiveTab('estoque')}><i className="las la-boxes"></i> Estoque</button>
          <button className={`tab-btn ${activeTab === 'entradas' ? 'ativo' : ''}`} onClick={() => setActiveTab('entradas')}><i className="las la-arrow-down"></i> Entradas</button>
          <button className={`tab-btn ${activeTab === 'saidas' ? 'ativo' : ''}`} onClick={() => setActiveTab('saidas')}><i className="las la-arrow-up"></i> Dispensações</button>
        </div>

        {activeTab === 'pacientes' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar paciente dispensado..." value={buscarPaciente} onChange={e => setBuscarPaciente(e.target.value)} />
            </div>
            <div>
              {listaPacientes.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px',color:'#94a3b8'}}>Nenhum registro</div>
              ) : (
                listaPacientes.map((s, idx) => {
                  return (
                    <div className="paciente-card dispensado" key={idx}>
                      <div className="paciente-info">
                        <h4><i className="las la-user"></i> {s.paciente?.nome || 'Desconhecido'}</h4>
                        <p><i className="las la-map-marker"></i> {s.setor || 'N/I'} | {new Date(s.createdAt).toLocaleString('pt-BR')}</p>
                        <p><i className="las la-capsules"></i> {s.item?.nome} - {s.quantidade}x | {s.observacao}</p>
                      </div>
                      <div className="paciente-actions">
                        <span className="badge badge-success">Dispensado</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'estoque' && (
          <div>
            <div className="search-box"><input type="text" placeholder="Buscar medicamento..." value={buscarMedicamento} onChange={e => setBuscarMedicamento(e.target.value)} /></div>
            <table className="tabela-farmacia">
              <thead><tr><th>Medicamento</th><th>Princípio Ativo</th><th>Lote</th><th>Validade</th><th>Qtd.</th><th>Mín.</th><th>Status</th></tr></thead>
              <tbody>
                {listaEstoque.map((m, idx) => {
                  const baixo = m.quantidade <= m.minimo;
                  return (
                    <tr key={m.id}>
                      <td><strong>{m.nome}</strong><br/><small>{m.unidade}</small></td>
                      <td>{m.codigo || '-'}</td>
                      <td>{m.lote || '-'}</td>
                      <td>{m.validade ? new Date(m.validade).toLocaleDateString('pt-BR') : '-'}</td>
                      <td style={{color: baixo ? '#dc2626' : '#16a34a', fontWeight: 'bold'}}>{m.quantidade}</td>
                      <td>{m.minimo}</td>
                      <td><span className={`badge ${m.quantidade === 0 ? 'badge-danger' : (baixo ? 'badge-warning' : 'badge-success')}`}>{m.quantidade === 0 ? 'Zerado' : (baixo ? 'Baixo' : 'OK')}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'entradas' && (
          <table className="tabela-farmacia">
            <thead><tr><th>Data/Hora</th><th>Medicamento</th><th>Fornecedor</th><th>Qtd.</th><th>Responsável</th></tr></thead>
            <tbody>
              {entradas.slice().reverse().slice(0, 50).map((e, idx) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{e.item?.nome}</td>
                  <td>{e.fornecedor || '-'}</td>
                  <td><span style={{color: '#16a34a', fontWeight: 'bold'}}>+{e.quantidade}</span></td>
                  <td>{e.responsavel}</td>
                </tr>
              ))}
              {entradas.length === 0 && <tr><td colSpan={5} style={{textAlign:'center',padding:'30px'}}>Nenhuma entrada</td></tr>}
            </tbody>
          </table>
        )}

        {activeTab === 'saidas' && (
          <table className="tabela-farmacia">
            <thead><tr><th>Data/Hora</th><th>Paciente</th><th>Medicamento</th><th>Qtd.</th><th>Responsável</th></tr></thead>
            <tbody>
              {saidas.slice().reverse().slice(0, 50).map((s, idx) => (
                <tr key={s.id}>
                  <td>{new Date(s.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{s.paciente?.nome || s.setor || '-'}</td>
                  <td>{s.item?.nome}</td>
                  <td><span style={{color: '#dc2626', fontWeight: 'bold'}}>-{s.quantidade}</span></td>
                  <td>{s.responsavel}</td>
                </tr>
              ))}
              {saidas.length === 0 && <tr><td colSpan={5} style={{textAlign:'center',padding:'30px'}}>Nenhuma dispensação</td></tr>}
            </tbody>
          </table>
        )}

      </div>

      {modalDispensacao && (
        <div className="modal-farmacia" style={{display:'flex'}} onClick={(e) => { if (e.target === e.currentTarget) setModalDispensacao(false); }}>
          <div className="modal-farmacia-conteudo">
            <h3><i className="las la-prescription"></i> Nova Dispensação</h3>
            <div className="form-grid">
              <div className="form-grupo"><label>Paciente *</label><select value={dispPaciente} onChange={e => setDispPaciente(e.target.value)}><option value="">Selecione...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
              <div className="form-grupo"><label>Medicamento *</label><select value={dispMedicamentoId} onChange={e => setDispMedicamentoId(e.target.value)}><option value="">Selecione...</option>{estoque.filter(m => m.quantidade > 0).map(m => <option key={m.id} value={m.id}>{m.nome} ({m.quantidade})</option>)}</select></div>
              <div className="form-grupo"><label>Quantidade *</label><input type="number" min="1" value={dispQtd} onChange={e => setDispQtd(parseInt(e.target.value))} /></div>
              <div className="form-grupo"><label>Via</label><select value={dispVia} onChange={e => setDispVia(e.target.value)}><option>Oral</option><option>Intravenosa</option><option>Intramuscular</option><option>Subcutânea</option><option>Tópica</option></select></div>
              <div className="form-grupo"><label>Leito/Setor</label><input type="text" placeholder="Ex: Leito 12" value={dispLeito} onChange={e => setDispLeito(e.target.value)} /></div>
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'20px'}}>
              <button className="btn-farmacia btn-danger" onClick={() => setModalDispensacao(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn-farmacia btn-success" onClick={confirmarDispensacao} disabled={isSaving}>{isSaving ? 'Registrando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {modalEntrada && (
        <div className="modal-farmacia" style={{display:'flex'}} onClick={(e) => { if (e.target === e.currentTarget) setModalEntrada(false); }}>
          <div className="modal-farmacia-conteudo">
            <h3><i className="las la-box"></i> Entrada de Estoque</h3>
            <div className="form-grid">
              <div className="form-grupo"><label>Medicamento *</label><input type="text" placeholder="Nome do medicamento" value={entMed} onChange={e => setEntMed(e.target.value)} /></div>
              <div className="form-grupo"><label>Princípio Ativo</label><input type="text" value={entPrincipio} onChange={e => setEntPrincipio(e.target.value)} /></div>
              <div className="form-grupo"><label>Lote</label><input type="text" value={entLote} onChange={e => setEntLote(e.target.value)} /></div>
              <div className="form-grupo"><label>Validade</label><input type="date" value={entValidade} onChange={e => setEntValidade(e.target.value)} /></div>
              <div className="form-grupo"><label>Quantidade Adicionada *</label><input type="number" min="1" value={entQtd} onChange={e => setEntQtd(parseInt(e.target.value))} /></div>
              <div className="form-grupo"><label>Qtd. Mínima Alerta</label><input type="number" min="1" value={entMinima} onChange={e => setEntMinima(parseInt(e.target.value))} /></div>
              <div className="form-grupo"><label>Fornecedor</label><input type="text" value={entFornecedor} onChange={e => setEntFornecedor(e.target.value)} /></div>
              <div className="form-grupo"><label>Unidade</label><select value={entUnidade} onChange={e => setEntUnidade(e.target.value)}><option>Comprimido</option><option>Ampola</option><option>Frasco</option><option>Seringa</option><option>Bisnaga</option><option>Caixa</option></select></div>
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'20px'}}>
              <button className="btn-farmacia btn-danger" onClick={() => setModalEntrada(false)} disabled={isSaving}>Cancelar</button>
              <button className="btn-farmacia btn-success" onClick={confirmarEntrada} disabled={isSaving}>{isSaving ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
