'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import { pode } from '@/lib/permissions';
import { Modal } from '../setores-ui';
import '@/components/ui/modulo.css';
import '../setores.css';
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
type Item = Record<string, unknown>;
async function loadFromAPI<T>(tipo: string): Promise<T[]> {
  const res = await fetch(`/api/ccih?tipo=${tipo}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os registros de CCIH.');
  if (!Array.isArray(data)) throw new Error('Resposta de CCIH inválida.');
  return data.map((r: { id: string; status?: string; dados?: Item }) => {
    const isTratado = r.status === 'TRATADO' || r.status === 'Tratada' || r.dados?.status === 'Tratada';
    return { ...r.dados, id: r.id, _registroId: r.id, status: isTratado ? 'Tratada' : (r.dados?.status || 'Ativa') } as T;
  });
}
async function saveToAPI(tipo: string, item: Item): Promise<unknown> {
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
async function updateAPIStatus(id: string, status: string, dados?: Item): Promise<void> {
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

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'notificacao',    label: 'Notificação',      icon: 'las la-plus-circle' },
  { id: 'iras',           label: 'IRAS',             icon: 'las la-biohazard' },
  { id: 'culturas',       label: 'Culturas',         icon: 'las la-flask' },
  { id: 'higienemaos',    label: 'Higiene de mãos',  icon: 'las la-hand-sparkles' },
  { id: 'antimicrobianos',label: 'Antimicrobianos',  icon: 'las la-capsules' },
  { id: 'relatorio',      label: 'Relatório',        icon: 'las la-chart-bar' },
];

const tomGravidade = (g: string): Tone => g === 'Choque Séptico' || g === 'Sepse' ? 'danger' : g === 'Grave' ? 'warning' : 'info';
const tomAntimicrobiano = (ind: string): Tone => ind === 'Empírica' ? 'warning' : ind === 'Profilática' ? 'info' : 'success';
const tomSensibilidade = (s: string): Tone => s === 'Sensível' ? 'success' : s === 'Resistente' ? 'danger' : 'warning';

// ── componente principal ───────────────────────────────
export default function CcihPage() {
  const { data: session } = useSession();
  const hospitalId = session?.user?.hospitalId || '';
  const podeGerir = pode(session?.user?.cargo, 'ccih:gerir');
  const nomeUsuario = session?.user?.name || '';

  const [tabEscolhida, setTab] = useState<Tab>('notificacao');
  const tab: Tab = !podeGerir && tabEscolhida === 'notificacao' ? 'iras' : tabEscolhida;

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

  // carregar dados
  const reloadAll = useCallback(async () => {
    const [irasData, culturasData, hmData, atmData] = await Promise.all([
      loadFromAPI<IRAS>('IRAS'),
      loadFromAPI<Cultura>('CULTURA'),
      loadFromAPI<HMObs>('HM'),
      loadFromAPI<ATM>('ATM')
    ]);
    setIras(irasData);
    setCulturas(culturasData);
    setHmObs(hmData);
    setAntimicrobianos(atmData);
    setErroCarga('');
  }, []);

  useEffect(() => {
    if (!hospitalId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        setPacientes(lista.map((p: { id: string; nome: string }) => ({ id: p.id, nome: p.nome })));
        setErroPacientes('');
      })
      .catch(error => setErroPacientes(error instanceof Error ? error.message : 'Não foi possível carregar a lista de pacientes.'));
  }, [hospitalId, reloadAll]);

  const msg = (texto: string) => { setAviso(texto); setTimeout(() => setAviso(''), 3000); };
  const fecharDetalhe = useCallback(() => setIrasDetalhe(null), []);

  // ── indicadores ─────────────────────────────────────
  const irasAtivas   = iras.filter(i => i.status === 'Ativa').length;
  const irasTratadas = iras.filter(i => i.status === 'Tratada').length;
  const totalHM      = hmObs.length;
  const simHM        = hmObs.filter(o => o.realizou === 'Sim').length;
  const taxaHM       = totalHM > 0 ? Math.round((simHM / totalHM) * 100) : 0;
  const atmEmUso     = antimicrobianos.filter(a => a.status === 'Em uso').length;

  const notificarIRAS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fPaciente || !fTipo) { msg('Preencha paciente e tipo.'); return; }
    const nova: Item = {
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
        const novaCultura: Item = {
          paciente: fPaciente, material: fMaterial,
          microorganismo: fMicro, antibiotico: fAtb,
          sensibilidade: 'Aguardando', status: 'Pendente', data: fData,
        };
        await saveToAPI('CULTURA', novaCultura);
      }
      await reloadAll();
      setFPaciente(''); setFTipo(''); setFMicro(''); setFAtb(''); setFObs(''); setFData(HOJE());
      msg('IRAS notificada com sucesso.');
      setTab('iras');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível notificar a IRAS.');
    } finally {
      setIsSaving(false);
    }
  };

  const tratarIRAS = async (ira: IRAS) => {
    if (!await confirm(`Marcar a IRAS de ${ira.paciente} como tratada?`)) return;
    setIsSaving(true);
    setErroCarga('');
    try {
      await updateAPIStatus(String(ira.id), 'TRATADO', { status: 'Tratada', dataTratamento: new Date().toISOString() });
      await reloadAll();
      msg('IRAS marcada como tratada.');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível atualizar a IRAS.');
    } finally {
      setIsSaving(false);
    }
  };

  const registrarHM = async (e: React.FormEvent) => {
    e.preventDefault();
    const nova: Item = { data: new Date().toISOString(), setor: hmSetor, categoria: hmCategoria, momento: hmMomento, realizou: hmRealizou };
    setIsSaving(true);
    setErroCarga('');
    try {
      await saveToAPI('HM', nova);
      await reloadAll();
      msg('Observação registrada.');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível registrar a observação.');
    } finally {
      setIsSaving(false);
    }
  };

  const monitorarATM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atmPaciente || !atmNome) { msg('Preencha paciente e antimicrobiano.'); return; }
    const novo: Item = { paciente: atmPaciente, nome: atmNome, dose: atmDose, via: atmVia, frequencia: atmFreq, inicio: atmInicio, duracao: atmDuracao, indicacao: atmIndicacao, status: 'Em uso' };
    setIsSaving(true);
    setErroCarga('');
    try {
      await saveToAPI('ATM', novo);
      await reloadAll();
      setAtmNome(''); setAtmDose(''); setAtmFreq('');
      msg('Antimicrobiano registrado para monitoramento.');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível registrar o antimicrobiano.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── IRAS filtradas ───────────────────────────────────
  const irasFiltradas = useMemo(() => {
    let l = [...iras];
    if (filtroGravidade !== 'todos') l = l.filter(i => i.gravidade === filtroGravidade);
    if (buscarIRAS) { const q = buscarIRAS.toLowerCase(); l = l.filter(i => i.paciente.toLowerCase().includes(q) || i.tipo.toLowerCase().includes(q) || i.microorganismo.toLowerCase().includes(q)); }
    return l;
  }, [iras, filtroGravidade, buscarIRAS]);

  // ── relatório ────────────────────────────────────────
  const irasMes     = iras.filter(i => { const d = parseDataLocal(i.data); return d.getMonth() + 1 === relMes && d.getFullYear() === relAno; });
  const culturasMes = culturas.filter(c => { const d = parseDataLocal(c.data); return d.getMonth() + 1 === relMes && d.getFullYear() === relAno; });
  const atmMes      = antimicrobianos.filter(a => { const d = parseDataLocal(a.inicio); return d.getMonth() + 1 === relMes && d.getFullYear() === relAno; });
  const tiposIRAS   = [...new Set(irasMes.map(i => i.tipo))];

  return (
    <div className="conteudo">
      <div className="ccih-container">
        <PageHeader
          icon="las la-shield-virus"
          title="CCIH"
          subtitle="Notificação e vigilância de infecções relacionadas à assistência (IRAS)"
          actions={podeGerir ? (
            <button type="button" className="btn btn-success" onClick={() => setTab('notificacao')}>
              <i className="las la-plus-circle" aria-hidden="true"></i> Notificar IRAS
            </button>
          ) : undefined}
        />

        {aviso && <p className="mod-aviso mod-aviso-sucesso" role="status">{aviso}</p>}
        {erroCarga && <p className="mod-aviso mod-aviso-erro" role="alert">{erroCarga}</p>}
        {erroPacientes && (
          <p className="mod-aviso mod-aviso-atencao" role="alert">
            {erroPacientes} Os campos de paciente podem ficar indisponíveis até que a lista seja carregada.
          </p>
        )}

        <StatGrid>
          <StatCard icon="las la-biohazard" value={irasAtivas} label="IRAS ativas" tone="danger" alerta />
          <StatCard icon="las la-flask" value={culturas.length} label="Culturas" />
          <StatCard icon="las la-hand-sparkles" value={totalHM > 0 ? `${taxaHM}%` : 'N/A'} label="Adesão à higiene de mãos" />
          <StatCard icon="las la-syringe" value={atmEmUso} label="Antimicrobianos em uso" />
          <StatCard icon="las la-check-circle" value={irasTratadas} label="IRAS tratadas" />
        </StatGrid>

        <Tabs tabs={podeGerir ? TABS : TABS.filter(t => t.id !== 'notificacao')} active={tab} onChange={setTab} label="Seções da CCIH" />

        {!podeGerir && <p role="status" className="sc-nota sc-nota-superficie">Seu cargo pode consultar os registros da CCIH, mas não criar nem alterar.</p>}

        {/* ── ABA: NOTIFICAÇÃO ── */}
        {tab === 'notificacao' && podeGerir && (
          <Panel title="Notificar nova IRAS" icon="las la-biohazard">
            <form onSubmit={notificarIRAS}>
              <div className="mod-form-grid">
                <div className="form-group">
                  <label htmlFor="ccih-paciente">Paciente *</label>
                  <select id="ccih-paciente" value={fPaciente} onChange={e => setFPaciente(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
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
                <div className="form-group">
                  <label htmlFor="ccih-data">Data do diagnóstico *</label>
                  <input id="ccih-data" type="date" value={fData} onChange={e => setFData(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="ccih-local">Local de aquisição</label>
                  <select id="ccih-local" value={fLocal} onChange={e => setFLocal(e.target.value)}>
                    <option>Hospitalar - UTI</option>
                    <option>Hospitalar - Enfermaria</option>
                    <option>Hospitalar - Centro Cirúrgico</option>
                    <option>Comunitária</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ccih-gravidade">Gravidade</label>
                  <select id="ccih-gravidade" value={fGrav} onChange={e => setFGrav(e.target.value as Gravidade)}>
                    <option>Leve</option><option>Moderada</option><option>Grave</option><option>Sepse</option><option>Choque Séptico</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ccih-material">Material biológico coletado</label>
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
                <div className="form-group">
                  <label htmlFor="ccih-microrganismo">Microrganismo identificado</label>
                  <input id="ccih-microrganismo" type="text" value={fMicro} onChange={e => setFMicro(e.target.value)} placeholder="Ex: Staphylococcus aureus MRSA" />
                </div>
                <div className="form-group">
                  <label htmlFor="ccih-antibiotico">Antibiótico iniciado</label>
                  <input id="ccih-antibiotico" type="text" value={fAtb} onChange={e => setFAtb(e.target.value)} placeholder="Ex: Vancomicina 1g IV 12/12h" />
                </div>
                <div className="form-group mod-largo">
                  <label htmlFor="ccih-observacoes">Observações</label>
                  <textarea id="ccih-observacoes" rows={2} value={fObs} onChange={e => setFObs(e.target.value)} />
                </div>
              </div>
              <div className="mod-acoes">
                <button type="submit" className="btn btn-success" disabled={isSaving}>
                  <i className="las la-save" aria-hidden="true"></i> {isSaving ? 'Salvando...' : 'Notificar IRAS'}
                </button>
              </div>
            </form>
          </Panel>
        )}

        {/* ── ABA: IRAS ── */}
        {tab === 'iras' && (
          <>
            <div className="sc-filtros">
              <SearchInput value={buscarIRAS} onChange={setBuscarIRAS} placeholder="Buscar por paciente, tipo ou microrganismo..." label="Buscar IRAS por paciente, tipo ou microrganismo" />
              <select aria-label="Filtrar IRAS por gravidade" value={filtroGravidade} onChange={e => setFiltroGravidade(e.target.value)}>
                <option value="todos">Todas as gravidades</option>
                <option>Leve</option><option>Moderada</option><option>Grave</option><option>Sepse</option><option>Choque Séptico</option>
              </select>
            </div>
            {irasFiltradas.length === 0 ? (
              <EmptyState icon="las la-biohazard" message="Nenhuma IRAS encontrada." />
            ) : (
              <ul className="ccih-iras">
                {irasFiltradas.map(i => (
                  <li key={i.id} className={`ccih-ira ${i.status === 'Ativa' ? 'ccih-ira-ativa' : 'ccih-ira-tratada'}`}>
                    <div className="ccih-ira-topo">
                      <h2>{i.paciente}</h2>
                      <Badge tone={tomGravidade(i.gravidade)}>{i.gravidade}</Badge>
                    </div>
                    <p className="ccih-ira-tipo">{i.tipo}</p>
                    <p className="mod-secundario">{i.local} · {fmtData(i.data)}</p>
                    {i.microorganismo && <p className="mod-secundario">Microrganismo: {i.microorganismo}</p>}
                    {i.antibiotico && <p className="mod-secundario">Antibiótico: {i.antibiotico}</p>}
                    <div className="ccih-ira-rodape">
                      <Badge tone={i.status === 'Ativa' ? 'danger' : 'success'}>{i.status}</Badge>
                      {podeGerir && i.status === 'Ativa' && (
                        <button type="button" className="btn btn-sm btn-success" disabled={isSaving} onClick={() => void tratarIRAS(i)}>
                          <i className="las la-check" aria-hidden="true"></i> Tratar
                        </button>
                      )}
                      <button type="button" className="btn btn-sm btn-secondary" aria-label={`Ver detalhes da IRAS de ${i.paciente}`} onClick={() => setIrasDetalhe(i)}>
                        <i className="las la-eye" aria-hidden="true"></i> Detalhes
                      </button>
                    </div>
                    {i.notificadoPor && <p className="mod-secundario">Notificado por {i.notificadoPor}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* ── ABA: CULTURAS ── */}
        {tab === 'culturas' && (culturas.length === 0 ? (
          <EmptyState icon="las la-flask" message="Nenhuma cultura registrada." />
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr><th scope="col">Data</th><th scope="col">Paciente</th><th scope="col">Material</th><th scope="col">Microrganismo</th><th scope="col">Antibiótico</th><th scope="col">Sensibilidade</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {culturas.map(c => (
                  <tr key={c.id}>
                    <td>{fmtData(c.data)}</td>
                    <td>{c.paciente}</td>
                    <td>{c.material}</td>
                    <td>{c.microorganismo || '-'}</td>
                    <td>{c.antibiotico || '-'}</td>
                    <td><Badge tone={tomSensibilidade(c.sensibilidade)}>{c.sensibilidade}</Badge></td>
                    <td><Badge tone={c.status === 'Concluído' ? 'success' : 'neutral'}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* ── ABA: HIGIENE DE MÃOS ── */}
        {tab === 'higienemaos' && (
          <>
            {podeGerir && (
              <Panel title="Auditoria de higiene de mãos" icon="las la-hand-sparkles">
                <form onSubmit={registrarHM}>
                  <div className="mod-form-grid">
                    <div className="form-group">
                      <label htmlFor="ccih-hm-setor">Setor *</label>
                      <select id="ccih-hm-setor" value={hmSetor} onChange={e => setHmSetor(e.target.value)}>
                        <option>UTI</option><option>Enfermaria</option><option>Emergência</option><option>Centro Cirúrgico</option><option>Ambulatório</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-hm-categoria">Categoria profissional</label>
                      <select id="ccih-hm-categoria" value={hmCategoria} onChange={e => setHmCategoria(e.target.value)}>
                        <option>Médico</option><option>Enfermeiro</option><option>Técnico de Enfermagem</option><option>Fisioterapeuta</option><option>Outro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-hm-momento">Momento da observação</label>
                      <select id="ccih-hm-momento" value={hmMomento} onChange={e => setHmMomento(e.target.value)}>
                        <option>Antes do contato com paciente</option>
                        <option>Antes de procedimento asséptico</option>
                        <option>Após risco de exposição a fluidos</option>
                        <option>Após contato com paciente</option>
                        <option>Após contato com superfícies próximas</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-hm-realizou">Realizou higiene?</label>
                      <select id="ccih-hm-realizou" value={hmRealizou} onChange={e => setHmRealizou(e.target.value as 'Sim'|'Não')}>
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                  </div>
                  <div className="mod-acoes">
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      <i className="las la-save" aria-hidden="true"></i> {isSaving ? 'Salvando...' : 'Registrar observação'}
                    </button>
                  </div>
                </form>
              </Panel>
            )}
            <Panel title="Adesão à higiene de mãos (OMS, 5 momentos)" icon="las la-hand-sparkles">
              <p className="sc-adesao">{totalHM > 0 ? `${taxaHM}%` : 'N/A'}</p>
              <p>{simHM} de {totalHM} observações com higiene adequada</p>
              <p className="sc-muted">Meta de referência a validar pela CCIH do hospital.</p>
            </Panel>
          </>
        )}

        {/* ── ABA: ANTIMICROBIANOS ── */}
        {tab === 'antimicrobianos' && (
          <>
            {podeGerir && (
              <Panel title="Monitoramento de antimicrobianos" icon="las la-capsules">
                <p className="mod-nota">Registro de vigilância. Não é prescrição: a prescrição é feita pelo médico no prontuário.</p>
                <form onSubmit={monitorarATM}>
                  <div className="mod-form-grid">
                    <div className="form-group">
                      <label htmlFor="ccih-atm-paciente">Paciente *</label>
                      <select id="ccih-atm-paciente" value={atmPaciente} onChange={e => setAtmPaciente(e.target.value)} required>
                        <option value="">Selecione...</option>
                        {pacientes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-atm-nome">Antimicrobiano *</label>
                      <input id="ccih-atm-nome" type="text" value={atmNome} onChange={e => setAtmNome(e.target.value)} placeholder="Nome do antimicrobiano" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-atm-dose">Dose</label>
                      <input id="ccih-atm-dose" type="text" value={atmDose} onChange={e => setAtmDose(e.target.value)} placeholder="Ex: 1g" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-atm-via">Via</label>
                      <select id="ccih-atm-via" value={atmVia} onChange={e => setAtmVia(e.target.value)}>
                        <option>IV</option><option>IM</option><option>Oral</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-atm-frequencia">Frequência</label>
                      <input id="ccih-atm-frequencia" type="text" value={atmFreq} onChange={e => setAtmFreq(e.target.value)} placeholder="Ex: 12/12h" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-atm-inicio">Data de início</label>
                      <input id="ccih-atm-inicio" type="date" value={atmInicio} onChange={e => setAtmInicio(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-atm-duracao">Duração prevista (dias)</label>
                      <input id="ccih-atm-duracao" type="number" value={atmDuracao} onChange={e => setAtmDuracao(e.target.value)} min="1" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="ccih-atm-indicacao">Indicação</label>
                      <select id="ccih-atm-indicacao" value={atmIndicacao} onChange={e => setAtmIndicacao(e.target.value)}>
                        <option>Empírica</option><option>Profilática</option><option>Terapêutica (com cultura)</option>
                      </select>
                    </div>
                  </div>
                  <div className="mod-acoes">
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                      <i className="las la-save" aria-hidden="true"></i> {isSaving ? 'Salvando...' : 'Monitorar antimicrobiano'}
                    </button>
                  </div>
                </form>
              </Panel>
            )}
            {antimicrobianos.length === 0 ? (
              <EmptyState icon="las la-capsules" message="Nenhum antimicrobiano em monitoramento." />
            ) : (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead>
                    <tr><th scope="col">Paciente</th><th scope="col">Antimicrobiano</th><th scope="col">Dose e via</th><th scope="col">Início</th><th scope="col">Duração</th><th scope="col">Indicação</th><th scope="col">Status</th></tr>
                  </thead>
                  <tbody>
                    {antimicrobianos.map(a => (
                      <tr key={a.id}>
                        <td>{a.paciente}</td>
                        <td><strong>{a.nome}</strong>{a.frequencia && <span className="mod-secundario">{a.frequencia}</span>}</td>
                        <td>{a.dose} {a.via}</td>
                        <td>{fmtData(a.inicio)}</td>
                        <td>{a.duracao} dias</td>
                        <td><Badge tone={tomAntimicrobiano(a.indicacao)}>{a.indicacao}</Badge></td>
                        <td><Badge tone="info">{a.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── ABA: RELATÓRIO ── */}
        {tab === 'relatorio' && (
          <>
            <Panel title="Relatório mensal" icon="las la-chart-bar">
              <div className="mod-form-grid">
                <div className="form-group">
                  <label htmlFor="ccih-rel-mes">Mês</label>
                  <select id="ccih-rel-mes" value={relMes} onChange={e => setRelMes(Number(e.target.value))}>
                    {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ccih-rel-ano">Ano</label>
                  <input id="ccih-rel-ano" type="number" value={relAno} onChange={e => setRelAno(Number(e.target.value))} min={2020} max={2030} />
                </div>
              </div>
            </Panel>

            <StatGrid>
              <StatCard icon="las la-biohazard" value={irasMes.length} label="IRAS notificadas" />
              <StatCard icon="las la-exclamation-circle" value={irasMes.filter(i => i.status === 'Ativa').length} label="IRAS ativas" tone="danger" alerta />
              <StatCard icon="las la-check-circle" value={irasMes.filter(i => i.status === 'Tratada').length} label="IRAS tratadas" />
              <StatCard icon="las la-heartbeat" value={irasMes.filter(i => i.gravidade === 'Sepse' || i.gravidade === 'Choque Séptico').length} label="Sepse ou choque" tone="danger" alerta />
              <StatCard icon="las la-flask" value={culturasMes.length} label="Culturas" />
              <StatCard icon="las la-capsules" value={atmMes.length} label="Antimicrobianos" />
            </StatGrid>

            <Panel
              title={`IRAS por tipo em ${MESES[relMes - 1]} de ${relAno}`}
              icon="las la-list"
              actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}><i className="las la-print" aria-hidden="true"></i> Imprimir</button>}
            >
              {tiposIRAS.length === 0 ? (
                <p className="sc-muted">Nenhuma IRAS no período.</p>
              ) : (
                <ul className="ccih-tipos">
                  {tiposIRAS.map(tipo => (
                    <li key={tipo}><span>{tipo}</span><strong className="ui-num">{irasMes.filter(i => i.tipo === tipo).length} {irasMes.filter(i => i.tipo === tipo).length === 1 ? 'caso' : 'casos'}</strong></li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>

      {/* ── MODAL: DETALHES IRAS ── */}
      {irasDetalhe && (
        <Modal titulo="Detalhes da IRAS" aoFechar={fecharDetalhe}>
          <dl className="ccih-detalhes">
            {[
              { label: 'Paciente',       valor: irasDetalhe.paciente },
              { label: 'Tipo',           valor: irasDetalhe.tipo },
              { label: 'Data',           valor: fmtData(irasDetalhe.data) },
              { label: 'Local',          valor: irasDetalhe.local },
              { label: 'Gravidade',      valor: irasDetalhe.gravidade },
              { label: 'Material',       valor: irasDetalhe.material },
              { label: 'Microrganismo',  valor: irasDetalhe.microorganismo || 'Não informado' },
              { label: 'Antibiótico',    valor: irasDetalhe.antibiotico || 'Não informado' },
              { label: 'Status',         valor: irasDetalhe.status },
              { label: 'Notificado por', valor: irasDetalhe.notificadoPor },
              { label: 'Observações',    valor: irasDetalhe.obs || 'Nenhuma' },
            ].map(r => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.valor}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
}
