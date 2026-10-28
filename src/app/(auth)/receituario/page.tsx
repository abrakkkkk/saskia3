'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import './receituario.css';
import AdesivosManager from '@/components/receituario/adesivos/AdesivosManager';
import { type Adesivo } from '@/components/receituario/adesivos/catalog';

// As sugestões terapêuticas do sistema anterior foram removidas: não eram um formulário institucional validado.

interface Medicamento {
  id: number;
  viaUso: string;
  conteudo: string;
}

interface Paciente {
  id: string;
  nome: string;
}

const ALLOWED_RECIPE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'IMG']);
const DROP_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE']);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

function sanitizeRecipeHtml(value: string) {
  if (typeof window === 'undefined') return escapeHtml(value);
  const document = new DOMParser().parseFromString(value, 'text/html');
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (!ALLOWED_RECIPE_TAGS.has(element.tagName)) {
      if (DROP_CONTENT_TAGS.has(element.tagName)) element.remove();
      else element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      if (!src.startsWith('/adesivos/') || src.includes('..') || src.includes('\\')) {
        element.remove();
        continue;
      }
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      element.setAttribute('src', src);
      element.setAttribute('alt', alt.slice(0, 120));
    } else {
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
    }
  }
  return document.body.innerHTML;
}

export default function ReceituarioPage() {
  const { data: session, status: sessionStatus } = useSession();
  const cargoUsuario = (session?.user as { cargo?: string } | undefined)?.cargo;
  const isMedico = cargoUsuario === 'MEDICO';
  const podeVerHistorico = ['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM', 'FARMACEUTICO'].includes(cargoUsuario || '');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [activeTab, setActiveTab] = useState<'receituario'|'adesivos'|'modelos'|'historico'>('receituario');
  const [historico, setHistorico] = useState<any[]>([]);
  const [erroCarga, setErroCarga] = useState('');
  const [salvandoPrescricao, setSalvandoPrescricao] = useState(false);

  // Header form
  const [estabelecimento, setEstabelecimento] = useState('');
  const [registro, setRegistro] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [nomePaciente, setNomePaciente] = useState(''); // Only used as fallback if manual typing needed

  // Modals
  const [modalAdesivosAberto, setModalAdesivosAberto] = useState(false);
  const [editorAtivoIndex, setEditorAtivoIndex] = useState<number | null>(null);

  const editorRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  const carregarDados = useCallback(async () => {
    try {
      const [resPacientes, resReceitas] = await Promise.all([
        fetch('/api/pacientes'),
        podeVerHistorico ? fetch('/api/receitas') : Promise.resolve(null)
      ]);
      if (resPacientes.ok) {
        const dadosPacientes: unknown = await resPacientes.json();
        if (!Array.isArray(dadosPacientes)) throw new Error('A resposta de pacientes é inválida.');
        setPacientes(dadosPacientes);
      } else throw new Error('Não foi possível carregar pacientes para a prescrição.');

      if (!resReceitas) {
        setHistorico([]);
        setErroCarga('');
      } else if(resReceitas.ok) {
        const receitas = await resReceitas.json();
        setHistorico(Array.isArray(receitas) ? receitas.map((receita: any) => ({
          ...receita,
          medicamentos: Array.isArray(receita.medicamentos)
            ? receita.medicamentos.map((medicamento: any) => ({
                ...medicamento,
                conteudo: typeof medicamento.conteudo === 'string' ? sanitizeRecipeHtml(medicamento.conteudo) : '',
              }))
            : [],
        })) : []);
        setErroCarga('');
      } else {
        const erro = await resReceitas.json().catch(() => ({}));
        throw new Error(erro.error || 'Não foi possível carregar as prescrições.');
      }
    } catch(e) {
      console.error(e);
      setErroCarga(e instanceof Error ? e.message : 'Não foi possível carregar os dados de prescrição.');
    }
  }, [podeVerHistorico]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    carregarDados();
    try {
      fetch('/api/me').then(async response => {
        const data = await response.json();
        if (response.ok && typeof data.hospital?.nome === 'string') setEstabelecimento(data.hospital.nome);
      }).catch(() => {});
    } catch {}
  }, [carregarDados, sessionStatus]);

  const saveDadosMemoria = (meds: Medicamento[]) => {
    setMedicamentos(meds);
    setRegistro('');
  };

  const getTitulos = () => {
    return { titulo: 'RECEITUÁRIO', subtitulo: 'RECEITA MÉDICA - VIA DO PACIENTE' };
  };

  const addMedicamento = () => {
    const meds = [...medicamentos, { id: Date.now(), viaUso: "Oral", conteudo: "" }];
    saveDadosMemoria(meds);
  };

  const removerMedicamento = (idx: number) => {
    const meds = medicamentos.filter((_, i) => i !== idx);
    saveDadosMemoria(meds);
  };

  const atualizarViaUso = (idx: number, val: string) => {
    const meds = [...medicamentos];
    meds[idx].viaUso = val;
    saveDadosMemoria(meds);
  };

  const handleEditorInput = (idx: number, html: string) => {
    const meds = [...medicamentos];
    meds[idx].conteudo = sanitizeRecipeHtml(html);
    saveDadosMemoria(meds);
  };

  const inserirTextoEditor = (idx: number, texto: string) => {
    const ref = editorRefs.current[idx];
    if (ref) {
      ref.insertAdjacentText('beforeend', texto);
      handleEditorInput(idx, ref.innerHTML);
    }
  };

  const inserirCaractere = (c: string) => {
    if (editorAtivoIndex !== null) {
      inserirTextoEditor(editorAtivoIndex, c);
    }
  };

  const inserirAdesivo = (adesivo: Adesivo) => {
    if (editorAtivoIndex !== null) {
      const ref = editorRefs.current[editorAtivoIndex];
      if (ref) {
        const img = `<img src="/adesivos/${adesivo.pasta}/${adesivo.arquivo}" alt="${adesivo.nome}" style="max-width: 64px; max-height: 64px; vertical-align: middle; margin: 4px;" />`;
        ref.innerHTML += img;
        handleEditorInput(editorAtivoIndex, ref.innerHTML);
      }
    }
  };

  const salvarPrescricao = async () => {
    if (!isMedico) {
      alert('Somente usuários com cargo MEDICO podem registrar prescrições.');
      return;
    }
    if (!pacienteId) {
      alert(" Selecione um paciente cadastrado para salvar no prontuário!");
      return;
    }
    if (medicamentos.length === 0) {
      alert(" Adicione ao menos um item prescrito!");
      return;
    }

    setSalvandoPrescricao(true);
    try {
      const res = await fetch('/api/receitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          medicamentos: medicamentos,
          observacoes: getTitulos().titulo
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar prescrição');

      if (typeof data.id === 'string') setRegistro(data.id);
      alert(" Prescrição salva no prontuário com sucesso!");
      await carregarDados();
    } catch(e: any) {
      alert(e.message);
    } finally {
      setSalvandoPrescricao(false);
    }
  };

  const imprimir = () => {
    if (!estabelecimento || (!pacienteId && !nomePaciente.trim()) || medicamentos.length === 0) {
      alert('Informe o estabelecimento, paciente e ao menos um item antes de imprimir.');
      return;
    }
    window.print();
  };

  const limparTudo = async () => {
    if (await confirm("Limpar todo o receituário?")) {
      saveDadosMemoria([]);
      setPacienteId('');
      setNomePaciente('');
      setRegistro('');
    }
  };

  const pacienteNomeExibido = pacienteId ? pacientes.find(p => p.id === pacienteId)?.nome : nomePaciente;

  return (
    <div className={`container-receituario ${isMedico ? '' : 'receituario-restrito'}`}>
      <div className="sidebar-receita hide-on-print">
        {!isMedico && <p role="status" className="aviso-permissao">Somente usuários MEDICO podem criar e imprimir prescrições.</p>}
        {isMedico && <>
        <div className="professional-switcher">
          <label><i className="las la-user-md"></i> Perfil da sessão</label>
          <div className="perfis-lista">
            <span className="perfil-btn ativo"><i className="las la-stethoscope"></i> Médico</span>
          </div>
        </div>
        <button className="cta-button" onClick={addMedicamento}><i className="las la-plus-circle"></i> Adicionar Prescrição</button>
        <div role="note" className="aviso-permissao"><i className="las la-info-circle" aria-hidden="true"></i> Catálogo institucional não integrado. A receita é preenchida pelo profissional, sem sugestões automáticas de medicamentos.</div>
        </>}
      </div>

      <div className="main-receita">
        {erroCarga && <div role="alert" className="aviso-permissao">{erroCarga}</div>}
        <div className="tabs-receita hide-on-print" role="group" aria-label="Seções do receituário">
          <button type="button" aria-pressed={activeTab === 'receituario'} className={`tab-btn ${activeTab === 'receituario' ? 'ativo' : ''}`} onClick={() => setActiveTab('receituario')}><i className="las la-prescription-bottle" aria-hidden="true"></i> Editor de Receita</button>
          <button type="button" aria-pressed={activeTab === 'historico'} className={`tab-btn ${activeTab === 'historico' ? 'ativo' : ''}`} onClick={() => setActiveTab('historico')}><i className="las la-history" aria-hidden="true"></i> Histórico de Receitas</button>
          <button type="button" aria-pressed={activeTab === 'adesivos'} className={`tab-btn ${activeTab === 'adesivos' ? 'ativo' : ''}`} onClick={() => setActiveTab('adesivos')}><i className="las la-tag" aria-hidden="true"></i> Adesivos</button>
        </div>

        {activeTab === 'receituario' && !isMedico && <div role="status" className="papel-receita">A criação e impressão de prescrições está disponível apenas para usuários MEDICO.</div>}

        {activeTab === 'receituario' && isMedico && (
          <div className="toolbar-receita hide-on-print" style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
            <button className="tool-btn" onClick={() => { setEditorAtivoIndex(medicamentos.length > 0 ? medicamentos.length - 1 : null); setModalAdesivosAberto(true); }}><i className="las la-tag"></i> Inserir Adesivo</button>
            <button className="tool-btn" onClick={imprimir} disabled={!estabelecimento || (!pacienteId && !nomePaciente.trim()) || medicamentos.length === 0} style={{background: '#e2e8f0', color: '#1e293b'}}><i className="las la-print"></i> Imprimir</button>
            <button className="tool-btn" onClick={salvarPrescricao} disabled={salvandoPrescricao} style={{background: '#16a34a', color: 'white'}}><i className="las la-save"></i> {salvandoPrescricao ? 'Salvando…' : 'Salvar no Prontuário'}</button>
            <button className="tool-btn danger" onClick={limparTudo}><i className="las la-trash-alt"></i> Limpar Tudo</button>
          </div>
        )}

        {activeTab === 'receituario' && isMedico && (
          <div className="papel-receita" id="papelReceita">
            <h1 id="tituloDocumento">{getTitulos().titulo}</h1>
            <div className="subtitulo" id="subtituloDocumento">{getTitulos().subtitulo}</div>

            <div className="form-row hide-on-print">
              <div className="form-campo">
                <label htmlFor="receituario-estabelecimento">ESTABELECIMENTO DE SAÚDE (Institucional):</label>
                <input
                  id="receituario-estabelecimento"
                  type="text"
                  value={estabelecimento}
                  readOnly
                  style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', color: '#1e293b', fontWeight: 600, border: '1px solid #cbd5e1' }}
                  title="Vinculado automaticamente à unidade de atendimento da sua sessão"
                />
              </div>
              <div className="form-campo">
                <label htmlFor="receituario-registro">CÓDIGO DO REGISTRO:</label>
                <input
                  id="receituario-registro"
                  type="text"
                  value={registro || 'Rascunho — ainda não registrado'}
                  readOnly
                  style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', color: '#0369a1', fontWeight: 700, border: '1px solid #cbd5e1' }}
                  title="O código real é atribuído pelo servidor após salvar no prontuário"
                />
              </div>
            </div>
            <div className="form-campo hide-on-print">
              <label htmlFor="receituario-paciente">PACIENTE CADASTRADO (Para Prontuário):</label>
              <select id="receituario-paciente" value={pacienteId} onChange={e => {setPacienteId(e.target.value); setNomePaciente('');}}>
                <option value="">Selecione...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            {!pacienteId && (
              <div className="form-campo hide-on-print">
                <label htmlFor="receituario-paciente-avulso">NOME DO PACIENTE (Impressão Avulsa):</label>
                <input id="receituario-paciente-avulso" type="text" value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Nome completo do paciente" />
              </div>
            )}

            {/* Print Header */}
            <div className="print-header" style={{display:'none'}}>
              {estabelecimento && <p><strong>Estabelecimento:</strong> {estabelecimento}</p>}
              {registro ? <p><strong>Registro:</strong> {registro}</p> : <p><strong>RASCUNHO — NÃO REGISTRADO NO PRONTUÁRIO</strong></p>}
              {pacienteNomeExibido && <p style={{marginTop:'10px', fontSize:'18px'}}><strong>Paciente:</strong> {pacienteNomeExibido}</p>}
              <hr style={{margin:'20px 0'}} />
            </div>

            <div className="medicamentos-list">
              {medicamentos.length === 0 ? (
                <div style={{textAlign:'center', padding:'40px', color:'#94a3b8'}} className="hide-on-print">
                  <i className="las la-capsules" style={{fontSize:'48px'}}></i>
                  <p>Nenhum medicamento adicionado</p>
                </div>
              ) : (
                medicamentos.map((med, idx) => (
                  <div className="medicamento-card" key={med.id}>
                    <div className="card-header hide-on-print">
                      <div className="drag-control"><i className="las la-arrows-alt"></i></div>
                      <select aria-label={`Via de uso da prescrição ${idx + 1}`} value={med.viaUso} onChange={e => atualizarViaUso(idx, e.target.value)}>
                        <option value="Oral">Oral</option>
                        <option value="Intravenosa">IV</option>
                        <option value="Intramuscular">IM</option>
                        <option value="Tópica">Tópica</option>
                      </select>
                      <span className="card-title">Prescrição {idx + 1}</span>
                      <button type="button" className="btn-remove-card" aria-label={`Remover prescrição ${idx + 1}`} onClick={() => removerMedicamento(idx)}><i className="las la-trash" aria-hidden="true"></i></button>
                    </div>
                    <div className="print-via-uso" style={{display:'none', fontWeight:'bold', marginBottom:'5px'}}>Uso: {med.viaUso}</div>

                    <div
                      className="editor-custom"
                      contentEditable
                      role="textbox"
                      aria-label={`Conteúdo da prescrição ${idx + 1}`}
                      aria-multiline="true"
                      suppressContentEditableWarning
                      ref={el => { if(el) { editorRefs.current[idx] = el; } }}
                      onBlur={e => handleEditorInput(idx, e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: sanitizeRecipeHtml(med.conteudo) }}
                      style={{ whiteSpace: 'pre-wrap' }}
                    />

                    <div className="card-footer hide-on-print">
                      <button className="icon-btn" onClick={() => { setEditorAtivoIndex(idx); setModalAdesivosAberto(true); }}><i className="las la-smile-wink"></i></button>
                      <button className="icon-btn" type="button" title="Inserir data de hoje" aria-label="Inserir data de hoje" onClick={() => inserirTextoEditor(idx, new Date().toLocaleDateString('pt-BR'))}><i className="las la-calendar" aria-hidden="true"></i></button>
                      <button className="icon-btn" type="button" title="Inserir marca de conferência" aria-label="Inserir marca de conferência" onClick={() => inserirTextoEditor(idx, ' ✓ ')}><i className="las la-check-circle" aria-hidden="true"></i></button>
                      <button className="icon-btn" type="button" title="Inserir marca de atenção" aria-label="Inserir marca de atenção" onClick={() => inserirTextoEditor(idx, ' ✗ ')}><i className="las la-times-circle" aria-hidden="true"></i></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="data-receita">
              <i className="las la-calendar"></i> Data: {new Date().toLocaleDateString('pt-BR')}
            </div>

            <div className="assinatura-area">
              <div className="assinatura-item">
                <div className="linha" contentEditable suppressContentEditableWarning></div>
                <p>Assinatura do Profissional</p>
              </div>
              <div className="assinatura-item">
                <div className="linha" contentEditable suppressContentEditableWarning></div>
                <p>Carimbo / Registro</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="papel-receita">
            <h2><i className="las la-history"></i> Histórico de Receitas Salvas</h2>
            {historico.length === 0 ? (
              <p style={{color:'#94a3b8'}}>Nenhuma receita salva no banco de dados.</p>
            ) : (
              historico.map(h => (
                <div key={h.id} style={{padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px'}}>
                  <strong>{new Date(h.createdAt).toLocaleDateString()} - Paciente: {h.paciente.nome}</strong>
                  <p style={{color: '#64748b', fontSize: '13px'}}>{h.observacoes} | Profissional: {h.profissional}</p>
                  <ul style={{marginTop: '10px', fontSize: '14px'}}>
                    {(h.medicamentos as any[]).map((m, i) => (
                      <li key={i}><strong>Uso {m.viaUso}:</strong> <span dangerouslySetInnerHTML={{ __html: sanitizeRecipeHtml(typeof m.conteudo === 'string' ? m.conteudo : '') }} /></li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        <AdesivosManager
          mostrarGerador={activeTab === 'adesivos'}
          modalAberto={modalAdesivosAberto}
          onModalAbertoChange={setModalAdesivosAberto}
          onInsertText={inserirCaractere}
          onInsertSticker={inserirAdesivo}
        />

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
            body * { visibility: hidden; }
            body:not([data-print-mode="stickers"]) #papelReceita,
            body:not([data-print-mode="stickers"]) #papelReceita * { visibility: visible; }
            body:not([data-print-mode="stickers"]) #papelReceita { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
            body:not([data-print-mode="stickers"]) .hide-on-print { display: none !important; }
            body:not([data-print-mode="stickers"]) .print-header { display: block !important; }
            body:not([data-print-mode="stickers"]) .print-via-uso { display: block !important; }
            body:not([data-print-mode="stickers"]) .editor-custom { border: none !important; padding: 0 !important; }
            body:not([data-print-mode="stickers"]) .medicamento-card { border: none !important; background: transparent !important; margin-bottom: 20px !important; padding: 0 !important; }
            body[data-print-mode="stickers"] .print-adesivos-container,
            body[data-print-mode="stickers"] .print-adesivos-container * { visibility: visible; }
            body[data-print-mode="stickers"] .print-adesivos-container { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: repeat(auto-fill, minmax(3cm, 1fr)); gap: 10px; align-content: start; }
            body[data-print-mode="stickers"] .print-adesivo-item { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed #ccc; padding: 5px; text-align: center; height: 3cm; }
            body[data-print-mode="stickers"] .print-adesivo-item img { max-width: 2cm; max-height: 2cm; object-fit: contain; }
            body[data-print-mode="stickers"] .print-adesivo-item span { font-size: 8px; margin-top: 4px; line-height: 1; }
            body[data-print-mode="stickers"] #papelReceita { display: none !important; }
        }
      `}} />
    </div>
  );
}
