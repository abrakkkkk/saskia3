'use client';
import { useState, useEffect } from 'react';
import './farmacia.css';

interface EstoqueItem {
  medicamento: string;
  principio: string;
  lote: string;
  validade: string;
  quantidade: number;
  minima: number;
  unidade: string;
}

interface Entrada {
  data: string;
  hora: string;
  medicamento: string;
  lote: string;
  quantidade: number;
  fornecedor: string;
  responsavel: string;
}

interface Saida {
  data: string;
  hora: string;
  paciente: string;
  leito: string;
  medicamento: string;
  quantidade: number;
  via: string;
  prioridade: string;
  status: string;
  responsavel: string;
}

interface Paciente {
  id: number;
  nome: string;
}

export default function FarmaciaPage() {
  const [activeTab, setActiveTab] = useState<'pacientes' | 'estoque' | 'entradas' | 'saidas'>('pacientes');
  const [hospitalId, setHospitalId] = useState('hospital_001');

  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalDispensacao, setModalDispensacao] = useState(false);

  // Filtros
  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
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
  const [dispMedicamento, setDispMedicamento] = useState('');
  const [dispQtd, setDispQtd] = useState(1);
  const [dispVia, setDispVia] = useState('Oral');
  const [dispPrioridade, setDispPrioridade] = useState('Normal');
  const [dispLeito, setDispLeito] = useState('');

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      const p = JSON.parse(localStorage.getItem(`${hid}_pacientes`) || '[]');
      setPacientes(p);

      let est = JSON.parse(localStorage.getItem(`${hid}_farmaciaEstoque`) || '[]');
      if (est.length === 0) {
        est = [
          {medicamento:"Dipirona 500mg",principio:"Dipirona",lote:"L001",validade:"2027-06-15",quantidade:250,minima:50,unidade:"Comprimido"},
          {medicamento:"Amoxicilina 500mg",principio:"Amoxicilina",lote:"L002",validade:"2027-03-20",quantidade:120,minima:30,unidade:"Comprimido"},
          {medicamento:"Soro Fisiológico 500ml",principio:"Cloreto de Sódio",lote:"L003",validade:"2028-01-10",quantidade:85,minima:20,unidade:"Frasco"},
          {medicamento:"Morfina 10mg/ml",principio:"Sulfato de Morfina",lote:"L004",validade:"2027-12-01",quantidade:45,minima:10,unidade:"Ampola"}
        ];
        localStorage.setItem(`${hid}_farmaciaEstoque`, JSON.stringify(est));
      }
      setEstoque(est);

      setEntradas(JSON.parse(localStorage.getItem(`${hid}_farmaciaEntradas`) || '[]'));
      setSaidas(JSON.parse(localStorage.getItem(`${hid}_farmaciaSaidas`) || '[]'));
    } catch(e) {}
  }, []);

  const saveEstoque = (data: EstoqueItem[]) => {
    setEstoque(data);
    localStorage.setItem(`${hospitalId}_farmaciaEstoque`, JSON.stringify(data));
  };
  const saveEntradas = (data: Entrada[]) => {
    setEntradas(data);
    localStorage.setItem(`${hospitalId}_farmaciaEntradas`, JSON.stringify(data));
  };
  const saveSaidas = (data: Saida[]) => {
    setSaidas(data);
    localStorage.setItem(`${hospitalId}_farmaciaSaidas`, JSON.stringify(data));
  };

  const confirmarEntrada = () => {
    if (!entMed || !entLote) {
      alert("Preencha medicamento e lote!");
      return;
    }
    const novoEstoque = [...estoque];
    const idx = novoEstoque.findIndex(s => s.lote === entLote && s.medicamento === entMed);
    if (idx >= 0) {
      novoEstoque[idx].quantidade += entQtd;
    } else {
      novoEstoque.push({
        medicamento: entMed,
        principio: entPrincipio,
        lote: entLote,
        validade: entValidade,
        quantidade: entQtd,
        minima: entMinima,
        unidade: entUnidade
      });
    }
    saveEstoque(novoEstoque);

    const u = localStorage.getItem('usuarioLogado');
    const resp = (u ? JSON.parse(u) : null)?.nome || "Sistema";

    saveEntradas([...entradas, {
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR'),
      medicamento: entMed,
      lote: entLote,
      quantidade: entQtd,
      fornecedor: entFornecedor,
      responsavel: resp
    }]);

    setModalEntrada(false);
    setEntMed(''); setEntPrincipio(''); setEntLote(''); setEntValidade('');
    setEntQtd(1); setEntMinima(10); setEntFornecedor(''); setEntUnidade('Comprimido');
    alert("✅ Entrada registrada!");
  };

  const confirmarDispensacao = () => {
    if (!dispPaciente || !dispMedicamento) {
      alert("Selecione paciente e medicamento!");
      return;
    }
    const novoEstoque = [...estoque];
    const itemIdx = novoEstoque.findIndex(e => e.medicamento === dispMedicamento);
    if (itemIdx < 0 || novoEstoque[itemIdx].quantidade < dispQtd) {
      alert("Estoque insuficiente!");
      return;
    }
    novoEstoque[itemIdx].quantidade -= dispQtd;
    saveEstoque(novoEstoque);

    const u = localStorage.getItem('usuarioLogado');
    const resp = (u ? JSON.parse(u) : null)?.nome || "Sistema";

    saveSaidas([...saidas, {
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR'),
      paciente: dispPaciente,
      leito: dispLeito,
      medicamento: dispMedicamento,
      quantidade: dispQtd,
      via: dispVia,
      prioridade: dispPrioridade,
      status: "Dispensado",
      responsavel: resp
    }]);

    setModalDispensacao(false);
    setDispPaciente(''); setDispMedicamento(''); setDispQtd(1);
    setDispVia('Oral'); setDispPrioridade('Normal'); setDispLeito('');
    alert("✅ Dispensação realizada!");
  };

  const hoje = new Date().toLocaleDateString('pt-BR');
  const stats = {
    entradas: entradas.filter(e => e.data === hoje).length,
    saidas: saidas.filter(s => s.data === hoje).length,
    estoque: estoque.length,
    pendentes: saidas.filter(s => s.status === "Aguardando").length
  };

  let listaPacientes = [...saidas].reverse();
  if (filtroStatus !== 'todos') {
    listaPacientes = listaPacientes.filter(s => filtroStatus === 'aguardando' ? s.status === 'Aguardando' : s.status === 'Dispensado');
  }
  if (buscarPaciente) {
    listaPacientes = listaPacientes.filter(s => s.paciente.toLowerCase().includes(buscarPaciente.toLowerCase()));
  }

  const listaEstoque = estoque.filter(m => 
    m.medicamento.toLowerCase().includes(buscarMedicamento.toLowerCase()) || 
    m.principio.toLowerCase().includes(buscarMedicamento.toLowerCase())
  );

  return (
    <div className="conteudo">
      <div className="farmacia-container">

        <div className="banner-farmacia">
          <div>
            <h1><i className="las la-prescription"></i> Farmácia Hospitalar</h1>
            <p>Controle de medicamentos, dispensação e estoque</p>
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
              <input type="text" placeholder="Buscar paciente..." value={buscarPaciente} onChange={e => setBuscarPaciente(e.target.value)} />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{width:'auto',padding:'10px',border:'1px solid #e2e8f0',borderRadius:'8px'}}>
                <option value="todos">Todos</option><option value="aguardando">Aguardando</option><option value="dispensado">Dispensado</option>
              </select>
            </div>
            <div>
              {listaPacientes.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px',color:'#94a3b8'}}>Nenhum registro</div>
              ) : (
                listaPacientes.map((s, idx) => {
                  const classe = s.status === 'Dispensado' ? 'dispensado' : (s.prioridade === 'Urgente' || s.prioridade === 'Emergência' ? 'urgente' : 'aguardando');
                  return (
                    <div className={`paciente-card ${classe}`} key={idx}>
                      <div className="paciente-info">
                        <h4><i className="las la-user"></i> {s.paciente}</h4>
                        <p><i className="las la-map-marker"></i> {s.leito || 'N/I'} | {s.data} {s.hora}</p>
                        <p><i className="las la-capsules"></i> {s.medicamento} - {s.quantidade}x | {s.via}</p>
                      </div>
                      <div className="paciente-actions">
                        <span className={`badge ${s.status === 'Dispensado' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span>
                        <span className={`badge ${s.prioridade === 'Normal' ? 'badge-info' : 'badge-danger'}`}>{s.prioridade}</span>
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
                  const baixo = m.quantidade <= m.minima;
                  return (
                    <tr key={idx}>
                      <td><strong>{m.medicamento}</strong><br/><small>{m.unidade}</small></td>
                      <td>{m.principio}</td>
                      <td>{m.lote}</td>
                      <td>{new Date(m.validade).toLocaleDateString('pt-BR')}</td>
                      <td style={{color: baixo ? '#dc2626' : '#16a34a', fontWeight: 'bold'}}>{m.quantidade}</td>
                      <td>{m.minima}</td>
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
            <thead><tr><th>Data</th><th>Medicamento</th><th>Lote</th><th>Qtd.</th><th>Fornecedor</th><th>Responsável</th></tr></thead>
            <tbody>
              {entradas.slice().reverse().slice(0, 50).map((e, idx) => (
                <tr key={idx}><td>{e.data} {e.hora}</td><td>{e.medicamento}</td><td>{e.lote}</td><td>{e.quantidade}</td><td>{e.fornecedor || '-'}</td><td>{e.responsavel}</td></tr>
              ))}
              {entradas.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',padding:'30px'}}>Nenhuma entrada</td></tr>}
            </tbody>
          </table>
        )}

        {activeTab === 'saidas' && (
          <table className="tabela-farmacia">
            <thead><tr><th>Data</th><th>Paciente</th><th>Leito</th><th>Medicamento</th><th>Qtd.</th><th>Status</th></tr></thead>
            <tbody>
              {saidas.slice().reverse().slice(0, 50).map((s, idx) => (
                <tr key={idx}><td>{s.data} {s.hora}</td><td>{s.paciente}</td><td>{s.leito || '-'}</td><td>{s.medicamento}</td><td>{s.quantidade}</td><td><span className={`badge ${s.status === 'Dispensado' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span></td></tr>
              ))}
              {saidas.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',padding:'30px'}}>Nenhuma dispensação</td></tr>}
            </tbody>
          </table>
        )}

      </div>

      {modalDispensacao && (
        <div className="modal-farmacia" style={{display:'flex'}} onClick={(e) => { if (e.target === e.currentTarget) setModalDispensacao(false); }}>
          <div className="modal-farmacia-conteudo">
            <h3><i className="las la-prescription"></i> Nova Dispensação</h3>
            <div className="form-grid">
              <div className="form-grupo"><label>Paciente *</label><select value={dispPaciente} onChange={e => setDispPaciente(e.target.value)}><option value="">Selecione...</option>{pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select></div>
              <div className="form-grupo"><label>Medicamento *</label><select value={dispMedicamento} onChange={e => setDispMedicamento(e.target.value)}><option value="">Selecione...</option>{estoque.map(m => <option key={m.medicamento} value={m.medicamento}>{m.medicamento} ({m.quantidade})</option>)}</select></div>
              <div className="form-grupo"><label>Quantidade</label><input type="number" min="1" value={dispQtd} onChange={e => setDispQtd(parseInt(e.target.value))} /></div>
              <div className="form-grupo"><label>Via</label><select value={dispVia} onChange={e => setDispVia(e.target.value)}><option>Oral</option><option>Intravenosa</option><option>Intramuscular</option><option>Subcutânea</option><option>Tópica</option></select></div>
              <div className="form-grupo"><label>Prioridade</label><select value={dispPrioridade} onChange={e => setDispPrioridade(e.target.value)}><option>Normal</option><option>Urgente</option><option>Emergência</option></select></div>
              <div className="form-grupo"><label>Leito/Setor</label><input type="text" placeholder="Ex: Leito 12" value={dispLeito} onChange={e => setDispLeito(e.target.value)} /></div>
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'20px'}}>
              <button className="btn-farmacia btn-danger" onClick={() => setModalDispensacao(false)}>Cancelar</button>
              <button className="btn-farmacia btn-success" onClick={confirmarDispensacao}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {modalEntrada && (
        <div className="modal-farmacia" style={{display:'flex'}} onClick={(e) => { if (e.target === e.currentTarget) setModalEntrada(false); }}>
          <div className="modal-farmacia-conteudo">
            <h3><i className="las la-box"></i> Entrada de Estoque</h3>
            <div className="form-grid">
              <div className="form-grupo"><label>Medicamento *</label><input type="text" placeholder="Nome" value={entMed} onChange={e => setEntMed(e.target.value)} /></div>
              <div className="form-grupo"><label>Princípio Ativo</label><input type="text" value={entPrincipio} onChange={e => setEntPrincipio(e.target.value)} /></div>
              <div className="form-grupo"><label>Lote *</label><input type="text" value={entLote} onChange={e => setEntLote(e.target.value)} /></div>
              <div className="form-grupo"><label>Validade</label><input type="date" value={entValidade} onChange={e => setEntValidade(e.target.value)} /></div>
              <div className="form-grupo"><label>Quantidade</label><input type="number" min="1" value={entQtd} onChange={e => setEntQtd(parseInt(e.target.value))} /></div>
              <div className="form-grupo"><label>Qtd. Mínima</label><input type="number" min="1" value={entMinima} onChange={e => setEntMinima(parseInt(e.target.value))} /></div>
              <div className="form-grupo"><label>Fornecedor</label><input type="text" value={entFornecedor} onChange={e => setEntFornecedor(e.target.value)} /></div>
              <div className="form-grupo"><label>Unidade</label><select value={entUnidade} onChange={e => setEntUnidade(e.target.value)}><option>Comprimido</option><option>Ampola</option><option>Frasco</option><option>Seringa</option><option>Bisnaga</option></select></div>
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'20px'}}>
              <button className="btn-farmacia btn-danger" onClick={() => setModalEntrada(false)}>Cancelar</button>
              <button className="btn-farmacia btn-success" onClick={confirmarEntrada}>Registrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
