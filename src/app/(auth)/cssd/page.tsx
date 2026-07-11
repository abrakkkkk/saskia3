'use client';
import { useState, useEffect } from 'react';
import './cssd.css';

interface Lote {
  id: number;
  numero: string;
  setor: string;
  operador: string;
  data: string;
  equipamento: string;
  ciclo: string;
  indicadorQuimico: string;
  indicadorBiologico: string;
  bowieDick: string;
  obs: string;
  status: string;
  dataCriacao: string;
}

interface Item {
  id: number;
  loteId: number;
  nome: string;
  tipo: string;
  quantidade: number;
  embalagem: string;
  integridade: string;
}

export default function CSSDPage() {
  const [hospitalId, setHospitalId] = useState('hospital_001');
  const [activeTab, setActiveTab] = useState<'lotes'|'novo'|'itens'|'historico'>('lotes');
  
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [itens, setItens] = useState<Item[]>([]);

  // Filtros
  const [buscarLote, setBuscarLote] = useState('');
  const [filtroStatusLote, setFiltroStatusLote] = useState('todos');

  // Form Novo Lote
  const [loteNumero, setLoteNumero] = useState('');
  const [loteSetor, setLoteSetor] = useState('');
  const [loteOperador, setLoteOperador] = useState('');
  const [loteData, setLoteData] = useState('');
  const [loteEquipamento, setLoteEquipamento] = useState('Autoclave 01');
  const [loteCiclo, setLoteCiclo] = useState('134°C - 7 min (Padrão)');
  const [loteIndicadorQuimico, setLoteIndicadorQuimico] = useState('Virado (OK)');
  const [loteIndicadorBiologico, setLoteIndicadorBiologico] = useState('Negativo (OK)');
  const [loteBowieDick, setLoteBowieDick] = useState('Aprovado');
  const [loteObs, setLoteObs] = useState('');

  // Form Itens
  const [itemLote, setItemLote] = useState('');
  const [itemNome, setItemNome] = useState('');
  const [itemTipo, setItemTipo] = useState('Instrumental Cirúrgico');
  const [itemQuantidade, setItemQuantidade] = useState(1);
  const [itemEmbalagem, setItemEmbalagem] = useState('Grau Cirúrgico (SMS)');
  const [itemIntegridade, setItemIntegridade] = useState('Íntegra');

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      let storedLotes = JSON.parse(localStorage.getItem(`${hid}_cssdLotes`) || '[]');
      let storedItens = JSON.parse(localStorage.getItem(`${hid}_cssdItens`) || '[]');

      if (storedLotes.length === 0) {
        storedLotes = [
          {id:1,numero:"CSSD-2026-001",setor:"Centro Cirúrgico",operador:"Maria Silva",data:"2026-05-03",equipamento:"Autoclave 01",ciclo:"134°C - 7 min (Padrão)",indicadorQuimico:"Virado (OK)",indicadorBiologico:"Negativo (OK)",bowieDick:"Aprovado",status:"Pronto",dataCriacao:"2026-05-03T08:00:00"},
          {id:2,numero:"CSSD-2026-002",setor:"UTI",operador:"João Santos",data:"2026-05-04",equipamento:"Autoclave 02",ciclo:"134°C - 7 min (Padrão)",indicadorQuimico:"Virado (OK)",indicadorBiologico:"Aguardando",bowieDick:"Aprovado",status:"Esterilização",dataCriacao:"2026-05-04T10:00:00"},
          {id:3,numero:"CSSD-2026-003",setor:"Emergência",operador:"Ana Costa",data:"2026-05-04",equipamento:"Autoclave 01",ciclo:"121°C - 15 min",indicadorQuimico:"Não Aplicável",indicadorBiologico:"Não Aplicável",bowieDick:"Não Realizado",status:"Recepção",dataCriacao:"2026-05-04T14:00:00"}
        ];
        localStorage.setItem(`${hid}_cssdLotes`, JSON.stringify(storedLotes));
        
        storedItens = [
          {id:1,loteId:1,nome:"Pinça Kelly Curva",tipo:"Pinça",quantidade:5,embalagem:"Grau Cirúrgico (SMS)",integridade:"Íntegra"},
          {id:2,loteId:1,nome:"Tesoura Mayo",tipo:"Tesoura",quantidade:3,embalagem:"Grau Cirúrgico (SMS)",integridade:"Íntegra"},
          {id:3,loteId:1,nome:"Cabo de Bisturi nº 3",tipo:"Cabo de Bisturi",quantidade:2,embalagem:"Grau Cirúrgico (SMS)",integridade:"Íntegra"},
          {id:4,loteId:2,nome:"Pinça Anatômica",tipo:"Pinça",quantidade:4,embalagem:"Contêiner Rígido",integridade:"Íntegra"}
        ];
        localStorage.setItem(`${hid}_cssdItens`, JSON.stringify(storedItens));
      }

      setLotes(storedLotes);
      setItens(storedItens);

      const today = new Date().toISOString().split('T')[0];
      setLoteData(today);
      setLoteNumero(`CSSD-${new Date().getFullYear()}-${String(storedLotes.length + 1).padStart(3,'0')}`);
    } catch(e) {}
  }, []);

  const saveLotes = (data: Lote[]) => {
    setLotes(data);
    localStorage.setItem(`${hospitalId}_cssdLotes`, JSON.stringify(data));
  };
  const saveItens = (data: Item[]) => {
    setItens(data);
    localStorage.setItem(`${hospitalId}_cssdItens`, JSON.stringify(data));
  };

  const criarLote = () => {
    if(!loteNumero || !loteSetor || !loteOperador){
      alert("⚠️ Preencha lote, setor e operador!");
      return;
    }
    const novoLote: Lote = {
      id: Date.now(),
      numero: loteNumero.trim(),
      setor: loteSetor,
      operador: loteOperador.trim(),
      data: loteData,
      equipamento: loteEquipamento,
      ciclo: loteCiclo,
      indicadorQuimico: loteIndicadorQuimico,
      indicadorBiologico: loteIndicadorBiologico,
      bowieDick: loteBowieDick,
      obs: loteObs.trim(),
      status: "Recepção",
      dataCriacao: new Date().toISOString()
    };
    
    const novosLotes = [...lotes, novoLote];
    saveLotes(novosLotes);
    
    setLoteNumero(`CSSD-${new Date().getFullYear()}-${String(novosLotes.length + 1).padStart(3,'0')}`);
    setLoteOperador('');
    setLoteObs('');
    alert("✅ Lote criado com sucesso!");
    setActiveTab('lotes');
  };

  const avancarStatus = (id: number) => {
    const lIdx = lotes.findIndex(lo => lo.id === id);
    if(lIdx < 0) return;
    const l = lotes[lIdx];
    
    const fluxo = ["Recepção", "Limpeza", "Preparo", "Esterilização", "Pronto"];
    const idx = fluxo.indexOf(l.status);
    if(idx < fluxo.length - 1) {
      const novosLotes = [...lotes];
      novosLotes[lIdx].status = fluxo[idx+1];
      saveLotes(novosLotes);
    } else {
      alert("Lote já está no status final!");
    }
  };

  const rejeitarLote = (id: number) => {
    const lIdx = lotes.findIndex(lo => lo.id === id);
    if(lIdx < 0) return;
    if(confirm(`Rejeitar lote ${lotes[lIdx].numero}?`)){
      const novosLotes = [...lotes];
      novosLotes[lIdx].status = "Rejeitado";
      saveLotes(novosLotes);
    }
  };

  const adicionarItem = () => {
    if(!itemLote || !itemNome){
      alert("⚠️ Selecione o lote e digite o nome do material!");
      return;
    }
    const novoItem: Item = {
      id: Date.now(),
      loteId: parseInt(itemLote),
      nome: itemNome.trim(),
      tipo: itemTipo,
      quantidade: itemQuantidade,
      embalagem: itemEmbalagem,
      integridade: itemIntegridade
    };
    saveItens([...itens, novoItem]);
    setItemNome('');
    setItemQuantidade(1);
    alert("✅ Item adicionado ao lote!");
    setActiveTab('lotes');
  };

  // Filtros
  let lotesFiltrados = [...lotes].reverse();
  if (filtroStatusLote !== 'todos') {
    lotesFiltrados = lotesFiltrados.filter(l => l.status === filtroStatusLote);
  }
  if (buscarLote) {
    const termo = buscarLote.toLowerCase();
    lotesFiltrados = lotesFiltrados.filter(l => l.numero.toLowerCase().includes(termo) || l.setor.toLowerCase().includes(termo) || l.operador.toLowerCase().includes(termo));
  }

  const lotesAtivos = lotes.filter(l => l.status !== "Pronto" && l.status !== "Rejeitado");

  // Indicadores
  const hoje = new Date().toISOString().split('T')[0];
  const qtdRecepcao = lotes.filter(l => l.status === "Recepção").length;
  const qtdLimpeza = lotes.filter(l => l.status === "Limpeza").length;
  const qtdPreparo = lotes.filter(l => l.status === "Preparo").length;
  const qtdEsterilizacao = lotes.filter(l => l.status === "Esterilização").length;
  const qtdPronto = lotes.filter(l => l.status === "Pronto").length;

  const indEmProcesso = lotes.filter(l => l.status !== "Pronto" && l.status !== "Rejeitado").length;
  const indEsterilizados = lotes.filter(l => l.status === "Pronto" && l.data === hoje).length;
  const indFalhas = lotes.filter(l => l.status === "Rejeitado").length;
  const indItens = itens.reduce((acc, i) => acc + i.quantidade, 0);

  const getStatusClasse = (status: string) => {
    switch(status) {
      case "Recepção": return "badge-sujo";
      case "Limpeza": return "badge-warning";
      case "Preparo": return "badge-info";
      case "Esterilização": return "badge-processo";
      case "Pronto": return "badge-esteril";
      case "Rejeitado": return "badge-danger";
      default: return "badge-gray";
    }
  };

  const getLoteBorderClasse = (status: string) => {
    switch(status) {
      case "Recepção": return "sujo";
      case "Limpeza": return "processando";
      case "Preparo": return "processando";
      case "Esterilização": return "processando";
      case "Pronto": return "esteril";
      case "Rejeitado": return "sujo";
      default: return "processando";
    }
  };

  return (
    <div className="conteudo">
      <div className="cssd-container">

        <div className="banner-cssd">
          <div>
            <h1><i className="las la-pump-soap"></i> CSSD - Central de Esterilização</h1>
            <p>Rastreabilidade de materiais, controle de lotes e monitoramento do processo de esterilização</p>
          </div>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            <button className="btn btn-success" onClick={() => setActiveTab('novo')}><i className="las la-plus-circle"></i> Novo Lote</button>
          </div>
        </div>

        <div className="indicadores-grid">
          <div className="ind-card"><div className="ind-icon" style={{color:'#1e3a8a'}}><i className="las la-boxes"></i></div><div className="ind-valor">{lotes.length}</div><div className="ind-label">Lotes Processados</div></div>
          <div className="ind-card"><div className="ind-icon" style={{color:'#f59e0b'}}><i className="las la-clock"></i></div><div className="ind-valor">{indEmProcesso}</div><div className="ind-label">Em Processamento</div></div>
          <div className="ind-card"><div className="ind-icon" style={{color:'#16a34a'}}><i className="las la-check-circle"></i></div><div className="ind-valor">{indEsterilizados}</div><div className="ind-label">Esterilizados Hoje</div></div>
          <div className="ind-card"><div className="ind-icon" style={{color:'#dc2626'}}><i className="las la-exclamation-triangle"></i></div><div className="ind-valor">{indFalhas}</div><div className="ind-label">Falhas / Rejeitados</div></div>
          <div className="ind-card"><div className="ind-icon" style={{color:'#7c3aed'}}><i className="las la-tools"></i></div><div className="ind-valor">{indItens}</div><div className="ind-label">Total de Itens</div></div>
        </div>

        <div className="fluxo-grid">
          <div className={`fluxo-card ${qtdRecepcao > 0 ? 'ativo' : ''}`}><div className="fluxo-numero">{qtdRecepcao}</div><div className="fluxo-nome">1. Recepção</div><div className="fluxo-qtd">Materiais Sujos</div></div>
          <div className={`fluxo-card ${qtdLimpeza > 0 ? 'ativo' : ''}`}><div className="fluxo-numero">{qtdLimpeza}</div><div className="fluxo-nome">2. Limpeza</div><div className="fluxo-qtd">Em Lavagem</div></div>
          <div className={`fluxo-card ${qtdPreparo > 0 ? 'ativo' : ''}`}><div className="fluxo-numero">{qtdPreparo}</div><div className="fluxo-nome">3. Preparo</div><div className="fluxo-qtd">Embalagem</div></div>
          <div className={`fluxo-card ${qtdEsterilizacao > 0 ? 'ativo' : ''}`}><div className="fluxo-numero">{qtdEsterilizacao}</div><div className="fluxo-nome">4. Esterilização</div><div className="fluxo-qtd">Autoclave</div></div>
          <div className={`fluxo-card ${qtdPronto > 0 ? 'concluido' : ''}`}><div className="fluxo-numero">{qtdPronto}</div><div className="fluxo-nome">5. Pronto</div><div className="fluxo-qtd">Disponível</div></div>
        </div>

        <div className="tabs-cssd">
          <button className={`tab-btn ${activeTab === 'lotes' ? 'ativo' : ''}`} onClick={() => setActiveTab('lotes')}><i className="las la-boxes"></i> Lotes</button>
          <button className={`tab-btn ${activeTab === 'novo' ? 'ativo' : ''}`} onClick={() => setActiveTab('novo')}><i className="las la-plus-circle"></i> Novo Lote</button>
          <button className={`tab-btn ${activeTab === 'itens' ? 'ativo' : ''}`} onClick={() => setActiveTab('itens')}><i className="las la-tools"></i> Itens</button>
          <button className={`tab-btn ${activeTab === 'historico' ? 'ativo' : ''}`} onClick={() => setActiveTab('historico')}><i className="las la-history"></i> Histórico</button>
        </div>

        {activeTab === 'lotes' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por nº lote, setor ou operador..." value={buscarLote} onChange={e => setBuscarLote(e.target.value)} />
              <select value={filtroStatusLote} onChange={e => setFiltroStatusLote(e.target.value)}>
                <option value="todos">Todos os Status</option>
                <option value="Recepção">Recepção</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Preparo">Preparo</option>
                <option value="Esterilização">Esterilização</option>
                <option value="Pronto">Pronto (Esterilizado)</option>
                <option value="Rejeitado">Rejeitado</option>
              </select>
            </div>
            <div className="lotes-grid">
              {lotesFiltrados.length === 0 ? (
                <p style={{textAlign:'center', color:'#94a3b8', padding:'30px', gridColumn:'1/-1'}}>Nenhum lote encontrado</p>
              ) : (
                lotesFiltrados.map(l => {
                  const itensLote = itens.filter(i => i.loteId === l.id);
                  return (
                    <div key={l.id} className={`lote-card ${getLoteBorderClasse(l.status)}`}>
                      <div className="lote-header">
                        <span className="lote-numero">📦 {l.numero}</span>
                        <span className={`badge ${getStatusClasse(l.status)}`}>{l.status}</span>
                      </div>
                      <p className="lote-info"><i className="las la-door-open"></i> Setor: {l.setor}</p>
                      <p className="lote-info"><i className="las la-user"></i> Operador: {l.operador}</p>
                      <p className="lote-info"><i className="las la-calendar"></i> Data: {new Date(l.data).toLocaleDateString('pt-BR')}</p>
                      <p className="lote-info"><i className="las la-cog"></i> {l.equipamento} | {l.ciclo}</p>
                      <p className="lote-info"><i className="las la-tools"></i> <strong>{itensLote.length} itens</strong></p>
                      <div className="lote-acoes">
                        {l.status !== 'Pronto' && l.status !== 'Rejeitado' && (
                          <button className="btn btn-xs btn-primary" onClick={() => avancarStatus(l.id)}><i className="las la-arrow-right"></i> Avançar</button>
                        )}
                        {l.status === 'Pronto' && (
                          <button className="btn btn-xs btn-success" onClick={() => alert(`Lote ${l.numero} liberado!`)}><i className="las la-check"></i> Liberar</button>
                        )}
                        {l.status !== 'Pronto' && l.status !== 'Rejeitado' && (
                          <button className="btn btn-xs btn-danger" onClick={() => rejeitarLote(l.id)}><i className="las la-times"></i> Rejeitar</button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'novo' && (
          <div className="form-panel">
            <h3><i className="las la-plus-circle"></i> Criar Novo Lote de Esterilização</h3>
            <div className="form-grid">
              <div className="form-grupo"><label>Nº do Lote *</label><input type="text" value={loteNumero} onChange={e => setLoteNumero(e.target.value)} placeholder="Ex: CSSD-2026-001" /></div>
              <div className="form-grupo"><label>Setor de Origem *</label><select value={loteSetor} onChange={e => setLoteSetor(e.target.value)}><option value="">Selecione...</option><option>Centro Cirúrgico</option><option>UTI</option><option>Emergência</option><option>Enfermaria</option><option>Ambulatório</option><option>Hemodinâmica</option></select></div>
              <div className="form-grupo"><label>Operador *</label><input type="text" value={loteOperador} onChange={e => setLoteOperador(e.target.value)} placeholder="Nome do operador" /></div>
              <div className="form-grupo"><label>Data de Criação</label><input type="date" value={loteData} onChange={e => setLoteData(e.target.value)} /></div>
              <div className="form-grupo"><label>Equipamento (Autoclave)</label><select value={loteEquipamento} onChange={e => setLoteEquipamento(e.target.value)}><option>Autoclave 01</option><option>Autoclave 02</option><option>Autoclave 03</option><option>Termodesinfectora</option><option>Óxido de Etileno</option></select></div>
              <div className="form-grupo"><label>Ciclo</label><select value={loteCiclo} onChange={e => setLoteCiclo(e.target.value)}><option>134°C - 7 min (Padrão)</option><option>121°C - 15 min</option><option>134°C - 18 min (Príons)</option><option>Baixa Temperatura</option></select></div>
              <div className="form-grupo"><label>Indicador Químico (Classe 5)</label><select value={loteIndicadorQuimico} onChange={e => setLoteIndicadorQuimico(e.target.value)}><option>Virado (OK)</option><option>Não Virado (Falha)</option><option>Não Aplicável</option></select></div>
              <div className="form-grupo"><label>Indicador Biológico</label><select value={loteIndicadorBiologico} onChange={e => setLoteIndicadorBiologico(e.target.value)}><option>Negativo (OK)</option><option>Positivo (Falha)</option><option>Aguardando</option><option>Não Aplicável</option></select></div>
              <div className="form-grupo"><label>Teste Bowie-Dick</label><select value={loteBowieDick} onChange={e => setLoteBowieDick(e.target.value)}><option>Aprovado</option><option>Reprovado</option><option>Não Realizado</option></select></div>
              <div className="form-grupo full"><label>Observações</label><textarea rows={2} value={loteObs} onChange={e => setLoteObs(e.target.value)}></textarea></div>
            </div>
            <button className="btn btn-primary" onClick={criarLote} style={{width:'100%', marginTop:'15px', justifyContent:'center'}}><i className="las la-save"></i> Criar Lote</button>
          </div>
        )}

        {activeTab === 'itens' && (
          <div className="form-panel">
            <h3><i className="las la-tools"></i> Adicionar Itens ao Lote</h3>
            <div className="form-grid">
              <div className="form-grupo"><label>Lote *</label><select value={itemLote} onChange={e => setItemLote(e.target.value)}><option value="">Selecione o lote...</option>{lotesAtivos.map(l => <option key={l.id} value={l.id}>{l.numero} - {l.setor} ({l.status})</option>)}</select></div>
              <div className="form-grupo"><label>Nome do Material *</label><input type="text" value={itemNome} onChange={e => setItemNome(e.target.value)} placeholder="Nome do instrumento" /></div>
              <div className="form-grupo"><label>Tipo</label><select value={itemTipo} onChange={e => setItemTipo(e.target.value)}><option>Instrumental Cirúrgico</option><option>Pinça</option><option>Tesoura</option><option>Afastador</option><option>Cabo de Bisturi</option><option>Campo Cirúrgico</option><option>Bandeja</option><option>Cuba</option><option>Outro</option></select></div>
              <div className="form-grupo"><label>Quantidade</label><input type="number" min="1" value={itemQuantidade} onChange={e => setItemQuantidade(parseInt(e.target.value))} /></div>
              <div className="form-grupo"><label>Embalagem</label><select value={itemEmbalagem} onChange={e => setItemEmbalagem(e.target.value)}><option>Grau Cirúrgico (SMS)</option><option>Papel Crepe</option><option>Contêiner Rígido</option><option>Tyvek</option></select></div>
              <div className="form-grupo"><label>Integridade da Embalagem</label><select value={itemIntegridade} onChange={e => setItemIntegridade(e.target.value)}><option>Íntegra</option><option>Danificada</option></select></div>
            </div>
            <button className="btn btn-success" onClick={adicionarItem} style={{width:'100%', marginTop:'15px', justifyContent:'center'}}><i className="las la-plus-circle"></i> Adicionar Item</button>
          </div>
        )}

        {activeTab === 'historico' && (
          <div style={{background:'white', borderRadius:'20px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)', overflowX:'auto'}}>
            <table className="tabela-cssd">
              <thead><tr><th>Lote</th><th>Setor</th><th>Status</th><th>Data</th><th>Operador</th><th>Equipamento</th><th>Ind. Biológico</th><th>Ind. Químico</th><th>Bowie-Dick</th></tr></thead>
              <tbody>
                {lotes.length === 0 ? (
                  <tr><td colSpan={9} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum lote registrado</td></tr>
                ) : (
                  lotes.slice().reverse().map(l => (
                    <tr key={l.id}>
                      <td><strong>{l.numero}</strong></td>
                      <td>{l.setor}</td>
                      <td><span className={`badge ${l.status==='Pronto'?'badge-success':l.status==='Rejeitado'?'badge-danger':'badge-warning'}`}>{l.status}</span></td>
                      <td>{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                      <td>{l.operador}</td>
                      <td>{l.equipamento}</td>
                      <td>{l.indicadorBiologico}</td>
                      <td>{l.indicadorQuimico}</td>
                      <td><span className={`badge ${l.bowieDick==='Aprovado'?'badge-success':l.bowieDick==='Reprovado'?'badge-danger':'badge-warning'}`}>{l.bowieDick}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
