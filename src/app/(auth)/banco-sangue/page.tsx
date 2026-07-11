'use client';
import { useState, useEffect } from 'react';
import './banco-sangue.css';

interface Bolsa {
  id: number;
  tipo: string;
  componente: string;
  numero: string;
  volume: number;
  coleta: string;
  validade: string;
  origem: string;
  sorologias: string;
  status: string;
  dataTransfusao?: string;
  pacienteTransfusao?: string;
}

interface Transfusao {
  id: number;
  paciente: string;
  tipoPaciente: string;
  bolsaId: number;
  data: string;
  medico: string;
  enfermeiro: string;
  preSV: string;
  sv15: string;
  obs: string;
  profissional: string;
}

interface LogEntrada {
  data: string;
  tipo: string;
  componente: string;
  numero: string;
  quantidade: number;
  profissional: string;
  origem?: string;
}

export default function BancoSanguePage() {
  const [hospitalId, setHospitalId] = useState('hospital_001');
  const [activeTab, setActiveTab] = useState<'estoque'|'entrada'|'transfusao'|'historico'|'compatibilidade'>('estoque');
  
  const [bolsas, setBolsas] = useState<Bolsa[]>([]);
  const [transfusoes, setTransfusoes] = useState<Transfusao[]>([]);
  const [logEntradas, setLogEntradas] = useState<LogEntrada[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);

  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [buscarEstoque, setBuscarEstoque] = useState('');
  const [buscarTransfusao, setBuscarTransfusao] = useState('');

  const [modalEntrada, setModalEntrada] = useState(false);

  // Form Entrada
  const [entTipo, setEntTipo] = useState('');
  const [entComponente, setEntComponente] = useState('Concentrado de Hemácias (CH)');
  const [entNumero, setEntNumero] = useState('');
  const [entVolume, setEntVolume] = useState(300);
  const [entColeta, setEntColeta] = useState('');
  const [entValidade, setEntValidade] = useState('');
  const [entOrigem, setEntOrigem] = useState('');
  const [entSorologias, setEntSorologias] = useState('Liberado');

  // Form Transfusao
  const [transfPaciente, setTransfPaciente] = useState('');
  const [transfTipoPaciente, setTransfTipoPaciente] = useState('A+');
  const [transfBolsa, setTransfBolsa] = useState('');
  const [transfData, setTransfData] = useState('');
  const [transfMedico, setTransfMedico] = useState('');
  const [transfEnfermeiro, setTransfEnfermeiro] = useState('');
  const [transfPreSV, setTransfPreSV] = useState('');
  const [transfSV15, setTransfSV15] = useState('');
  const [transfObs, setTransfObs] = useState('');

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      let storedBolsas = JSON.parse(localStorage.getItem(`${hid}_bsBolsas`) || '[]');
      if (storedBolsas.length === 0) {
        storedBolsas = [
          {id:1,tipo:"O-",componente:"Concentrado de Hemácias (CH)",numero:"CH-001-O-",volume:300,coleta:"2026-04-15",validade:"2026-06-15",origem:"HEMOCE",sorologias:"Liberado",status:"Disponível"},
          {id:2,tipo:"A+",componente:"Concentrado de Hemácias (CH)",numero:"CH-002-A+",volume:300,coleta:"2026-04-20",validade:"2026-06-20",origem:"HEMOCE",sorologias:"Liberado",status:"Disponível"},
          {id:3,tipo:"O+",componente:"Plasma Fresco Congelado (PFC)",numero:"PFC-001-O+",volume:250,coleta:"2026-03-01",validade:"2026-06-01",origem:"HEMOCE",sorologias:"Liberado",status:"Disponível"},
          {id:4,tipo:"O+",componente:"Concentrado de Plaquetas (CP)",numero:"CP-001-O+",volume:50,coleta:"2026-05-01",validade:"2026-05-08",origem:"Doador",sorologias:"Liberado",status:"Disponível"},
          {id:5,tipo:"AB+",componente:"Concentrado de Hemácias (CH)",numero:"CH-003-AB+",volume:300,coleta:"2026-04-10",validade:"2026-06-10",origem:"HEMOCE",sorologias:"Liberado",status:"Disponível"},
          {id:6,tipo:"B+",componente:"Concentrado de Hemácias (CH)",numero:"CH-004-B+",volume:300,coleta:"2026-04-22",validade:"2026-06-22",origem:"HEMOCE",sorologias:"Liberado",status:"Disponível"},
          {id:7,tipo:"O-",componente:"Concentrado de Hemácias (CH)",numero:"CH-005-O-",volume:300,coleta:"2026-05-02",validade:"2026-07-02",origem:"Hemonúcleo",sorologias:"Liberado",status:"Disponível"}
        ];
        localStorage.setItem(`${hid}_bsBolsas`, JSON.stringify(storedBolsas));
      }
      setBolsas(storedBolsas);

      let storedLogs = JSON.parse(localStorage.getItem(`${hid}_bsLogEntradas`) || '[]');
      if (storedLogs.length === 0) {
        storedLogs = [
          {data:new Date().toISOString(), tipo:"O-", componente:"Concentrado de Hemácias (CH)", numero:"CH-005-O-", quantidade:1, profissional:"Sistema"}
        ];
        localStorage.setItem(`${hid}_bsLogEntradas`, JSON.stringify(storedLogs));
      }
      setLogEntradas(storedLogs);
      
      setTransfusoes(JSON.parse(localStorage.getItem(`${hid}_bsTransfusoes`) || '[]'));
      setPacientes(JSON.parse(localStorage.getItem(`${hid}_pacientes`) || '[]'));
      
      setTransfData(new Date().toISOString().slice(0, 16));
    } catch(e) {}
  }, []);

  const saveBolsas = (data: Bolsa[]) => {
    setBolsas(data);
    localStorage.setItem(`${hospitalId}_bsBolsas`, JSON.stringify(data));
  };
  const saveLogs = (data: LogEntrada[]) => {
    setLogEntradas(data);
    localStorage.setItem(`${hospitalId}_bsLogEntradas`, JSON.stringify(data));
  };
  const saveTransfusoes = (data: Transfusao[]) => {
    setTransfusoes(data);
    localStorage.setItem(`${hospitalId}_bsTransfusoes`, JSON.stringify(data));
  };

  const abrirEntrada = () => {
    setEntColeta(new Date().toISOString().split('T')[0]);
    const val = new Date(); val.setDate(val.getDate()+42);
    setEntValidade(val.toISOString().split('T')[0]);
    setModalEntrada(true);
  };

  const confirmarEntrada = () => {
    if (!entTipo || !entNumero || !entColeta || !entValidade) {
      alert("⚠️ Preencha todos os campos obrigatórios (*)!");
      return;
    }
    if (bolsas.some(b => b.numero === entNumero.trim())) {
      alert("⚠️ Já existe uma bolsa com este número de identificação!");
      return;
    }

    const novaBolsa: Bolsa = {
      id: Date.now(),
      tipo: entTipo,
      componente: entComponente,
      numero: entNumero.trim(),
      volume: entVolume,
      coleta: entColeta,
      validade: entValidade,
      origem: entOrigem.trim(),
      sorologias: entSorologias,
      status: entSorologias === "Bloqueada" ? "Bloqueada" : (entSorologias === "Pendente" ? "Pendente" : "Disponível")
    };

    saveBolsas([...bolsas, novaBolsa]);

    const u = localStorage.getItem('usuarioLogado');
    const resp = (u ? JSON.parse(u) : null)?.nome || "Sistema";

    saveLogs([...logEntradas, {
      data: new Date().toISOString(),
      tipo: entTipo,
      componente: entComponente,
      numero: entNumero.trim(),
      quantidade: 1,
      profissional: resp,
      origem: entOrigem.trim()
    }]);

    setModalEntrada(false);
    setEntNumero(''); setEntOrigem('');
    alert("✅ Bolsa registrada com sucesso!");
    setActiveTab('estoque');
  };

  const confirmarTransfusao = () => {
    if (!transfPaciente || !transfBolsa || !transfData || !transfMedico) {
      alert("⚠️ Preencha paciente, bolsa, data/hora e médico!");
      return;
    }
    
    const bolsaIdNum = parseInt(transfBolsa);
    const bolsaIdx = bolsas.findIndex(b => b.id === bolsaIdNum);
    
    if (bolsaIdx < 0) {
      alert("⚠️ Bolsa não encontrada!");
      return;
    }
    if (bolsas[bolsaIdx].status !== "Disponível" && bolsas[bolsaIdx].status !== "Reservado") {
      alert("⚠️ Esta bolsa não está disponível para transfusão!");
      return;
    }

    const novasBolsas = [...bolsas];
    novasBolsas[bolsaIdx].status = "Transfundida";
    novasBolsas[bolsaIdx].dataTransfusao = transfData;
    novasBolsas[bolsaIdx].pacienteTransfusao = transfPaciente;
    saveBolsas(novasBolsas);

    const u = localStorage.getItem('usuarioLogado');
    const resp = (u ? JSON.parse(u) : null)?.nome || "Sistema";

    saveTransfusoes([...transfusoes, {
      id: Date.now(),
      paciente: transfPaciente,
      tipoPaciente: transfTipoPaciente,
      bolsaId: bolsaIdNum,
      data: transfData,
      medico: transfMedico.trim(),
      enfermeiro: transfEnfermeiro.trim(),
      preSV: transfPreSV.trim(),
      sv15: transfSV15.trim(),
      obs: transfObs.trim(),
      profissional: resp
    }]);

    setTransfMedico(''); setTransfEnfermeiro(''); setTransfPreSV(''); setTransfSV15(''); setTransfObs(''); setTransfBolsa('');
    alert("✅ Transfusão registrada com sucesso!");
    setActiveTab('historico');
  };

  const getIconeComponente = (nome: string) => {
    if(nome.includes('Hemácias')) return '🩸';
    if(nome.includes('Plasma')) return '💧';
    if(nome.includes('Plaquetas')) return '🟡';
    if(nome.includes('Crio')) return '❄️';
    return '🩸';
  };

  const getAbrevComponente = (nome: string) => {
    if(nome.includes('Hemácias')) return 'CH';
    if(nome.includes('Plasma') && nome.includes('Fresco')) return 'PFC';
    if(nome.includes('Plaquetas')) return 'CP';
    if(nome.includes('Crio')) return 'CRIO';
    if(nome.includes('Sangue Total')) return 'ST';
    return nome;
  };

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const bolsasDisponiveis = bolsas.filter(b => b.status === "Disponível" || b.status === "Reservado");
  const bolsasVencidas = bolsas.filter(b => {
    if(b.status !== "Disponível" && b.status !== "Reservado") return false;
    const val = new Date(b.validade+'T00:00:00');
    const dias = Math.floor((val.getTime() - hoje.getTime()) / (1000*60*60*24));
    return dias <= 7;
  });
  const bolsasPendentes = bolsas.filter(b => b.status === "Pendente");
  const transfMes = transfusoes.filter(t => {
    const d = new Date(t.data);
    return (d.getMonth()+1) === mesAtual && d.getFullYear() === anoAtual;
  });
  const bolsasONeg = bolsasDisponiveis.filter(b => b.tipo === "O-");

  const handleIndicadorClick = (filtro: string) => {
    setActiveTab('estoque');
    if(filtro === 'todas'){
        setFiltroStatus("todas"); setBuscarEstoque("");
    } else if(filtro === 'disponiveis'){
        setFiltroStatus("Disponível"); setBuscarEstoque("");
    } else if(filtro === 'vencidas'){
        setFiltroStatus("todas"); setBuscarEstoque("vencidas");
    } else if(filtro === 'pendentes'){
        setFiltroStatus("Pendente"); setBuscarEstoque("");
    } else if(filtro === 'Oneg'){
        setFiltroStatus("Disponível"); setBuscarEstoque("O-");
    } else if(filtro === 'transfusoes'){
        setActiveTab('historico');
    } else if(filtro === 'utilizacao'){
        setFiltroStatus("todas"); setBuscarEstoque("");
    }
  };

  let bolsasFiltradas = [...bolsas];
  if (filtroStatus !== 'todas') {
    bolsasFiltradas = bolsasFiltradas.filter(b => b.status === filtroStatus);
  }
  const termoEstoque = buscarEstoque.toLowerCase();
  if (termoEstoque === 'vencidas') {
    bolsasFiltradas = bolsasFiltradas.filter(b => {
        if(b.status !== "Disponível" && b.status !== "Reservado") return false;
        const val = new Date(b.validade+'T00:00:00');
        const dias = Math.floor((val.getTime() - hoje.getTime()) / (1000*60*60*24));
        return dias <= 7 && dias >= -30;
    });
  } else if (termoEstoque) {
    bolsasFiltradas = bolsasFiltradas.filter(b => 
      b.tipo.toLowerCase().includes(termoEstoque) || 
      b.componente.toLowerCase().includes(termoEstoque) ||
      b.numero.toLowerCase().includes(termoEstoque) ||
      b.origem.toLowerCase().includes(termoEstoque)
    );
  }

  const agrupado: Record<string, {tipo:string, componente:string, abrev:string, icone:string, bolsas: Bolsa[]}> = {};
  bolsasFiltradas.forEach(b => {
    const chave = b.tipo + "|" + b.componente;
    if(!agrupado[chave]) {
      agrupado[chave] = { tipo: b.tipo, componente: b.componente, abrev: getAbrevComponente(b.componente), icone: getIconeComponente(b.componente), bolsas: [] };
    }
    agrupado[chave].bolsas.push(b);
  });
  const grupos = Object.values(agrupado).sort((a,b) => a.tipo.localeCompare(b.tipo));

  let histFiltrado = [...transfusoes].reverse();
  if (buscarTransfusao) {
    const t = buscarTransfusao.toLowerCase();
    histFiltrado = histFiltrado.filter(tr => 
      tr.paciente.toLowerCase().includes(t) || tr.medico.toLowerCase().includes(t) ||
      (tr.bolsaId && bolsas.find(b => b.id === tr.bolsaId)?.numero?.toLowerCase().includes(t))
    );
  }

  return (
    <div className="conteudo">
      <div className="bs-container">
        
        <div className="banner-bs">
          <div>
            <h1><i className="las la-tint"></i> Banco de Sangue e Hemoterapia</h1>
            <p>Gestão completa de hemocomponentes: estoque, transfusões, compatibilidade e rastreabilidade</p>
          </div>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            <button className="btn btn-success" onClick={abrirEntrada}><i className="las la-plus-circle"></i> Entrada de Bolsa</button>
            <button className="btn btn-warning" onClick={() => setActiveTab('transfusao')}><i className="las la-syringe"></i> Registrar Transfusão</button>
          </div>
        </div>

        <div className="indicadores-grid">
          <div className="ind-card alerta" onClick={() => handleIndicadorClick('todas')} title="Ver todas as bolsas">
            <div className="card-icon-wrap red"><i className="las la-tint"></i></div>
            <div className="card-info"><div className="ind-valor">{bolsas.length}</div><div className="ind-label">Total de Bolsas</div></div>
          </div>
          <div className="ind-card bom" onClick={() => handleIndicadorClick('disponiveis')} title="Ver disponíveis">
            <div className="card-icon-wrap green"><i className="las la-check-circle"></i></div>
            <div className="card-info"><div className="ind-valor">{bolsasDisponiveis.length}</div><div className="ind-label">Disponíveis</div></div>
          </div>
          <div className="ind-card critico" onClick={() => handleIndicadorClick('vencidas')} title="Ver próximas do vencimento">
            <div className="card-icon-wrap red"><i className="las la-exclamation-triangle"></i></div>
            <div className="card-info"><div className="ind-valor">{bolsasVencidas.length}</div><div className="ind-label">⚠️ Vence em 7 dias</div></div>
          </div>
          <div className="ind-card" onClick={() => handleIndicadorClick('transfusoes')} title="Transfusões do mês">
            <div className="card-icon-wrap blue"><i className="las la-syringe"></i></div>
            <div className="card-info"><div className="ind-valor">{transfMes.length}</div><div className="ind-label">Transfusões (Mês)</div></div>
          </div>
          <div className="ind-card critico" onClick={() => handleIndicadorClick('Oneg')} title="Ver O- disponível">
            <div className="card-icon-wrap red"><i className="las la-tint"></i></div>
            <div className="card-info"><div className="ind-valor">{bolsasONeg.length}</div><div className="ind-label">O- (Emergência)</div></div>
          </div>
          <div className="ind-card" onClick={() => handleIndicadorClick('pendentes')} title="Ver bolsas pendentes">
            <div className="card-icon-wrap orange"><i className="las la-clock"></i></div>
            <div className="card-info"><div className="ind-valor">{bolsasPendentes.length}</div><div className="ind-label">⏳ Pendentes</div></div>
          </div>
        </div>

        <div className="tabs-bs">
          <button className={`tab-btn ${activeTab === 'estoque' ? 'ativo' : ''}`} onClick={() => setActiveTab('estoque')}><i className="las la-boxes"></i> Estoque por Componente</button>
          <button className={`tab-btn ${activeTab === 'entrada' ? 'ativo' : ''}`} onClick={() => setActiveTab('entrada')}><i className="las la-plus-circle"></i> Entrada + Log</button>
          <button className={`tab-btn ${activeTab === 'transfusao' ? 'ativo' : ''}`} onClick={() => setActiveTab('transfusao')}><i className="las la-syringe"></i> Transfusão</button>
          <button className={`tab-btn ${activeTab === 'historico' ? 'ativo' : ''}`} onClick={() => setActiveTab('historico')}><i className="las la-history"></i> Histórico</button>
          <button className={`tab-btn ${activeTab === 'compatibilidade' ? 'ativo' : ''}`} onClick={() => setActiveTab('compatibilidade')}><i className="las la-project-diagram"></i> Compatibilidade</button>
        </div>

        {activeTab === 'estoque' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Filtrar por tipo sanguíneo ou componente..." value={buscarEstoque} onChange={e => setBuscarEstoque(e.target.value)} />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{minWidth:'180px'}}>
                <option value="todas">Todas as bolsas</option>
                <option value="Disponível">Disponíveis</option>
                <option value="Transfundida">Transfundidas</option>
                <option value="Bloqueada">Bloqueadas</option>
                <option value="Pendente">Pendentes</option>
              </select>
            </div>
            
            <div className="estoque-grid">
              {grupos.length === 0 ? (
                <div style={{textAlign:'center', padding:'50px', color:'#94a3b8', gridColumn:'1/-1'}}>
                  <i className="las la-box-open" style={{fontSize:'64px', opacity:0.3}}></i>
                  <p style={{fontSize:'15px', marginTop:'10px'}}>Nenhuma bolsa encontrada</p>
                </div>
              ) : (
                grupos.map((g, idx) => {
                  const qtd = g.bolsas.length;
                  const classe = qtd <= 2 ? 'critico' : (qtd <= 5 ? 'baixo' : 'ok');
                  return (
                    <div key={idx} className={`estoque-card ${classe}`} onClick={() => { setFiltroStatus("todas"); setBuscarEstoque(g.tipo); }}>
                      <div className="estoque-icone">{g.icone}</div>
                      <div className="estoque-tipo">{g.tipo}</div>
                      <div className="estoque-componente">{g.abrev} — {g.componente}</div>
                      <div className="estoque-quantidade">{qtd}</div>
                      <div className="estoque-detalhes">
                        <span><i className="las la-eye"></i> Ver bolsas</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'entrada' && (
          <div>
            <div className="form-panel">
              <h3><i className="las la-plus-circle"></i> Registrar Entrada de Bolsa Rápida</h3>
              <div className="form-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
                <div className="form-grupo"><label>Tipo *</label><select value={entTipo} onChange={e => setEntTipo(e.target.value)}><option value="">Selecione...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
                <div className="form-grupo"><label>Componente *</label><select value={entComponente} onChange={e => setEntComponente(e.target.value)}><option>Concentrado de Hemácias (CH)</option><option>Plasma Fresco Congelado (PFC)</option><option>Concentrado de Plaquetas (CP)</option><option>Crioprecipitado</option><option>Sangue Total</option></select></div>
                <div className="form-grupo"><label>Nº Bolsa *</label><input type="text" value={entNumero} onChange={e => setEntNumero(e.target.value)} /></div>
                <div className="form-grupo"><label>Validade *</label><input type="date" value={entValidade} onChange={e => setEntValidade(e.target.value)} /></div>
                <div className="form-grupo"><label>Origem</label><input type="text" value={entOrigem} onChange={e => setEntOrigem(e.target.value)} /></div>
              </div>
              <button className="btn btn-danger" onClick={confirmarEntrada} style={{width:'100%', marginTop:'20px', justifyContent:'center'}}><i className="las la-save"></i> Registrar no Estoque</button>
            </div>
            
            <div className="entrada-log">
              <h3><i className="las la-history"></i> Últimas Entradas</h3>
              {logEntradas.length === 0 ? (
                <div style={{color:'#94a3b8', textAlign:'center', padding:'20px'}}>Nenhuma entrada</div>
              ) : (
                logEntradas.slice().reverse().slice(0,20).map((e, idx) => (
                  <div className="entrada-item" key={idx}>
                    <div className="entrada-data"><i className="las la-calendar"></i> {new Date(e.data).toLocaleString('pt-BR')}</div>
                    <div className="entrada-info">
                      <strong>{getIconeComponente(e.componente)} {e.tipo} — {getAbrevComponente(e.componente)}</strong>
                      <small>Bolsa: {e.numero} | Origem: {e.origem || 'N/I'} | Prof: {e.profissional}</small>
                    </div>
                    <span className="badge badge-success">+{e.quantidade}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'transfusao' && (
          <div className="form-panel">
            <h3><i className="las la-syringe"></i> Registrar Transfusão</h3>
            <div className="form-grid">
              <div className="form-grupo"><label>Paciente *</label><select value={transfPaciente} onChange={e => setTransfPaciente(e.target.value)}><option value="">Selecione...</option>{pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select></div>
              <div className="form-grupo"><label>Tipagem do Paciente</label><select value={transfTipoPaciente} onChange={e => setTransfTipoPaciente(e.target.value)}><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
              <div className="form-grupo"><label>Bolsa *</label><select value={transfBolsa} onChange={e => setTransfBolsa(e.target.value)}><option value="">Selecione a bolsa...</option>{bolsasDisponiveis.map(b => <option key={b.id} value={b.id}>{getIconeComponente(b.componente)} {b.numero} | {b.tipo} | {getAbrevComponente(b.componente)} | {b.status}</option>)}</select></div>
              <div className="form-grupo"><label>Data/Hora *</label><input type="datetime-local" value={transfData} onChange={e => setTransfData(e.target.value)} /></div>
              <div className="form-grupo"><label>Médico *</label><input type="text" placeholder="Nome e CRM" value={transfMedico} onChange={e => setTransfMedico(e.target.value)} /></div>
              <div className="form-grupo"><label>Enfermeiro</label><input type="text" placeholder="Nome e COREN" value={transfEnfermeiro} onChange={e => setTransfEnfermeiro(e.target.value)} /></div>
              <div className="form-grupo full"><label>Intercorrências (Opcional)</label><textarea rows={2} value={transfObs} onChange={e => setTransfObs(e.target.value)}></textarea></div>
            </div>
            <button className="btn btn-warning" onClick={confirmarTransfusao} style={{width:'100%', marginTop:'20px', justifyContent:'center'}}><i className="las la-save"></i> Confirmar Transfusão</button>
          </div>
        )}

        {activeTab === 'historico' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por paciente, bolsa ou médico..." value={buscarTransfusao} onChange={e => setBuscarTransfusao(e.target.value)} />
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="tabela-bs">
                <thead><tr><th>Data/Hora</th><th>Paciente</th><th>Bolsa</th><th>Componente</th><th>Tipo</th><th>Médico</th><th>Intercorrência</th></tr></thead>
                <tbody>
                  {histFiltrado.length === 0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}><i className="las la-history" style={{fontSize:'48px',opacity:0.3}}></i><p>Nenhuma transfusão</p></td></tr>
                  ) : (
                    histFiltrado.map(t => {
                      const bolsa = bolsas.find(b => b.id === t.bolsaId);
                      return (
                        <tr key={t.id}>
                          <td><strong>{new Date(t.data).toLocaleString('pt-BR')}</strong></td>
                          <td>{t.paciente} <small style={{color:'#94a3b8'}}>({t.tipoPaciente})</small></td>
                          <td>{bolsa ? getIconeComponente(bolsa.componente) : '🩸'} {bolsa ? bolsa.numero : 'N/I'}</td>
                          <td>{bolsa ? bolsa.componente : 'N/I'}</td>
                          <td><span className="badge badge-info">{bolsa ? bolsa.tipo : 'N/I'}</span></td>
                          <td>{t.medico}</td>
                          <td>{t.obs ? <span className="badge badge-warning">Sim</span> : <span className="badge badge-success">Não</span>}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'compatibilidade' && (
          <div className="form-panel">
            <h3><i className="las la-project-diagram"></i> Tabela de Compatibilidade Sanguínea</h3>
            <div className="compat-grid">
              <div className="compat-item"><div className="compat-sangue">A+</div><div className="compat-doacao">Recebe: A+, A-, O+, O-<br/>Doa: A+, AB+</div></div>
              <div className="compat-item"><div className="compat-sangue">A-</div><div className="compat-doacao">Recebe: A-, O-<br/>Doa: A+, A-, AB+, AB-</div></div>
              <div className="compat-item"><div className="compat-sangue">B+</div><div className="compat-doacao">Recebe: B+, B-, O+, O-<br/>Doa: B+, AB+</div></div>
              <div className="compat-item"><div className="compat-sangue">B-</div><div className="compat-doacao">Recebe: B-, O-<br/>Doa: B+, B-, AB+, AB-</div></div>
              <div className="compat-item"><div className="compat-sangue">AB+</div><div className="compat-doacao">Recebe: TODOS (Universal)<br/>Doa: AB+</div></div>
              <div className="compat-item"><div className="compat-sangue">AB-</div><div className="compat-doacao">Recebe: A-, B-, AB-, O-<br/>Doa: AB+, AB-</div></div>
              <div className="compat-item"><div className="compat-sangue">O+</div><div className="compat-doacao">Recebe: O+, O-<br/>Doa: A+, B+, AB+, O+</div></div>
              <div className="compat-item"><div className="compat-sangue">O-</div><div className="compat-doacao">Recebe: O-<br/>Doa: TODOS (Doador Universal)</div></div>
            </div>
            <div style={{background:'#fef2f2', borderRadius:'14px', padding:'18px', marginTop:'20px', textAlign:'center', border:'2px solid #fecaca'}}>
              <strong style={{color:'#dc2626'}}>⚠️ EMERGÊNCIA:</strong> Tipagem desconhecida → <strong>O NEGATIVO</strong> (mulheres férteis) | <strong>O POSITIVO</strong> (homens e mulheres sem potencial reprodutivo)
            </div>
          </div>
        )}
      </div>

      {modalEntrada && (
        <div className="bs-modal" onClick={e => { if (e.target === e.currentTarget) setModalEntrada(false); }}>
          <div className="bs-modal-conteudo">
            <h3 style={{color:'#0a1f44', marginBottom:'20px', borderBottom:'2px solid #f1f5f9', paddingBottom:'10px'}}><i className="las la-arrow-down"></i> Registrar Entrada de Bolsa</h3>
            <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
              <div className="form-grupo"><label>Tipo *</label><select value={entTipo} onChange={e => setEntTipo(e.target.value)}><option value="">Selecione...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
              <div className="form-grupo"><label>Nº Bolsa *</label><input type="text" value={entNumero} onChange={e => setEntNumero(e.target.value)} /></div>
              <div className="form-grupo full"><label>Componente *</label><select value={entComponente} onChange={e => setEntComponente(e.target.value)}><option>Concentrado de Hemácias (CH)</option><option>Plasma Fresco Congelado (PFC)</option><option>Concentrado de Plaquetas (CP)</option><option>Crioprecipitado</option><option>Sangue Total</option></select></div>
              <div className="form-grupo"><label>Data Coleta *</label><input type="date" value={entColeta} onChange={e => setEntColeta(e.target.value)} /></div>
              <div className="form-grupo"><label>Validade *</label><input type="date" value={entValidade} onChange={e => setEntValidade(e.target.value)} /></div>
              <div className="form-grupo full"><label>Origem</label><input type="text" value={entOrigem} onChange={e => setEntOrigem(e.target.value)} /></div>
              <div className="form-grupo full"><label>Sorologias</label><select value={entSorologias} onChange={e => setEntSorologias(e.target.value)}><option value="Liberado">✅ Todas Negativas (Liberado)</option><option value="Pendente">⏳ Pendente de Resultado</option><option value="Bloqueada">🚫 Positivo - BLOQUEADA</option></select></div>
            </div>
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
              <button className="btn btn-danger" style={{background:'#f1f5f9', color:'#334155'}} onClick={() => setModalEntrada(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmarEntrada}>Registrar Bolsa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
