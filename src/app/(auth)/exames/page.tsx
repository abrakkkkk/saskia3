'use client';
import { useState, useEffect } from 'react';
import './exames.css';

interface Paciente {
  id: number;
  nome: string;
}

interface Exame {
  id: number;
  tipo: string; // 'laboratorio' | 'imagem'
  paciente: string;
  exame: string;
  prioridade: string;
  medico: string;
  dataColeta: string;
  dataSolicitacao: string;
  obs: string;
  regiao?: string;
  portatil?: string;
  status: string; // 'Solicitado' | 'Coletado' | 'Em Análise' | 'Concluído' | 'Alterado/Crítico'
  resultado?: string | null;
  referencia?: string;
  profissionalLiberador?: string;
  laudo?: string | null;
  dataResultado?: string;
  imagem?: string | null;
}

const examesDisponiveis: Record<string, string[]> = {
  laboratorio: ["Hemograma Completo","Glicemia de Jejum","HbA1c","Colesterol Total e Frações","Triglicerídeos","TGO/AST","TGP/ALT","Creatinina","Ureia","Ácido Úrico","TSH","T4 Livre","PSA Total","VHS","PCR","TAP/INR","KPTT","Gasometria Arterial","Eletrólitos (Na/K/Ca/Mg)","Sumário de Urina (EAS)","Urocultura com Antibiograma","Hemocultura","Sorologia COVID-19","Sorologia Dengue","Teste Rápido HIV/Sífilis","Marcadores Cardíacos (Troponina/CK-MB)"],
  imagem: ["Raio-X de Tórax (PA e Perfil)","Raio-X de Abdome","Raio-X de Crânio","Raio-X de Coluna Cervical","Raio-X de Coluna Lombar","Raio-X de Seios da Face","Raio-X de Membros","Tomografia de Crânio","Tomografia de Tórax","Tomografia de Abdome","Tomografia de Coluna","Ressonância de Crânio","Ressonância de Coluna","Ressonância de Joelho","Ultrassonografia Abdominal","Ultrassonografia Pélvica","Ultrassonografia Obstétrica","Doppler Venoso de MMII","Ecocardiograma","Eletrocardiograma (ECG)","Mamografia","Densitometria Óssea"]
};

export default function ExamesPage() {
  const [activeTab, setActiveTab] = useState<'solicitacao' | 'listagem' | 'resultados'>('solicitacao');
  const [hospitalId, setHospitalId] = useState<string>('hospital_001');
  const [loading, setLoading] = useState(true);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [exames, setExames] = useState<Exame[]>([]);

  // Solicitacao form
  const [solTipo, setSolTipo] = useState('laboratorio');
  const [solPaciente, setSolPaciente] = useState('');
  const [solExame, setSolExame] = useState('');
  const [solPrioridade, setSolPrioridade] = useState('Normal');
  const [solMedico, setSolMedico] = useState('');
  const [solDataColeta, setSolDataColeta] = useState('');
  const [solObs, setSolObs] = useState('');
  const [solRegiao, setSolRegiao] = useState('');
  const [solPortatil, setSolPortatil] = useState('Não');

  // Listagem filters
  const [buscarExame, setBuscarExame] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Resultados form
  const [resExameId, setResExameId] = useState('');
  const [resData, setResData] = useState('');
  const [resValor, setResValor] = useState('');
  const [resReferencia, setResReferencia] = useState('');
  const [resStatus, setResStatus] = useState('Concluído');
  const [resProfissional, setResProfissional] = useState('');
  const [resLaudo, setResLaudo] = useState('');
  const [resImagem, setResImagem] = useState<string | null>(null);

  // Modals
  const [modalLaudoData, setModalLaudoData] = useState<{exame: Exame, tipo: 'laudo' | 'imagem'} | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('usuarioLogado');
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);

      const p = JSON.parse(localStorage.getItem(`${hid}_pacientes`) || '[]');
      setPacientes(p);

      const e = JSON.parse(localStorage.getItem(`${hid}_saskiaExames`) || '[]');
      setExames(e);
      setSolDataColeta(new Date().toISOString().slice(0, 16));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  const saveExames = (data: Exame[]) => {
    setExames(data);
    localStorage.setItem(`${hospitalId}_saskiaExames`, JSON.stringify(data));
  };

  const abrirSolicitacao = (tipo: string) => {
    setSolTipo(tipo);
    setSolExame('');
    setActiveTab('solicitacao');
  };

  const irParaResultado = (id: number) => {
    setResExameId(id.toString());
    setResData(new Date().toISOString().slice(0, 16));
    setResImagem(null);
    setActiveTab('resultados');
  };

  const solicitarExame = () => {
    if (!solPaciente || !solExame || !solMedico) {
      alert("⚠️ Preencha todos os campos obrigatórios (*)");
      return;
    }
    const novoExame: Exame = {
      id: Date.now(),
      tipo: solTipo,
      paciente: solPaciente,
      exame: solExame,
      prioridade: solPrioridade,
      medico: solMedico,
      dataColeta: solDataColeta,
      dataSolicitacao: new Date().toISOString(),
      obs: solObs,
      regiao: solTipo === 'imagem' ? solRegiao : "",
      portatil: solTipo === 'imagem' ? solPortatil : "Não",
      status: "Solicitado",
      resultado: null,
      laudo: null,
      imagem: null
    };

    saveExames([...exames, novoExame]);
    setSolPaciente('');
    setSolExame('');
    setSolMedico('');
    setSolObs('');
    setSolRegiao('');
    setSolPortatil('Não');
    alert("✅ Exame solicitado com sucesso!");
  };

  const coletarExame = (id: number) => {
    const ex = exames.find(e => e.id === id);
    if (!ex) return;
    if (confirm(`Confirmar coleta do exame: ${ex.exame} - ${ex.paciente}?`)) {
      const novos = exames.map(e => e.id === id ? { ...e, status: "Coletado" } : e);
      saveExames(novos);
      alert("✅ Exame marcado como coletado!");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setResImagem(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const lancarResultado = () => {
    if (!resExameId) {
      alert("Selecione o exame!");
      return;
    }
    if (!resValor) {
      alert("Digite o resultado!");
      return;
    }

    const u = localStorage.getItem('usuarioLogado');
    const usuario = u ? JSON.parse(u) : null;
    const profissional = resProfissional || usuario?.nome || "Sistema";

    const id = parseInt(resExameId);
    let targetExame: Exame | undefined;
    const novosExames = exames.map(e => {
      if (e.id === id) {
        targetExame = {
          ...e,
          resultado: resValor,
          referencia: resReferencia,
          status: resStatus,
          profissionalLiberador: profissional,
          laudo: resLaudo,
          dataResultado: resData || new Date().toISOString(),
          imagem: resImagem !== null ? resImagem : e.imagem
        };
        return targetExame;
      }
      return e;
    });

    if (targetExame) {
      saveExames(novosExames);
      setResExameId('');
      setResValor('');
      setResReferencia('');
      setResLaudo('');
      setResProfissional('');
      setResImagem(null);
      
      alert(`✅ Resultado lançado para ${targetExame.paciente} - ${targetExame.exame}!`);
      if (resStatus === "Alterado/Crítico") {
        alert("⚠️ ATENÇÃO: Resultado CRÍTICO! Notificar médico imediatamente!");
      }
    }
  };

  const examesPendentes = exames.filter(e => e.status !== "Solicitado" && !e.resultado);
  const resultadosRecentes = exames.filter(e => e.resultado).reverse().slice(0, 10);

  const hoje = new Date().toISOString().split('T')[0];
  const stats = {
    lab: exames.filter(e => e.tipo === "laboratorio").length,
    img: exames.filter(e => e.tipo === "imagem").length,
    pendentes: exames.filter(e => !e.resultado).length,
    concluidos: exames.filter(e => e.resultado && e.dataResultado && e.dataResultado.startsWith(hoje)).length,
    alterados: exames.filter(e => e.status === "Alterado/Crítico").length
  };

  let listaExames = [...exames].reverse();
  if (filtroTipo !== 'todos') listaExames = listaExames.filter(e => e.tipo === filtroTipo);
  if (filtroStatus !== 'todos') listaExames = listaExames.filter(e => e.status === filtroStatus);
  if (buscarExame) {
    const t = buscarExame.toLowerCase();
    listaExames = listaExames.filter(e => e.paciente.toLowerCase().includes(t) || e.exame.toLowerCase().includes(t) || e.medico.toLowerCase().includes(t));
  }

  const selectedExameForRes = exames.find(e => e.id.toString() === resExameId);
  const isImagemRes = selectedExameForRes?.tipo === 'imagem';

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
                <select value={solPaciente} onChange={e => setSolPaciente(e.target.value)}>
                  <option value="">Selecione...</option>
                  {pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label>Tipo de Exame *</label>
                <select value={solTipo} onChange={e => { setSolTipo(e.target.value); setSolExame(''); }}>
                  <option value="laboratorio">🔬 Laboratorial</option>
                  <option value="imagem">🩻 Imagem / Radiologia</option>
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
              <div className="form-grupo"><label>Médico Solicitante *</label><input type="text" placeholder="Nome e CRM" value={solMedico} onChange={e => setSolMedico(e.target.value)} /></div>
              <div className="form-grupo"><label>Data/Hora Coleta (Lab)</label><input type="datetime-local" value={solDataColeta} onChange={e => setSolDataColeta(e.target.value)} /></div>
              <div className="form-grupo full"><label>Observações Clínicas</label><textarea rows={2} placeholder="Informações clínicas relevantes..." value={solObs} onChange={e => setSolObs(e.target.value)}></textarea></div>
            </div>
            {solTipo === 'imagem' && (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginTop:'14px'}}>
                <div className="form-grupo"><label>Região / Incidência</label><input type="text" placeholder="Ex: Tórax PA e Perfil, Crânio, Abdome..." value={solRegiao} onChange={e => setSolRegiao(e.target.value)} /></div>
                <div className="form-grupo"><label>Leito / Portátil</label><select value={solPortatil} onChange={e => setSolPortatil(e.target.value)}><option>Não</option><option>Sim - Leito</option><option>Sim - UTI</option></select></div>
              </div>
            )}
            <button className="btn btn-success" onClick={solicitarExame} style={{width:'100%', marginTop:'15px', justifyContent:'center', padding:'14px'}}><i className="las la-paper-plane"></i> Solicitar Exame</button>
          </div>
        )}

        {activeTab === 'listagem' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por paciente, exame ou médico..." value={buscarExame} onChange={e => setBuscarExame(e.target.value)} />
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}><option value="todos">Todos os Tipos</option><option value="laboratorio">🔬 Laboratório</option><option value="imagem">🩻 Imagem</option></select>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}><option value="todos">Todos os Status</option><option value="Solicitado">Solicitado</option><option value="Coletado">Coletado</option><option value="Em Análise">Em Análise</option><option value="Concluído">Concluído</option><option value="Alterado/Crítico">Alterado/Crítico</option></select>
            </div>
            <div style={{background:'white', borderRadius:'20px', overflow:'hidden', boxShadow:'0 4px 15px rgba(0,0,0,0.06)'}}>
              <table className="tabela-exames">
                <thead><tr><th>Data</th><th>Tipo</th><th>Paciente</th><th>Exame</th><th>Solicitante</th><th>Prioridade</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {listaExames.length === 0 ? (
                    <tr><td colSpan={8} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum exame encontrado</td></tr>
                  ) : (
                    listaExames.map(e => {
                      const statusBadge: Record<string, string> = {"Solicitado":"badge-solicitado","Coletado":"badge-coletado","Em Análise":"badge-analise","Concluído":"badge-concluido","Alterado/Crítico":"badge-critico"};
                      const priBadge = e.prioridade === 'Emergência' ? 'badge-critico' : e.prioridade === 'Urgente' ? 'badge-alterado' : 'badge-solicitado';
                      return (
                        <tr key={e.id}>
                          <td>{new Date(e.dataSolicitacao).toLocaleDateString('pt-BR')}</td>
                          <td><span className={`badge ${e.tipo === 'laboratorio' ? 'badge-laboratorio' : 'badge-imagem'}`}>{e.tipo === 'laboratorio' ? '🔬 Lab' : '🩻 Imagem'}</span></td>
                          <td><strong>{e.paciente}</strong></td>
                          <td>{e.exame}</td>
                          <td>{e.medico}</td>
                          <td><span className={`badge ${priBadge}`}>{e.prioridade}</span></td>
                          <td><span className={`badge ${statusBadge[e.status] || 'badge-solicitado'}`}>{e.status}</span></td>
                          <td>
                            <button className="btn btn-xs btn-primary" onClick={() => setModalLaudoData({exame: e, tipo: 'laudo'})}><i className="las la-eye"></i></button>
                            {e.status === 'Solicitado' && <button className="btn btn-xs btn-warning" onClick={() => coletarExame(e.id)}><i className="las la-syringe"></i></button>}
                            {(e.status === 'Coletado' || e.status === 'Em Análise') && !e.resultado && <button className="btn btn-xs btn-success" onClick={() => irParaResultado(e.id)}><i className="las la-check"></i></button>}
                            {e.resultado && <button className="btn btn-xs btn-info" onClick={() => setModalLaudoData({exame: e, tipo: 'laudo'})}><i className="las la-file-alt"></i></button>}
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
                    {examesPendentes.map(e => <option key={e.id} value={e.id}>{e.tipo === 'imagem' ? '🩻' : '🔬'} {e.paciente} - {e.exame} ({e.status})</option>)}
                  </select>
                </div>
                <div className="form-grupo"><label>Data/Hora Resultado *</label><input type="datetime-local" value={resData} onChange={e => setResData(e.target.value)} /></div>
                <div className="form-grupo"><label>Resultado *</label><input type="text" placeholder="Valor ou descrição do resultado" value={resValor} onChange={e => setResValor(e.target.value)} /></div>
                <div className="form-grupo"><label>Valor de Referência</label><input type="text" placeholder="Valor normal de referência" value={resReferencia} onChange={e => setResReferencia(e.target.value)} /></div>
                <div className="form-grupo"><label>Status do Resultado</label><select value={resStatus} onChange={e => setResStatus(e.target.value)}><option value="Concluído">🟢 Normal / Concluído</option><option value="Alterado/Crítico">🔴 Alterado / Crítico</option></select></div>
                <div className="form-grupo"><label>Profissional Liberador</label><input type="text" placeholder="Nome do profissional" value={resProfissional} onChange={e => setResProfissional(e.target.value)} /></div>
                <div className="form-grupo full"><label>Laudo / Observações</label><textarea rows={3} placeholder="Laudo completo do exame..." value={resLaudo} onChange={e => setResLaudo(e.target.value)}></textarea></div>
              </div>
              {isImagemRes && (
                <div style={{marginTop:'15px'}}>
                  <div className="form-grupo"><label>Anexar Imagem (Raio-X, Tomografia, etc.)</label><input type="file" accept="image/*" onChange={handleImageUpload} /></div>
                  {resImagem && <div className="imagem-preview"><img src={resImagem} alt="Preview" /></div>}
                </div>
              )}
              <button className="btn btn-primary" onClick={lancarResultado} style={{width:'100%', marginTop:'15px', justifyContent:'center', padding:'14px'}}><i className="las la-save"></i> Lançar Resultado</button>
            </div>
            
            <div style={{marginTop:'25px'}}>
              {resultadosRecentes.length === 0 ? (
                <p style={{color:'#94a3b8', textAlign:'center', padding:'20px'}}>Nenhum resultado lançado.</p>
              ) : (
                <>
                  <h3 style={{color:'#0a1f44', marginBottom:'15px'}}><i className="las la-history"></i> Resultados Recentes</h3>
                  {resultadosRecentes.map(e => (
                    <div key={e.id} className={`resultado-card ${e.status === 'Alterado/Crítico' ? 'critico' : (e.status === 'Alterado' ? 'alterado' : '')}`}>
                      <div className="resultado-header">
                        <strong>{e.paciente} - {e.exame}</strong>
                        <span className={`badge ${e.tipo === 'laboratorio' ? 'badge-laboratorio' : 'badge-imagem'}`}>{e.tipo === 'laboratorio' ? '🔬 Lab' : '🩻 Imagem'}</span>
                      </div>
                      <div className="resultado-valor">{e.resultado} {e.referencia && <small style={{fontSize:'12px', color:'#94a3b8'}}>(Ref: {e.referencia})</small>}</div>
                      <small style={{color:'#94a3b8'}}>{new Date(e.dataResultado || e.dataSolicitacao).toLocaleString('pt-BR')} | Liberado por: {e.profissionalLiberador || '-'}</small>
                      <div style={{marginTop:'8px', display:'flex', gap:'8px', flexWrap:'wrap'}}>
                        <button className="btn btn-xs btn-info" onClick={() => setModalLaudoData({exame: e, tipo: 'laudo'})}><i className="las la-file-alt"></i> Ver Laudo</button>
                        {e.imagem && <button className="btn btn-xs btn-primary" onClick={() => setModalLaudoData({exame: e, tipo: 'imagem'})}><i className="las la-image"></i> Ver Imagem</button>}
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
                  <p><strong>Paciente:</strong> {modalLaudoData.exame.paciente}</p>
                  <p><strong>Exame:</strong> {modalLaudoData.exame.exame}</p>
                  <p><strong>Tipo:</strong> {modalLaudoData.exame.tipo === 'laboratorio' ? '🔬 Laboratorial' : '🩻 Imagem'}</p>
                  <p><strong>Solicitante:</strong> {modalLaudoData.exame.medico}</p>
                  <p><strong>Data Solicitação:</strong> {new Date(modalLaudoData.exame.dataSolicitacao).toLocaleString('pt-BR')}</p>
                </div>
                <div style={{background:'#f8fafc', borderRadius:'12px', padding:'20px', marginBottom:'15px'}}>
                  <h4 style={{marginBottom:'10px'}}>Resultado</h4>
                  <p style={{fontSize:'18px', fontWeight:700, color: modalLaudoData.exame.status === 'Alterado/Crítico' ? '#dc2626' : '#16a34a'}}>{modalLaudoData.exame.resultado || 'Aguardando'}</p>
                  {modalLaudoData.exame.referencia && <p style={{color:'#94a3b8', fontSize:'13px'}}>Valor de referência: {modalLaudoData.exame.referencia}</p>}
                </div>
                {modalLaudoData.exame.laudo && (
                  <div style={{marginBottom:'15px'}}>
                    <h4>Laudo</h4>
                    <p style={{color:'#334155', lineHeight:1.6}}>{modalLaudoData.exame.laudo}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3><i className="las la-image"></i> Imagem - {modalLaudoData.exame.exame}</h3>
                <p style={{marginBottom:'15px'}}><strong>Paciente:</strong> {modalLaudoData.exame.paciente}</p>
                <div style={{textAlign:'center'}}>
                  <img src={modalLaudoData.exame.imagem || ''} alt="Imagem do exame" style={{maxWidth:'100%', maxHeight:'60vh', borderRadius:'10px'}} />
                </div>
              </>
            )}
            <button className="btn btn-danger" onClick={() => setModalLaudoData(null)} style={{width:'100%', marginTop:'15px'}}>Fechar</button>
          </div>
        </div>
      )}

    </div>
  );
}
