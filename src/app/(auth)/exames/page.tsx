'use client';
import { useState, useEffect } from 'react';
import './exames.css';

interface Paciente {
  id: string;
  nome: string;
}

interface Exame {
  id: string;
  tipo: string; // 'laboratorio' | 'imagem'
  pacienteId: string;
  paciente: Paciente;
  nome: string;
  status: string; // 'SOLICITADO', 'COLETADO', 'EM_ANALISE', 'CONCLUIDO', 'CANCELADO', 'ALTERADO_CRITICO'
  resultado: string | null;
  profissional: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

async function mensagemErro(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function tipoNormalizado(tipo: string) {
  const valor = tipo.trim().toLocaleLowerCase('pt-BR');
  if (valor === 'laboratorio' || valor === 'laboratorial') return 'laboratorio';
  if (valor === 'imagem' || valor === 'imagens') return 'imagem';
  return valor;
}

const examesDisponiveis: Record<string, string[]> = {
  laboratorio: ["Hemograma Completo","Glicemia de Jejum","HbA1c","Colesterol Total e Frações","Triglicerídeos","TGO/AST","TGP/ALT","Creatinina","Ureia","Ácido Úrico","TSH","T4 Livre","PSA Total","VHS","PCR","TAP/INR","KPTT","Gasometria Arterial","Eletrólitos (Na/K/Ca/Mg)","Sumário de Urina (EAS)","Urocultura com Antibiograma","Hemocultura","Sorologia COVID-19","Sorologia Dengue","Teste Rápido HIV/Sífilis","Marcadores Cardíacos (Troponina/CK-MB)"],
  imagem: ["Raio-X de Tórax (PA e Perfil)","Raio-X de Abdome","Raio-X de Crânio","Raio-X de Coluna Cervical","Raio-X de Coluna Lombar","Raio-X de Seios da Face","Raio-X de Membros","Tomografia de Crânio","Tomografia de Tórax","Tomografia de Abdome","Tomografia de Coluna","Ressonância de Crânio","Ressonância de Coluna","Ressonância de Joelho","Ultrassonografia Abdominal","Ultrassonografia Pélvica","Ultrassonografia Obstétrica","Doppler Venoso de MMII","Ecocardiograma","Eletrocardiograma (ECG)","Mamografia","Densitometria Óssea"]
};

export default function ExamesPage() {
  const [activeTab, setActiveTab] = useState<'solicitacao' | 'listagem' | 'resultados'>('solicitacao');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [exames, setExames] = useState<Exame[]>([]);

  // Solicitacao form
  const [solTipo, setSolTipo] = useState('laboratorio');
  const [solPacienteId, setSolPacienteId] = useState('');
  const [solExame, setSolExame] = useState('');
  const [solPrioridade, setSolPrioridade] = useState('Normal');
  const [solObs, setSolObs] = useState('');

  // Listagem filters
  const [buscarExame, setBuscarExame] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Resultados form
  const [resExameId, setResExameId] = useState('');
  const [resValor, setResValor] = useState('');
  const [resStatus, setResStatus] = useState('CONCLUIDO');
  const [resLaudo, setResLaudo] = useState('');

  // Modals
  const [modalLaudoData, setModalLaudoData] = useState<{exame: Exame, tipo: 'laudo' | 'imagem'} | null>(null);

  const carregarDados = async () => {
    try {
      const [resExames, resPacientes] = await Promise.all([
        fetch('/api/exames'),
        fetch('/api/pacientes')
      ]);
      if (!resExames.ok) throw new Error(await mensagemErro(resExames, 'Não foi possível carregar os exames.'));
      if (!resPacientes.ok) throw new Error(await mensagemErro(resPacientes, 'Não foi possível carregar os pacientes.'));
      const [dadosExames, dadosPacientes] = await Promise.all([resExames.json(), resPacientes.json()]);
      if (!Array.isArray(dadosExames) || !Array.isArray(dadosPacientes)) throw new Error('Resposta inválida ao carregar os dados.');
      setExames(dadosExames);
      setPacientes(dadosPacientes);
      setErroCarga('');
    } catch (err) {
      setErroCarga(err instanceof Error ? err.message : 'Não foi possível carregar exames.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirSolicitacao = (tipo: string) => {
    setSolTipo(tipo);
    setSolExame('');
    setActiveTab('solicitacao');
  };

  const irParaResultado = (id: string) => {
    setResExameId(id);
    setActiveTab('resultados');
  };

  const solicitarExame = async () => {
    if (!solPacienteId || !solExame) {
      alert(" Preencha todos os campos obrigatórios (*)");
      return;
    }

    try {
      const res = await fetch('/api/exames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: solPacienteId,
          tipo: solTipo,
          nome: solExame,
          observacoes: `Prioridade: ${solPrioridade}. Obs: ${solObs}`
        })
      });

      if (!res.ok) throw new Error(await mensagemErro(res, "Erro ao solicitar exame"));

      setSolPacienteId('');
      setSolExame('');
      setSolObs('');
      alert(" Exame solicitado com sucesso!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    try {
      const res = await fetch(`/api/exames/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      if (!res.ok) throw new Error(await mensagemErro(res, "Erro ao atualizar status"));
      
      alert(" Status do exame atualizado!");
      carregarDados();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const lancarResultado = async () => {
    if (!resExameId || !resValor) {
      alert("Selecione o exame e digite o resultado!");
      return;
    }

    try {
      const res = await fetch(`/api/exames/${resExameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resStatus,
          resultado: resValor,
          observacoes: resLaudo
        })
      });

      if (!res.ok) throw new Error(await mensagemErro(res, "Erro ao lançar resultado"));

      setResExameId('');
      setResValor('');
      setResLaudo('');
      alert(` Resultado lançado com sucesso!`);
      if (resStatus === "ALTERADO_CRITICO") {
        alert("ATENÇÃO: resultado marcado como crítico. A notificação automática ao médico não está disponível; acione o protocolo institucional imediatamente.");
      }
      carregarDados();
      setActiveTab('listagem');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const examesPendentes = exames.filter(e => e.status !== "SOLICITADO" && !e.resultado);
  const resultadosRecentes = exames
    .filter(e => e.resultado)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  const dataLocal = new Date();
  const concluidoHoje = (updatedAt: string) => {
    const dataAtualizacao = new Date(updatedAt);
    return Number.isFinite(dataAtualizacao.getTime())
      && dataAtualizacao.getFullYear() === dataLocal.getFullYear()
      && dataAtualizacao.getMonth() === dataLocal.getMonth()
      && dataAtualizacao.getDate() === dataLocal.getDate();
  };
  const stats = {
    lab: exames.filter(e => tipoNormalizado(e.tipo) === "laboratorio").length,
    img: exames.filter(e => tipoNormalizado(e.tipo) === "imagem").length,
    pendentes: exames.filter(e => !e.resultado).length,
    concluidos: exames.filter(e => e.status === 'CONCLUIDO' && concluidoHoje(e.updatedAt)).length,
    alterados: exames.filter(e => e.status === "ALTERADO_CRITICO").length
  };

  let listaExames = [...exames];
  if (filtroTipo !== 'todos') listaExames = listaExames.filter(e => tipoNormalizado(e.tipo) === filtroTipo);
  if (filtroStatus !== 'todos') listaExames = listaExames.filter(e => e.status === filtroStatus);
  if (buscarExame.trim()) {
    const t = buscarExame.trim().toLocaleLowerCase('pt-BR');
    listaExames = listaExames.filter(e => e.paciente.nome.toLocaleLowerCase('pt-BR').includes(t) || e.nome.toLocaleLowerCase('pt-BR').includes(t));
  }

  const getStatusName = (status: string) => {
    const map: Record<string, string> = {
      'SOLICITADO': 'Solicitado',
      'COLETADO': 'Coletado',
      'EM_ANALISE': 'Em Análise',
      'CONCLUIDO': 'Concluído',
      'CANCELADO': 'Cancelado',
      'ALTERADO_CRITICO': 'Crítico'
    };
    return map[status] || status;
  };

  if (loading) return <div>Carregando Exames...</div>;

  return (
    <div className="conteudo">
      <div className="exames-container">

        <div className="banner-exames">
          <div>
            <h1><i className="las la-flask"></i> Exames & Imagens</h1>
            <p>Laboratório (LIS) e Radiologia/Imagens unificados</p>
          </div>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            <button className="btn btn-success" onClick={() => abrirSolicitacao('laboratorio')}><i className="las la-flask"></i> Solicitar Laboratório</button>
            <button className="btn btn-info" onClick={() => abrirSolicitacao('imagem')}><i className="las la-x-ray"></i> Solicitar Imagem</button>
          </div>
        </div>

        {erroCarga && <p role="alert" className="form-panel" style={{ color: '#b91c1c' }}>{erroCarga}</p>}

        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon" style={{color:'#1e3a8a'}}><i className="las la-flask"></i></div><div className="stat-numero">{stats.lab}</div><div className="stat-label">Exames Laboratoriais</div></div>
          <div className="stat-card"><div className="stat-icon" style={{color:'#7c3aed'}}><i className="las la-x-ray"></i></div><div className="stat-numero">{stats.img}</div><div className="stat-label">Exames de Imagem</div></div>
          <div className="stat-card"><div className="stat-icon" style={{color:'#f59e0b'}}><i className="las la-clock"></i></div><div className="stat-numero">{stats.pendentes}</div><div className="stat-label">Pendentes</div></div>
          <div className="stat-card"><div className="stat-icon" style={{color:'#16a34a'}}><i className="las la-check-circle"></i></div><div className="stat-numero">{stats.concluidos}</div><div className="stat-label">Concluídos Hoje</div></div>
          <div className="stat-card"><div className="stat-icon" style={{color:'#dc2626'}}><i className="las la-exclamation-triangle"></i></div><div className="stat-numero">{stats.alterados}</div><div className="stat-label">Resultados Alterados</div></div>
        </div>

        <div className="tabs-main">
          <button className={`tab-main ${activeTab === 'solicitacao' ? 'ativo' : ''}`} onClick={() => setActiveTab('solicitacao')}><i className="las la-plus-circle"></i> Solicitações</button>
          <button className={`tab-main ${activeTab === 'listagem' ? 'ativo' : ''}`} onClick={() => setActiveTab('listagem')}><i className="las la-list"></i> Listagem</button>
          <button className={`tab-main ${activeTab === 'resultados' ? 'ativo' : ''}`} onClick={() => setActiveTab('resultados')}><i className="las la-clipboard-check"></i> Resultados</button>
        </div>

        {activeTab === 'solicitacao' && (
          <div className="form-panel">
            <h3><i className={solTipo === 'imagem' ? 'las la-x-ray' : 'las la-flask'}></i> <span>{solTipo === 'imagem' ? 'Solicitar Exame de Imagem / Radiologia' : 'Solicitar Exame Laboratorial'}</span></h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label>Paciente *</label>
                <select value={solPacienteId} onChange={e => setSolPacienteId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label>Tipo de Exame *</label>
                <select value={solTipo} onChange={e => { setSolTipo(e.target.value); setSolExame(''); }}>
                  <option value="laboratorio"> Laboratorial</option>
                  <option value="imagem"> Imagem / Radiologia</option>
                </select>
              </div>
              <div className="form-grupo">
                <label>Exame Específico *</label>
                <select value={solExame} onChange={e => setSolExame(e.target.value)}>
                  <option value="">Selecione...</option>
                  {(examesDisponiveis[solTipo] || []).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="form-grupo"><label>Prioridade</label><select value={solPrioridade} onChange={e => setSolPrioridade(e.target.value)}><option>Normal</option><option>Urgente</option><option>Emergência</option></select></div>
              <div className="form-grupo full"><label htmlFor="exame-observacoes">Observações Clínicas</label><textarea id="exame-observacoes" rows={2} maxLength={1800} placeholder="Informações clínicas relevantes..." value={solObs} onChange={e => setSolObs(e.target.value)}></textarea></div>
            </div>
            <button className="btn btn-success" onClick={solicitarExame} style={{width:'100%', marginTop:'15px', justifyContent:'center', padding:'14px'}}><i className="las la-paper-plane"></i> Solicitar Exame</button>
          </div>
        )}

        {activeTab === 'listagem' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por paciente ou exame..." value={buscarExame} onChange={e => setBuscarExame(e.target.value)} />
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}><option value="todos">Todos os Tipos</option><option value="laboratorio"> Laboratório</option><option value="imagem"> Imagem</option></select>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}><option value="todos">Todos os Status</option><option value="SOLICITADO">Solicitado</option><option value="COLETADO">Coletado</option><option value="EM_ANALISE">Em Análise</option><option value="CONCLUIDO">Concluído</option><option value="ALTERADO_CRITICO">Alterado/Crítico</option></select>
            </div>
            <div className="tabela-exames-wrapper">
              <table className="tabela-exames">
                <thead><tr><th>Data</th><th>Tipo</th><th>Paciente</th><th>Exame</th><th>Solicitante</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {listaExames.length === 0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum exame encontrado</td></tr>
                  ) : (
                    listaExames.map(e => {
                      const statusBadge: Record<string, string> = {"SOLICITADO":"badge-solicitado","COLETADO":"badge-coletado","EM_ANALISE":"badge-analise","CONCLUIDO":"badge-concluido","ALTERADO_CRITICO":"badge-critico"};
                      return (
                        <tr key={e.id}>
                          <td>{new Date(e.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td><span className={`badge ${tipoNormalizado(e.tipo) === 'laboratorio' ? 'badge-laboratorio' : 'badge-imagem'}`}>{tipoNormalizado(e.tipo) === 'laboratorio' ? ' Lab' : ' Imagem'}</span></td>
                          <td><strong>{e.paciente.nome}</strong></td>
                          <td>{e.nome}</td>
                          <td>{e.profissional || '-'}</td>
                          <td><span className={`badge ${statusBadge[e.status] || 'badge-solicitado'}`}>{getStatusName(e.status)}</span></td>
                          <td>
                            <button className="btn btn-xs btn-primary" onClick={() => setModalLaudoData({exame: e, tipo: 'laudo'})}><i className="las la-eye"></i></button>
                            {e.status === 'SOLICITADO' && <button className="btn btn-xs btn-warning" onClick={() => alterarStatus(e.id, 'COLETADO')}><i className="las la-syringe"></i></button>}
                            {(e.status === 'COLETADO' || e.status === 'EM_ANALISE') && !e.resultado && <button className="btn btn-xs btn-success" onClick={() => irParaResultado(e.id)}><i className="las la-check"></i></button>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'resultados' && (
          <div>
            <div className="form-panel">
              <h3><i className="las la-clipboard-check"></i> Lançar Resultado</h3>
              <div className="form-grid">
                <div className="form-grupo">
                  <label>Exame *</label>
                  <select value={resExameId} onChange={e => setResExameId(e.target.value)}>
                    <option value="">Selecione o exame solicitado...</option>
                    {examesPendentes.map(e => <option key={e.id} value={e.id}>{e.paciente.nome} - {e.nome} ({getStatusName(e.status)})</option>)}
                  </select>
                </div>
                <div className="form-grupo"><label htmlFor="resultado-exame">Resultado *</label><input id="resultado-exame" type="text" maxLength={5000} placeholder="Valor ou descrição do resultado" value={resValor} onChange={e => setResValor(e.target.value)} /></div>
                <div className="form-grupo"><label>Status do Resultado</label><select value={resStatus} onChange={e => setResStatus(e.target.value)}><option value="CONCLUIDO"> Normal / Concluído</option><option value="ALTERADO_CRITICO"> Alterado / Crítico</option></select></div>
                <div className="form-grupo full"><label htmlFor="laudo-exame">Laudo / Observações</label><textarea id="laudo-exame" rows={3} maxLength={2000} placeholder="Laudo completo do exame..." value={resLaudo} onChange={e => setResLaudo(e.target.value)}></textarea></div>
              </div>
              <button className="btn btn-primary" onClick={lancarResultado} style={{width:'100%', marginTop:'15px', justifyContent:'center', padding:'14px'}}><i className="las la-save"></i> Lançar Resultado</button>
            </div>
            
            <div style={{marginTop:'25px'}}>
              {resultadosRecentes.length === 0 ? (
                <p style={{color:'#94a3b8', textAlign:'center', padding:'20px'}}>Nenhum resultado lançado.</p>
              ) : (
                <>
                  <h3 style={{color:'#0a1f44', marginBottom:'15px'}}><i className="las la-history"></i> Resultados Recentes</h3>
                  {resultadosRecentes.map(e => (
                    <div key={e.id} className={`resultado-card ${e.status === 'ALTERADO_CRITICO' ? 'critico' : ''}`}>
                      <div className="resultado-header">
                        <strong>{e.paciente.nome} - {e.nome}</strong>
                        <span className={`badge ${tipoNormalizado(e.tipo) === 'laboratorio' ? 'badge-laboratorio' : 'badge-imagem'}`}>{tipoNormalizado(e.tipo) === 'laboratorio' ? ' Lab' : ' Imagem'}</span>
                      </div>
                      <div className="resultado-valor">{e.resultado}</div>
                      <small style={{color:'#94a3b8'}}>{new Date(e.updatedAt).toLocaleString('pt-BR')} | Liberado por: {e.profissional || '-'}</small>
                      <div style={{marginTop:'8px', display:'flex', gap:'8px', flexWrap:'wrap'}}>
                        <button className="btn btn-xs btn-info" onClick={() => setModalLaudoData({exame: e, tipo: 'laudo'})}><i className="las la-file-alt"></i> Ver Laudo</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {modalLaudoData && (
        <div className="modal-laudo" style={{display: 'flex'}} onClick={(e) => { if (e.target === e.currentTarget) setModalLaudoData(null); }}>
          <div className="modal-laudo-content">
            {modalLaudoData.tipo === 'laudo' ? (
              <>
                <h3><i className="las la-file-alt"></i> Laudo / Resultado</h3>
                <div style={{borderBottom:'2px solid #e2e8f0', paddingBottom:'15px', marginBottom:'15px'}}>
                  <p><strong>Paciente:</strong> {modalLaudoData.exame.paciente.nome}</p>
                  <p><strong>Exame:</strong> {modalLaudoData.exame.nome}</p>
                  <p><strong>Tipo:</strong> {tipoNormalizado(modalLaudoData.exame.tipo) === 'laboratorio' ? ' Laboratorial' : ' Imagem'}</p>
                  <p><strong>Solicitante:</strong> {modalLaudoData.exame.profissional || '-'}</p>
                  <p><strong>Data Solicitação:</strong> {new Date(modalLaudoData.exame.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <div style={{background:'#f8fafc', borderRadius: '8px', padding:'20px', marginBottom:'15px'}}>
                  <h4 style={{marginBottom:'10px'}}>Resultado</h4>
                  <p style={{fontSize:'18px', fontWeight:700, color: modalLaudoData.exame.status === 'ALTERADO_CRITICO' ? '#dc2626' : '#16a34a'}}>{modalLaudoData.exame.resultado || 'Aguardando'}</p>
                </div>
                {modalLaudoData.exame.observacoes && (
                  <div style={{marginBottom:'15px'}}>
                    <h4>Observações / Laudo</h4>
                    <p style={{color:'#334155', lineHeight:1.6}}>{modalLaudoData.exame.observacoes}</p>
                  </div>
                )}
              </>
            ) : null}
            <button className="btn btn-danger" onClick={() => setModalLaudoData(null)} style={{width:'100%', marginTop:'15px'}}>Fechar</button>
          </div>
        </div>
      )}

    </div>
  );
}
