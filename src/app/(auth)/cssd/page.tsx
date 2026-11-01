'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './cssd.css';

export default function CSSDPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'lotes'|'novo'|'itens'|'historico'>('lotes');
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');

  const [lotes, setLotes] = useState<any[]>([]);

  // Filtros
  const [buscarLote, setBuscarLote] = useState('');
  const [filtroStatusLote, setFiltroStatusLote] = useState('todos');

  // Form Novo Lote
  const [loteNumero, setLoteNumero] = useState('');
  const [loteSetor, setLoteSetor] = useState('');
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

  const operadorAtual = session?.user?.name?.trim() || 'Profissional autenticado';
  const dataLocalKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cssd');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Não foi possível carregar os lotes.');
      if (!Array.isArray(data)) throw new Error('A resposta de lotes está inválida.');
      setLotes(data);
      setErroCarregamento('');

      if (!loteNumero && data.length > 0) {
        setLoteNumero(`CSSD-${new Date().getFullYear()}-${String(data.length + 1).padStart(3,'0')}`);
      } else if (!loteNumero) {
        setLoteNumero(`CSSD-${new Date().getFullYear()}-001`);
      }
    } catch (e) {
      console.error(e);
      setErroCarregamento(e instanceof Error ? e.message : 'Erro ao carregar lotes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    const today = dataLocalKey(new Date());
    setLoteData(today);
  }, []);

  const criarLote = async () => {
    if(!loteNumero || !loteSetor){
      alert(" Preencha lote e setor!");
      return;
    }

    const payload = {
      numero: loteNumero.trim(),
      setor: loteSetor,
      data: loteData,
      equipamento: loteEquipamento,
      ciclo: loteCiclo,
      indicadorQuimico: loteIndicadorQuimico,
      indicadorBiologico: loteIndicadorBiologico,
      bowieDick: loteBowieDick,
      obs: loteObs.trim(),
    };

    try {
      const res = await fetch('/api/cssd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || 'Erro ao criar lote');

      setLoteObs('');
      alert(" Lote criado com sucesso!");
      setActiveTab('lotes');
      carregarDados();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const avancarStatus = async (id: string, statusAtual: string) => {
    const fluxo = ["Recepção", "Limpeza", "Preparo", "Esterilização", "Pronto"];
    const idx = fluxo.indexOf(statusAtual);
    if(idx < fluxo.length - 1) {
      const proximoStatus = fluxo[idx+1];
      try {
        const res = await fetch(`/api/cssd/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: proximoStatus })
        });
        const resposta = await res.json().catch(() => null);
        if (!res.ok) throw new Error(resposta?.error || 'Erro ao atualizar status');
        carregarDados();
      } catch (error: any) {
        alert(error.message);
      }
    } else {
      alert("Lote já está no status final!");
    }
  };

  const rejeitarLote = async (id: string, numero: string) => {
    if(await confirm(`Rejeitar lote ${numero}?`)){
      try {
        const res = await fetch(`/api/cssd/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejeitado' })
        });
        const resposta = await res.json().catch(() => null);
        if (!res.ok) throw new Error(resposta?.error || 'Erro ao rejeitar lote');
        carregarDados();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const adicionarItem = async () => {
    if(!itemLote || !itemNome){
      alert(" Selecione o lote e digite o nome do material!");
      return;
    }

    const payload = {
      loteId: itemLote,
      nome: itemNome.trim(),
      tipo: itemTipo,
      quantidade: itemQuantidade,
      embalagem: itemEmbalagem,
      integridade: itemIntegridade
    };

    try {
      const res = await fetch('/api/cssd/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || 'Erro ao adicionar item');

      setItemNome('');
      setItemQuantidade(1);
      alert(" Item adicionado ao lote!");
      setActiveTab('lotes');
      carregarDados();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Filtros
  let lotesFiltrados = [...lotes];
  if (filtroStatusLote !== 'todos') {
    lotesFiltrados = lotesFiltrados.filter(l => l.status === filtroStatusLote);
  }
  if (buscarLote) {
    const termo = buscarLote.toLowerCase();
    lotesFiltrados = lotesFiltrados.filter(l => l.numero.toLowerCase().includes(termo) || l.setor.toLowerCase().includes(termo) || l.operador.toLowerCase().includes(termo));
  }

  const lotesAtivos = lotes.filter(l => l.status !== "Pronto" && l.status !== "Rejeitado");

  // Indicadores
  const qtdRecepcao = lotes.filter(l => l.status === "Recepção").length;
  const qtdLimpeza = lotes.filter(l => l.status === "Limpeza").length;
  const qtdPreparo = lotes.filter(l => l.status === "Preparo").length;
  const qtdEsteril = lotes.filter(l => l.status === "Esterilização").length;

  if (loading && lotes.length === 0) return <div role="status" aria-live="polite" className="cssd-loading">Carregando lotes de esterilização…</div>;

  return (
    <div className="conteudo">
      <div className="cssd-container">

        {erroCarregamento && (
          <div className="cssd-load-error" role="alert">
            <span>{erroCarregamento}</span>
            <button type="button" onClick={carregarDados}>Tentar novamente</button>
          </div>
        )}

        <div className="banner-cssd">
          <div>
            <h1><i className="las la-box"></i> CME - Central de Material e Esterilização</h1>
            <p>Controle de ciclos de esterilização e rastreabilidade de instrumentais</p>
          </div>
          <button className="btn btn-success" onClick={() => setActiveTab('novo')}>
            <i className="las la-plus-circle"></i> Novo Lote
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card" style={{borderLeftColor: '#3b82f6'}}>
            <div className="stat-numero" style={{color:'#3b82f6'}}>{qtdRecepcao}</div>
            <div className="stat-label">Na Recepção</div>
          </div>
          <div className="stat-card" style={{borderLeftColor: '#8b5cf6'}}>
            <div className="stat-numero" style={{color:'#8b5cf6'}}>{qtdLimpeza}</div>
            <div className="stat-label">Em Limpeza</div>
          </div>
          <div className="stat-card" style={{borderLeftColor: '#f59e0b'}}>
            <div className="stat-numero" style={{color:'#f59e0b'}}>{qtdPreparo}</div>
            <div className="stat-label">Em Preparo</div>
          </div>
          <div className="stat-card" style={{borderLeftColor: '#10b981'}}>
            <div className="stat-numero" style={{color:'#10b981'}}>{qtdEsteril}</div>
            <div className="stat-label">Esterilizando</div>
          </div>
        </div>

        <div className="tabs-cssd">
          <button aria-pressed={activeTab === 'lotes'} className={`tab-btn ${activeTab === 'lotes' ? 'ativo' : ''}`} onClick={() => setActiveTab('lotes')}>
            <i className="las la-list"></i> Painel de Lotes
          </button>
          <button aria-pressed={activeTab === 'novo'} className={`tab-btn ${activeTab === 'novo' ? 'ativo' : ''}`} onClick={() => setActiveTab('novo')}>
            <i className="las la-plus"></i> Registrar Lote
          </button>
          <button aria-pressed={activeTab === 'itens'} className={`tab-btn ${activeTab === 'itens' ? 'ativo' : ''}`} onClick={() => setActiveTab('itens')}>
            <i className="las la-tools"></i> Adicionar Itens ao Lote
          </button>
          <button aria-pressed={activeTab === 'historico'} className={`tab-btn ${activeTab === 'historico' ? 'ativo' : ''}`} onClick={() => setActiveTab('historico')}>
            <i className="las la-history"></i> Histórico Completo
          </button>
        </div>

        {activeTab === 'novo' && (
          <div className="form-panel">
            <h3><i className="las la-plus-circle"></i> Abertura de Novo Lote de Esterilização</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Nº do Lote</label>
                <input type="text" value={loteNumero} onChange={e=>setLoteNumero(e.target.value)} disabled style={{backgroundColor:'#f1f5f9', fontWeight:'bold'}} />
              </div>
              <div className="form-grupo">
                <label>Setor de Origem *</label>
                <select value={loteSetor} onChange={e=>setLoteSetor(e.target.value)}>
                  <option value="">Selecione...</option>
                  <option>Centro Cirúrgico</option>
                  <option>UTI</option>
                  <option>Emergência</option>
                  <option>Enfermaria</option>
                  <option>Ambulatório</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Data *</label>
                <input type="date" value={loteData} onChange={e=>setLoteData(e.target.value)} />
              </div>
              <div className="form-grupo">
                <label>Operador autenticado</label>
                <input type="text" value={operadorAtual} readOnly aria-readonly="true" />
              </div>
              <div className="form-grupo">
                <label>Equipamento (Autoclave/Estufa)</label>
                <select value={loteEquipamento} onChange={e=>setLoteEquipamento(e.target.value)}>
                  <option>Autoclave 01</option>
                  <option>Autoclave 02</option>
                  <option>Autoclave 03 (Rápida)</option>
                  <option>Estufa Térmica</option>
                  <option>Lavadora Termodesinfectora</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Ciclo Selecionado</label>
                <select value={loteCiclo} onChange={e=>setLoteCiclo(e.target.value)}>
                  <option>134°C - 7 min (Padrão)</option>
                  <option>134°C - 4 min (Flash)</option>
                  <option>121°C - 15 min</option>
                  <option>Ciclo Príon</option>
                  <option>Lavagem Térmica</option>
                </select>
              </div>
            </div>

            <h4 style={{marginTop:'25px', marginBottom:'15px', color:'#1e293b', borderBottom:'1px solid #e2e8f0', paddingBottom:'5px'}}>Indicadores de Qualidade</h4>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Indicador Químico (Classe 5 ou 6)</label>
                <select value={loteIndicadorQuimico} onChange={e=>setLoteIndicadorQuimico(e.target.value)}>
                  <option>Virado (OK)</option>
                  <option>Falho (Rejeitar)</option>
                  <option>Não Aplicável</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Indicador Biológico</label>
                <select value={loteIndicadorBiologico} onChange={e=>setLoteIndicadorBiologico(e.target.value)}>
                  <option>Negativo (OK)</option>
                  <option>Positivo (Rejeitar Lote)</option>
                  <option>Aguardando Incubação</option>
                  <option>Não Aplicável</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Teste Bowie-Dick (Vácuo)</label>
                <select value={loteBowieDick} onChange={e=>setLoteBowieDick(e.target.value)}>
                  <option>Aprovado</option>
                  <option>Reprovado (Manutenção)</option>
                  <option>Não Realizado</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Observações Extras</label>
                <input type="text" value={loteObs} onChange={e=>setLoteObs(e.target.value)} placeholder="Opcional..." />
              </div>
            </div>

            <button className="btn btn-success" onClick={criarLote} style={{width:'100%', marginTop:'20px', padding:'14px', justifyContent:'center'}}>
              <i className="las la-save"></i> Criar Lote
            </button>
          </div>
        )}

        {activeTab === 'itens' && (
          <div className="form-panel">
            <h3><i className="las la-tools"></i> Vincular Instrumentais ao Lote</h3>
            <p style={{color:'#64748b', marginBottom:'20px'}}>Adicione as pinças, caixas e materiais que compõem o lote ativo.</p>

            <div className="form-grid">
              <div className="form-grupo">
                <label>Selecione o Lote Aberto *</label>
                <select value={itemLote} onChange={e=>setItemLote(e.target.value)}>
                  <option value="">Selecione...</option>
                  {lotesAtivos.map(l => <option key={l.id} value={l.id}>{l.numero} ({l.status})</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label>Nome do Material / Caixa *</label>
                <input type="text" value={itemNome} onChange={e=>setItemNome(e.target.value)} placeholder="Ex: Caixa de Pequena Cirurgia" />
              </div>
              <div className="form-grupo">
                <label>Tipo</label>
                <select value={itemTipo} onChange={e=>setItemTipo(e.target.value)}>
                  <option>Instrumental Cirúrgico</option>
                  <option>Caixa Montada</option>
                  <option>Tecido / Avental</option>
                  <option>Vidraria</option>
                  <option>Motor / Perfurador</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Quantidade</label>
                <input type="number" min="1" value={itemQuantidade} onChange={e=>setItemQuantidade(Number(e.target.value))} />
              </div>
              <div className="form-grupo">
                <label>Embalagem</label>
                <select value={itemEmbalagem} onChange={e=>setItemEmbalagem(e.target.value)}>
                  <option>Grau Cirúrgico (SMS)</option>
                  <option>Contêiner Rígido</option>
                  <option>Papel Crepado</option>
                  <option>Tyvek</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Integridade Visual</label>
                <select value={itemIntegridade} onChange={e=>setItemIntegridade(e.target.value)}>
                  <option>Íntegra</option>
                  <option>Com Manchas (Aceitável)</option>
                  <option>Danificada (Rejeitar)</option>
                </select>
              </div>
            </div>

            <button className="btn btn-primary" onClick={adicionarItem} style={{width:'100%', marginTop:'20px', padding:'14px', justifyContent:'center'}}>
              <i className="las la-plus"></i> Adicionar Material ao Lote
            </button>
          </div>
        )}

        {activeTab === 'lotes' && (
          <div className="painel-operacional">
            <div className="controles-topo" style={{display:'flex', gap:'15px', marginBottom:'20px'}}>
              <div className="pesquisa-box" style={{flex:1}}>
                <i className="las la-search"></i>
                <input type="text" placeholder="Buscar lote, setor ou operador..." value={buscarLote} onChange={e=>setBuscarLote(e.target.value)} />
              </div>
              <select value={filtroStatusLote} onChange={e=>setFiltroStatusLote(e.target.value)} style={{padding:'10px', borderRadius: '8px', border:'1px solid #cbd5e1'}}>
                <option value="todos">Todos os Status</option>
                <option value="Recepção">Recepção</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Preparo">Preparo</option>
                <option value="Esterilização">Esterilização</option>
              </select>
            </div>

            <div className="lotes-grid">
              {lotesFiltrados.filter(l => l.status !== "Pronto" && l.status !== "Rejeitado").map(l => (
                <div className="lote-card" key={l.id}>
                  <div className="lote-header">
                    <h4><i className="las la-box"></i> {l.numero}</h4>
                    <span className={`status-badge ${l.status.toLowerCase().replace('ç','c').replace('ã','a')}`}>{l.status}</span>
                  </div>
                  <div className="lote-body">
                    <p><strong>Setor:</strong> {l.setor}</p>
                    <p><strong>Operador:</strong> {l.operador}</p>
                    <p><strong>Equipamento:</strong> {l.equipamento}</p>
                    <p><strong>Ciclo:</strong> {l.ciclo}</p>
                    <div className="lote-itens-preview">
                      <p><strong>Itens:</strong> {l.itens?.length || 0} cadastrados</p>
                    </div>
                  </div>
                  <div className="lote-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => avancarStatus(l.id, l.status)}>
                      Avançar Passo <i className="las la-arrow-right"></i>
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => rejeitarLote(l.id, l.numero)} title="Reprovar Lote" aria-label={`Reprovar lote ${l.numero}`}>
                      <i className="las la-times-circle" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              ))}
              {lotesFiltrados.filter(l => l.status !== "Pronto" && l.status !== "Rejeitado").length === 0 && (
                <div style={{gridColumn:'1 / -1', textAlign:'center', padding:'40px', color:'#64748b', background:'white', borderRadius: '8px'}}>
                  Nenhum lote ativo encontrado nos filtros selecionados.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div style={{background:'white', borderRadius: '8px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)', overflowX:'auto'}}>
            <table className="tabela-cssd">
              <thead>
                <tr>
                  <th>Nº Lote</th>
                  <th>Data</th>
                  <th>Setor</th>
                  <th>Operador</th>
                  <th>Equipamento</th>
                  <th>Qtd. Itens</th>
                  <th>Biológico</th>
                  <th>Status Final</th>
                </tr>
              </thead>
              <tbody>
                {lotes.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum lote registrado</td></tr>
                ) : (
                  lotes.map(l => (
                    <tr key={l.id}>
                      <td><strong>{l.numero}</strong></td>
                      <td>{typeof l.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.data) ? new Date(`${l.data}T00:00:00`).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>{l.setor}</td>
                      <td>{l.operador}</td>
                      <td>{l.equipamento}</td>
                      <td>{l.itens?.length || 0}</td>
                      <td>
                        <span style={{color: l.indicadorBiologico.includes('Negativo') ? '#10b981' : (l.indicadorBiologico.includes('Positivo') ? '#ef4444' : '#64748b')}}>
                          {l.indicadorBiologico}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${l.status === 'Pronto' ? 'badge-success' : (l.status === 'Rejeitado' ? 'badge-danger' : 'badge-warning')}`}>
                          {l.status}
                        </span>
                      </td>
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
