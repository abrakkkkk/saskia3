'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import './ccih.css';

// ── tipos ──────────────────────────────────────────────
type StatusIRAS = 'Ativa' | 'Tratada';
type Gravidade  = 'Leve' | 'Moderada' | 'Grave' | 'Sepse' | 'Choque Séptico';
type Tab = 'notificacao' | 'iras' | 'culturas' | 'higienemaos' | 'antimicrobianos' | 'relatorio';

interface IRAS {
  id: number; paciente: string; tipo: string; data: string;
  local: string; gravidade: Gravidade; material: string;
  microorganismo: string; antibiotico: string; obs: string;
  status: StatusIRAS; dataNotificacao: string; notificadoPor: string;
  dataTratamento?: string;
}
interface Cultura {
  id: number; paciente: string; material: string; microorganismo: string;
  antibiotico: string; sensibilidade: string; status: string; data: string;
}
interface HMObs {
  id: number; data: string; setor: string; categoria: string;
  momento: string; realizou: 'Sim' | 'Não';
}
interface ATM {
  id: number; paciente: string; nome: string; dose: string;
  via: string; frequencia: string; inicio: string;
  duracao: string; indicacao: string; status: string;
}

// ── API helpers ────────────────────────────────────────
async function loadFromAPI(tipo: string): Promise<any[]> {
  const res = await fetch(`/api/ccih?tipo=${tipo}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os registros de CCIH.');
  if (!Array.isArray(data)) throw new Error('Resposta de CCIH inválida.');
  return data.map((r: any) => {
    const isTratado = r.status === 'TRATADO' || r.status === 'Tratada' || r.dados?.status === 'Tratada';
    return { ...r.dados, id: r.id, _registroId: r.id, status: isTratado ? 'Tratada' : (r.dados?.status || 'Ativa') };
  });
}
async function saveToAPI(tipo: string, item: any): Promise<any> {
  const res = await fetch('/api/ccih', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo,
      subtipo: item.tipo || item.momento || null,
      descricao: item.paciente || item.setor || item.nome || '',
      dados: item,
      data: item.data || item.dataNotificacao || new Date().toISOString(),
      status: item.status === 'Tratada' ? 'TRATADO' : 'ATIVO'
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível registrar o evento de CCIH.');
  return data;
}
async function updateAPIStatus(id: string, status: string, dados?: any): Promise<void> {
  const res = await fetch(`/api/ccih/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...(dados ? { dados } : {}) })
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Não foi possível atualizar o evento de CCIH.');
}

const HOJE = () => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};
const parseDataLocal = (valor: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return new Date(`${valor}T00:00:00`);
  return new Date(valor);
};
const fmtData = (d: string) => { try { return parseDataLocal(d).toLocaleDateString('pt-BR'); } catch { return d; } };
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── componente principal ───────────────────────────────
export default function CcihPage() {
  const { data: session } = useSession();
  const hospitalId = (session?.user as any)?.hospitalId || '';
  const nomeUsuario = session?.user?.name || '';

  // carregar dados
  const reloadAll = async () => {
    const [irasData, culturasData, hmData, atmData] = await Promise.all([
      loadFromAPI('IRAS'),
      loadFromAPI('CULTURA'),
      loadFromAPI('HM'),
      loadFromAPI('ATM')
    ]);
    setIras(irasData);
    setCulturas(culturasData);
    setHmObs(hmData);
    setAntimicrobianos(atmData);
    setErroCarga('');
  };

  const [tab, setTab] = useState<Tab>('notificacao');

  // dados
  const [iras,           setIras]           = useState<IRAS[]>([]);
  const [culturas,       setCulturas]       = useState<Cultura[]>([]);
  const [hmObs,          setHmObs]          = useState<HMObs[]>([]);
  const [antimicrobianos,setAntimicrobianos] = useState<ATM[]>([]);

  // form notificação
  const [fPaciente, setFPaciente] = useState('');
  const [fTipo,     setFTipo]     = useState('');
  const [fData,     setFData]     = useState(HOJE());
  const [fLocal,    setFLocal]    = useState('Hospitalar - UTI');
  const [fGrav,     setFGrav]     = useState<Gravidade>('Moderada');
  const [fMaterial, setFMaterial] = useState('Não coletado');
  const [fMicro,    setFMicro]    = useState('');
  const [fAtb,      setFAtb]      = useState('');
  const [fObs,      setFObs]      = useState('');

  // form higiene mãos
  const [hmSetor,     setHmSetor]     = useState('UTI');
  const [hmCategoria, setHmCategoria] = useState('Médico');
  const [hmMomento,   setHmMomento]   = useState('Antes do contato com paciente');
  const [hmRealizou,  setHmRealizou]  = useState<'Sim'|'Não'>('Sim');

  // form ATM
  const [atmPaciente,   setAtmPaciente]   = useState('');
  const [atmNome,       setAtmNome]       = useState('');
  const [atmDose,       setAtmDose]       = useState('');
  const [atmVia,        setAtmVia]        = useState('IV');
  const [atmFreq,       setAtmFreq]       = useState('');
  const [atmInicio,     setAtmInicio]     = useState(HOJE());
  const [atmDuracao,    setAtmDuracao]    = useState('7');
  const [atmIndicacao,  setAtmIndicacao]  = useState('Empírica');

  // filtros IRAS
  const [buscarIRAS,     setBuscarIRAS]     = useState('');
  const [filtroGravidade,setFiltroGravidade] = useState('todos');

  // relatório
  const [relMes, setRelMes] = useState(new Date().getMonth() + 1);
  const [relAno, setRelAno] = useState(new Date().getFullYear());

  // feedback
  const [aviso, setAviso] = useState('');
  const [erroCarga, setErroCarga] = useState('');
  const [irasDetalhe, setIrasDetalhe] = useState<IRAS | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // pacientes para selects (via API)
  const [pacientes, setPacientes] = useState<{id:string; nome:string}[]>([]);
  const [erroPacientes, setErroPacientes] = useState('');

  useEffect(() => {
    if (!hospitalId) return;
    reloadAll().catch(error => setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar os dados de CCIH.'));
    // buscar pacientes
    fetch('/api/pacientes?limit=200')
      .then(async r => {
        if (!r.ok) throw new Error('Não foi possível carregar a lista de pacientes.');
        return r.json();
      })
      .then(d => {
        const lista = Array.isArray(d) ? d : d?.pacientes;
        if (!Array.isArray(lista)) throw new Error('Resposta da lista de pacientes inválida.');
        setPacientes(lista.map((p: any) => ({ id: p.id, nome: p.nome })));
        setErroPacientes('');
      })
      .catch(error => setErroPacientes(error instanceof Error ? error.message : 'Não foi possível carregar a lista de pacientes.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  const msg = (texto: string) => { setAviso(texto); setTimeout(() => setAviso(''), 3000); };

  // ── indicadores ─────────────────────────────────────
  const irasAtivas   = iras.filter(i => i.status === 'Ativa').length;
  const irasTratadas = iras.filter(i => i.status === 'Tratada').length;
  const totalHM      = hmObs.length;
  const simHM        = hmObs.filter(o => o.realizou === 'Sim').length;
  const taxaHM       = totalHM > 0 ? Math.round((simHM / totalHM) * 100) : 0;
  const atmEmUso     = antimicrobianos.filter(a => a.status === 'Em uso').length;
  const taxaInfec    = pacientes.length > 0 ? Math.round((irasAtivas / pacientes.length) * 100) : 0;

  const notificarIRAS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fPaciente || !fTipo) { msg('Preencha paciente e tipo!'); return; }
    const nova: any = {
      paciente: fPaciente, tipo: fTipo, data: fData,
      local: fLocal, gravidade: fGrav, material: fMaterial,
      microorganismo: fMicro, antibiotico: fAtb, obs: fObs,
      status: 'Ativa', dataNotificacao: new Date().toISOString(), notificadoPor: nomeUsuario,
    };
    setIsSaving(true);
    setErroCarga('');
    try {
      await saveToAPI('IRAS', nova);

      if (fMaterial !== 'Não coletado') {
        const novaCultura: any = {
          paciente: fPaciente, material: fMaterial,
          microorganismo: fMicro, antibiotico: fAtb,
          sensibilidade: 'Aguardando', status: 'Pendente', data: fData,
        };
        await saveToAPI('CULTURA', novaCultura);
      }
      await reloadAll();
      setFPaciente(''); setFTipo(''); setFMicro(''); setFAtb(''); setFObs(''); setFData(HOJE());
      msg('IRAS notificada com sucesso!');
      setTab('iras');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível notificar a IRAS.');
    } finally {
      setIsSaving(false);
    }
  };

  const tratarIRAS = async (id: number | string) => {
    setIsSaving(true);
    setErroCarga('');
    try {
      await updateAPIStatus(String(id), 'TRATADO', { status: 'Tratada', dataTratamento: new Date().toISOString() });
      await reloadAll();
      msg('IRAS marcada como tratada com sucesso!');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível atualizar a IRAS.');
    } finally {
      setIsSaving(false);
    }
  };

  const registrarHM = async (e: React.FormEvent) => {
    e.preventDefault();
    const nova: any = { data: new Date().toISOString(), setor: hmSetor, categoria: hmCategoria, momento: hmMomento, realizou: hmRealizou };
    setIsSaving(true);
    setErroCarga('');
    try {
      await saveToAPI('HM', nova);
      await reloadAll();
      msg('Observação registrada!');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível registrar a observação.');
    } finally {
      setIsSaving(false);
    }
  };

  const prescreverATM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atmPaciente || !atmNome) { msg('Preencha paciente e antimicrobiano!'); return; }
    const novo: any = { paciente: atmPaciente, nome: atmNome, dose: atmDose, via: atmVia, frequencia: atmFreq, inicio: atmInicio, duracao: atmDuracao, indicacao: atmIndicacao, status: 'Em uso' };
    setIsSaving(true);
    setErroCarga('');
    try {
      await saveToAPI('ATM', novo);
      await reloadAll();
      setAtmNome(''); setAtmDose(''); setAtmFreq('');
      msg('Antimicrobiano prescrito!');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível registrar o antimicrobiano.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── IRAS filtradas ───────────────────────────────────
  const irasFiltradas = useMemo(() => {
    let l = [...iras].reverse();
    if (filtroGravidade !== 'todos') l = l.filter(i => i.gravidade === filtroGravidade);
    if (buscarIRAS) { const q = buscarIRAS.toLowerCase(); l = l.filter(i => i.paciente.toLowerCase().includes(q) || i.tipo.toLowerCase().includes(q) || i.microorganismo.toLowerCase().includes(q)); }
    return l;
  }, [iras, filtroGravidade, buscarIRAS]);

  // ── relatório ────────────────────────────────────────
  const irasMes     = iras.filter(i => { const d = parseDataLocal(i.data); return d.getMonth() + 1 === relMes && d.getFullYear() === relAno; });
  const culturasMes = culturas.filter(c => { const d = parseDataLocal(c.data); return d.getMonth() + 1 === relMes && d.getFullYear() === relAno; });
  const atmMes      = antimicrobianos.filter(a => { const d = parseDataLocal(a.inicio); return d.getMonth() + 1 === relMes && d.getFullYear() === relAno; });
  const tiposIRAS   = [...new Set(irasMes.map(i => i.tipo))];

  const badgeGrav = (g: string) => g === 'Choque Séptico' || g === 'Sepse' ? 'badge-danger' : g === 'Grave' ? 'badge-warning' : 'badge-info';
  const badgeAtm  = (ind: string) => ind === 'Empírica' ? 'badge-warning' : ind === 'Profilática' ? 'badge-info' : 'badge-success';
  const badgeSens = (s: string) => s === 'Sensível' ? 'badge-success' : s === 'Resistente' ? 'badge-danger' : 'badge-warning';

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'notificacao',    label: 'Notificação',      icon: 'la-plus-circle' },
    { key: 'iras',           label: 'IRAS Ativas',      icon: 'la-biohazard' },
    { key: 'culturas',       label: 'Culturas',         icon: 'la-flask' },
    { key: 'higienemaos',    label: 'Higiene de Mãos',  icon: 'la-hand-sparkles' },
    { key: 'antimicrobianos',label: 'Antimicrobianos',  icon: 'la-capsules' },
    { key: 'relatorio',      label: 'Relatório',        icon: 'la-chart-bar' },
  ];

  return (
    <div className="ccih-container">

      {/* BANNER */}
      <div className="banner-ccih">
        <div>
          <h1><i className="las la-shield-virus"></i> CCIH — Controle de Infecção Hospitalar</h1>
          <p>Monitoramento, notificação e prevenção de Infecções Relacionadas à Assistência à Saúde (IRAS)</p>
        </div>
        <button className="btn btn-success" onClick={() => setTab('notificacao')}>
          <i className="las la-plus-circle"></i> Notificar IRAS
        </button>
      </div>

      {/* AVISO */}
      {aviso && (
        <div style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:12, padding:'12px 18px', marginBottom:20, color:'#15803d', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
          <i className="las la-check-circle"></i> {aviso}
        </div>
      )}
      {erroCarga && (
        <div role="alert" style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 18px', marginBottom:20, color:'#b91c1c', fontWeight:600 }}>
          <i className="las la-exclamation-circle" aria-hidden="true"></i> {erroCarga}
        </div>
      )}
      {erroPacientes && (
        <div role="alert" style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12, padding:'12px 18px', marginBottom:20, color:'#9a3412', fontWeight:600 }}>
          <i className="las la-exclamation-triangle" aria-hidden="true"></i> {erroPacientes} Os campos de paciente podem ficar indisponíveis até que a lista seja carregada.
        </div>
      )}

      {/* INDICADORES */}
      <div className="indicadores-grid">
        <div className="ind-card alerta">
          <div className="ind-icon"><i className="las la-biohazard"></i></div>
          <div className="ind-valor">{irasAtivas}</div>
          <div className="ind-label">IRAS Ativas</div>
        </div>
        <div className="ind-card">
          <div className="ind-icon"><i className="las la-flask"></i></div>
          <div className="ind-valor">{culturas.length}</div>
          <div className="ind-label">Culturas Solic.</div>
        </div>
        <div className="ind-card">
          <div className="ind-icon"><i className="las la-percent"></i></div>
          <div className="ind-valor">{taxaInfec}%</div>
          <div className="ind-label">Taxa de Infecção</div>
        </div>
        <div className="ind-card">
          <div className="ind-icon"><i className="las la-hand-sparkles"></i></div>
          <div className="ind-valor">{totalHM > 0 ? `${taxaHM}%` : 'N/A'}</div>
          <div className="ind-label">Adesão Hig. Mãos</div>
        </div>
        <div className="ind-card">
          <div className="ind-icon"><i className="las la-syringe"></i></div>
          <div className="ind-valor">{atmEmUso}</div>
          <div className="ind-label">Antimicrobianos</div>
        </div>
        <div className="ind-card bom">
          <div className="ind-icon"><i className="las la-check-circle"></i></div>
          <div className="ind-valor">{irasTratadas}</div>
          <div className="ind-label">IRAS Tratadas</div>
        </div>
      </div>

      {/* TABS */}
      <div className="tabs-ccih">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'ativo' : ''}`} onClick={() => setTab(t.key)}>
            <i className={`las ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA: NOTIFICAÇÃO ── */}
      {tab === 'notificacao' && (
        <div className="form-panel">
          <h3><i className="las la-biohazard"></i> Notificar Nova IRAS</h3>
          <form onSubmit={notificarIRAS}>
            <div className="form-grid">
              <div className="form-grupo">
                <label htmlFor="ccih-paciente">Paciente *</label>
                <select id="ccih-paciente" value={fPaciente} onChange={e => setFPaciente(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="ccih-tipo">Tipo de IRAS *</label>
                <select id="ccih-tipo" value={fTipo} onChange={e => setFTipo(e.target.value)} required>
                  <option value="">Selecione...</option>
                  <option>Pneumonia Associada à Ventilação Mecânica (PAV)</option>
                  <option>Infecção do Trato Urinário (ITU)</option>
                  <option>Infecção de Corrente Sanguínea (ICS)</option>
                  <option>Infecção de Sítio Cirúrgico (ISC)</option>
                  <option>Infecção por Clostridium difficile</option>
                  <option>Infecção por MRSA</option>
                  <option>Infecção por VRE</option>
                  <option>Infecção por KPC</option>
                  <option>Infecção por Acinetobacter</option>
                  <option>Infecção por Pseudomonas</option>
                  <option>Sepse</option>
                  <option>Outra IRAS</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="ccih-data">Data do Diagnóstico *</label>
                <input id="ccih-data" type="date" value={fData} onChange={e => setFData(e.target.value)} required />
              </div>
              <div className="form-grupo">
                <label htmlFor="ccih-local">Local de Aquisição</label>
                <select id="ccih-local" value={fLocal} onChange={e => setFLocal(e.target.value)}>
                  <option>Hospitalar - UTI</option>
                  <option>Hospitalar - Enfermaria</option>
                  <option>Hospitalar - Centro Cirúrgico</option>
                  <option>Comunitária</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="ccih-gravidade">Gravidade</label>
                <select id="ccih-gravidade" value={fGrav} onChange={e => setFGrav(e.target.value as Gravidade)}>
                  <option>Leve</option><option>Moderada</option><option>Grave</option><option>Sepse</option><option>Choque Séptico</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="ccih-material">Material Biológico Coletado</label>
                <select id="ccih-material" value={fMaterial} onChange={e => setFMaterial(e.target.value)}>
                  <option>Não coletado</option>
                  <option>Sangue (Hemocultura)</option>
                  <option>Urina (Urocultura)</option>
                  <option>Secreção Traqueal</option>
                  <option>Ponta de Cateter</option>
                  <option>Líquor</option>
                  <option>Outro</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="ccih-microrganismo">Microrganismo Identificado</label>
                <input id="ccih-microrganismo" type="text" value={fMicro} onChange={e => setFMicro(e.target.value)} placeholder="Ex: Staphylococcus aureus MRSA" />
              </div>
              <div className="form-grupo">
                <label htmlFor="ccih-antibiotico">Antibiótico Iniciado</label>
                <input id="ccih-antibiotico" type="text" value={fAtb} onChange={e => setFAtb(e.target.value)} placeholder="Ex: Vancomicina 1g IV 12/12h" />
              </div>
              <div className="form-grupo full">
                <label htmlFor="ccih-observacoes">Observações</label>
                <textarea id="ccih-observacoes" rows={2} value={fObs} onChange={e => setFObs(e.target.value)} />
              </div>
            </div>
          <button type="submit" className="btn btn-success" disabled={isSaving} style={{ width:'100%', marginTop:15, justifyContent:'center', padding:14 }}>
              <i className="las la-save"></i> {isSaving ? 'Salvando...' : 'Notificar IRAS'}
            </button>
          </form>
        </div>
      )}

      {/* ── ABA: IRAS ATIVAS ── */}
      {tab === 'iras' && (
        <>
          <div className="search-box">
            <input type="text" aria-label="Buscar IRAS por paciente, tipo ou microrganismo" value={buscarIRAS} onChange={e => setBuscarIRAS(e.target.value)} placeholder="Buscar por paciente, tipo ou microrganismo..." />
            <select aria-label="Filtrar IRAS por gravidade" value={filtroGravidade} onChange={e => setFiltroGravidade(e.target.value)}>
              <option value="todos">Todas Gravidades</option>
              <option>Leve</option><option>Moderada</option><option>Grave</option><option>Sepse</option><option>Choque Séptico</option>
            </select>
          </div>
          <div className="iras-grid">
            {irasFiltradas.length === 0 ? (
              <p style={{ textAlign:'center', color:'#94a3b8', padding:30, gridColumn:'1/-1' }}>Nenhuma IRAS encontrada</p>
            ) : irasFiltradas.map(i => (
              <div key={i.id} className={`ira-card ${i.status === 'Ativa' ? 'ativo' : 'tratado'}`}>
                <div className="ira-header">
                  <span className="ira-paciente">{i.paciente}</span>
                  <span className={`badge ${badgeGrav(i.gravidade)}`}>{i.gravidade}</span>
                </div>
                <p className="ira-info"><i className="las la-biohazard"></i> <strong>{i.tipo}</strong></p>
                <p className="ira-info"><i className="las la-map-marker"></i> {i.local} &nbsp;|&nbsp; <i className="las la-calendar"></i> {fmtData(i.data)}</p>
                {i.microorganismo && <p className="ira-info"><i className="las la-microscope"></i> {i.microorganismo}</p>}
                {i.antibiotico    && <p className="ira-info"><i className="las la-capsules"></i> {i.antibiotico}</p>}
                <div className="ira-acoes">
                  <span className={`badge ${i.status === 'Ativa' ? 'badge-danger' : 'badge-success'}`}>{i.status}</span>
                  {i.status === 'Ativa' && (
                    <button className="btn btn-sm btn-success" disabled={isSaving} onClick={() => tratarIRAS(i.id)}>
                      <i className="las la-check"></i> Tratar
                    </button>
                  )}
                  <button className="btn btn-sm btn-info" aria-label={`Ver detalhes da IRAS de ${i.paciente}`} onClick={() => setIrasDetalhe(i)}>
                    <i className="las la-eye"></i>
                  </button>
                  <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>Por: {i.notificadoPor}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── ABA: CULTURAS ── */}
      {tab === 'culturas' && (
        <div style={{ background:'white', borderRadius:20, overflowX:'auto', boxShadow:'0 4px 15px rgba(0,0,0,0.06)' }}>
          <table className="tabela-ccih">
            <thead>
              <tr><th>Data</th><th>Paciente</th><th>Material</th><th>Microrganismo</th><th>Antibiótico</th><th>Sensibilidade</th><th>Status</th></tr>
            </thead>
            <tbody>
              {culturas.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>Nenhuma cultura registrada</td></tr>
              ) : [...culturas].reverse().map(c => (
                <tr key={c.id}>
                  <td>{fmtData(c.data)}</td>
                  <td>{c.paciente}</td>
                  <td>{c.material}</td>
                  <td>{c.microorganismo || '-'}</td>
                  <td>{c.antibiotico || '-'}</td>
                  <td><span className={`badge ${badgeSens(c.sensibilidade)}`}>{c.sensibilidade}</span></td>
                  <td><span className={`badge ${c.status === 'Concluído' ? 'badge-success' : 'badge-purple'}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ABA: HIGIENE DE MÃOS ── */}
      {tab === 'higienemaos' && (
        <>
          <div className="form-panel">
            <h3><i className="las la-hand-sparkles"></i> Auditoria de Higiene de Mãos</h3>
            <form onSubmit={registrarHM}>
              <div className="form-grid">
                <div className="form-grupo">
                  <label htmlFor="ccih-hm-setor">Setor *</label>
                  <select id="ccih-hm-setor" value={hmSetor} onChange={e => setHmSetor(e.target.value)}>
                    <option>UTI</option><option>Enfermaria</option><option>Emergência</option><option>Centro Cirúrgico</option><option>Ambulatório</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-hm-categoria">Categoria Profissional</label>
                  <select id="ccih-hm-categoria" value={hmCategoria} onChange={e => setHmCategoria(e.target.value)}>
                    <option>Médico</option><option>Enfermeiro</option><option>Técnico de Enfermagem</option><option>Fisioterapeuta</option><option>Outro</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-hm-momento">Momento da Observação</label>
                  <select id="ccih-hm-momento" value={hmMomento} onChange={e => setHmMomento(e.target.value)}>
                    <option>Antes do contato com paciente</option>
                    <option>Antes de procedimento asséptico</option>
                    <option>Após risco de exposição a fluidos</option>
                    <option>Após contato com paciente</option>
                    <option>Após contato com superfícies próximas</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-hm-realizou">Realizou Higiene?</label>
                  <select id="ccih-hm-realizou" value={hmRealizou} onChange={e => setHmRealizou(e.target.value as 'Sim'|'Não')}>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ width:'100%', marginTop:15, justifyContent:'center', padding:14 }}>
                <i className="las la-save"></i> {isSaving ? 'Salvando...' : 'Registrar Observação'}
              </button>
            </form>
          </div>
          {/* Resumo de adesão */}
          <div style={{ background:'white', borderRadius:16, padding:28, textAlign:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>
            <h4 style={{ color:'#0a1f44', marginBottom:12 }}>Resumo de Adesão — OMS 5 Momentos</h4>
            <div style={{ fontSize:56, fontWeight:800, color: taxaHM >= 70 ? '#16a34a' : '#dc2626' }}>{totalHM > 0 ? `${taxaHM}%` : 'N/A'}</div>
            <p style={{ color:'#64748b', marginTop:8 }}>{simHM} de {totalHM} observações com higiene adequada</p>
            <small style={{ color:'#94a3b8' }}>Meta: ≥ 70% | OMS</small>
          </div>
        </>
      )}

      {/* ── ABA: ANTIMICROBIANOS ── */}
      {tab === 'antimicrobianos' && (
        <>
          <div className="form-panel">
            <h3><i className="las la-capsules"></i> Controle de Antimicrobianos</h3>
            <form onSubmit={prescreverATM}>
              <div className="form-grid">
                <div className="form-grupo">
                  <label htmlFor="ccih-atm-paciente">Paciente *</label>
                  <select id="ccih-atm-paciente" value={atmPaciente} onChange={e => setAtmPaciente(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-atm-nome">Antimicrobiano *</label>
                  <input id="ccih-atm-nome" type="text" value={atmNome} onChange={e => setAtmNome(e.target.value)} placeholder="Nome do antimicrobiano" required />
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-atm-dose">Dose</label>
                  <input id="ccih-atm-dose" type="text" value={atmDose} onChange={e => setAtmDose(e.target.value)} placeholder="Ex: 1g" />
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-atm-via">Via</label>
                  <select id="ccih-atm-via" value={atmVia} onChange={e => setAtmVia(e.target.value)}>
                    <option>IV</option><option>IM</option><option>Oral</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-atm-frequencia">Frequência</label>
                  <input id="ccih-atm-frequencia" type="text" value={atmFreq} onChange={e => setAtmFreq(e.target.value)} placeholder="Ex: 12/12h" />
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-atm-inicio">Data Início</label>
                  <input id="ccih-atm-inicio" type="date" value={atmInicio} onChange={e => setAtmInicio(e.target.value)} />
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-atm-duracao">Duração Prevista (dias)</label>
                  <input id="ccih-atm-duracao" type="number" value={atmDuracao} onChange={e => setAtmDuracao(e.target.value)} min="1" />
                </div>
                <div className="form-grupo">
                  <label htmlFor="ccih-atm-indicacao">Indicação</label>
                  <select id="ccih-atm-indicacao" value={atmIndicacao} onChange={e => setAtmIndicacao(e.target.value)}>
                    <option>Empírica</option><option>Profilática</option><option>Terapêutica (com cultura)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-warning" disabled={isSaving} style={{ width:'100%', marginTop:15, justifyContent:'center', padding:14 }}>
                <i className="las la-save"></i> {isSaving ? 'Salvando...' : 'Prescrever Antimicrobiano'}
              </button>
            </form>
          </div>
          <div style={{ background:'white', borderRadius:20, overflowX:'auto', boxShadow:'0 4px 15px rgba(0,0,0,0.06)' }}>
            <table className="tabela-ccih">
              <thead>
                <tr><th>Paciente</th><th>Antimicrobiano</th><th>Dose/Via</th><th>Início</th><th>Duração</th><th>Indicação</th><th>Status</th></tr>
              </thead>
              <tbody>
                {antimicrobianos.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>Nenhum antimicrobiano prescrito</td></tr>
                ) : [...antimicrobianos].reverse().map(a => (
                  <tr key={a.id}>
                    <td>{a.paciente}</td>
                    <td><strong>{a.nome}</strong><br /><small style={{ color:'#94a3b8' }}>{a.frequencia}</small></td>
                    <td>{a.dose} {a.via}</td>
                    <td>{fmtData(a.inicio)}</td>
                    <td>{a.duracao} dias</td>
                    <td><span className={`badge ${badgeAtm(a.indicacao)}`}>{a.indicacao}</span></td>
                    <td><span className="badge badge-info">{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── ABA: RELATÓRIO ── */}
      {tab === 'relatorio' && (
        <>
          <div className="form-panel">
            <h3><i className="las la-chart-bar"></i> Relatório Mensal CCIH</h3>
            <div className="form-grid">
              <div className="form-grupo">
                <label htmlFor="ccih-rel-mes">Mês</label>
                <select id="ccih-rel-mes" value={relMes} onChange={e => setRelMes(Number(e.target.value))}>
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="ccih-rel-ano">Ano</label>
                <input id="ccih-rel-ano" type="number" value={relAno} onChange={e => setRelAno(Number(e.target.value))} min={2020} max={2030} />
              </div>
            </div>
          </div>

          <div style={{ background:'white', borderRadius:20, padding:30, boxShadow:'0 4px 15px rgba(0,0,0,0.06)' }}>
            <h3 style={{ color:'#0a1f44', marginBottom:20 }}>
              <i className="las la-chart-bar"></i> Relatório CCIH — {MESES[relMes - 1]} de {relAno}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:15, marginBottom:24 }}>
              {[
                { label:'IRAS Notificadas', val: irasMes.length,                                                         cor:'#dc2626' },
                { label:'IRAS Ativas',      val: irasMes.filter(i=>i.status==='Ativa').length,                           cor:'#f59e0b' },
                { label:'IRAS Tratadas',    val: irasMes.filter(i=>i.status==='Tratada').length,                         cor:'#16a34a' },
                { label:'Sepse/Choque',     val: irasMes.filter(i=>i.gravidade==='Sepse'||i.gravidade==='Choque Séptico').length, cor:'#b91c1c' },
                { label:'Culturas',         val: culturasMes.length,                                                     cor:'#0a1f44' },
                { label:'Antimicrobianos',  val: atmMes.length,                                                          cor:'#7c3aed' },
              ].map(c => (
                <div key={c.label} style={{ textAlign:'center', padding:16, background:'#f8fafc', borderRadius:12 }}>
                  <div style={{ fontSize:28, fontWeight:800, color:c.cor }}>{c.val}</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{c.label}</div>
                </div>
              ))}
            </div>
            {tiposIRAS.length > 0 && (
              <div>
                <h4 style={{ color:'#0a1f44', marginBottom:12 }}>IRAS por Tipo:</h4>
                {tiposIRAS.map(tipo => (
                  <p key={tipo} style={{ padding:'6px 0', borderBottom:'1px solid #f1f5f9', fontSize:14, color:'#334155' }}>
                    • <strong>{tipo}:</strong> {irasMes.filter(i => i.tipo === tipo).length} caso(s)
                  </p>
                ))}
              </div>
            )}
            <button className="btn btn-warning" onClick={() => window.print()} style={{ marginTop:20 }}>
              <i className="las la-print"></i> Imprimir
            </button>
          </div>
        </>
      )}

      {/* ── MODAL: DETALHES IRAS ── */}
      {irasDetalhe && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setIrasDetalhe(null)}
        >
          <div
            style={{ background:'white', borderRadius:20, padding:30, maxWidth:520, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', position:'relative', maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <button aria-label="Fechar detalhes da IRAS" onClick={() => setIrasDetalhe(null)} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94a3b8' }}>
              <i className="las la-times"></i>
            </button>
            <h3 style={{ color:'#0a1f44', marginBottom:18, display:'flex', alignItems:'center', gap:10 }}>
              <i className="las la-biohazard"></i> Detalhes da IRAS
            </h3>
            <div style={{ display:'grid', gap:12 }}>
              {[
                { label: 'Paciente',       valor: irasDetalhe.paciente },
                { label: 'Tipo',            valor: irasDetalhe.tipo },
                { label: 'Data',            valor: fmtData(irasDetalhe.data) },
                { label: 'Local',           valor: irasDetalhe.local },
                { label: 'Gravidade',       valor: irasDetalhe.gravidade },
                { label: 'Material',        valor: irasDetalhe.material },
                { label: 'Microrganismo',   valor: irasDetalhe.microorganismo || 'N/I' },
                { label: 'Antibiótico',     valor: irasDetalhe.antibiotico || 'N/I' },
                { label: 'Status',          valor: irasDetalhe.status },
                { label: 'Notificado por',  valor: irasDetalhe.notificadoPor },
                { label: 'Observações',     valor: irasDetalhe.obs || '—' },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', gap:10, borderBottom:'1px solid #f1f5f9', paddingBottom:8 }}>
                  <span style={{ fontWeight:700, fontSize:13, color:'#475569', minWidth:120 }}>{r.label}:</span>
                  <span style={{ fontSize:13, color:'#334155' }}>{r.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
