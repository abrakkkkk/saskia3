'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { EmptyState, ErrorState, LoadingState, Tabs } from '@/components/ui';
import PacienteSelect, { cpfParcial, formatarNascimento, type PacienteOpcao } from '@/components/ui/PacienteSelect';
import AdesivosManager from '@/components/receituario/adesivos/AdesivosManager';
import { type Adesivo } from '@/components/receituario/adesivos/catalog';
import { termosDeAlergia } from '@/lib/alergias';
import { pode } from '@/lib/permissions';
import { mensagemErro, textoDoErro } from '@/lib/resposta';
import '@/components/ui/modulo.css';
import './receituario.css';

// As sugestões terapêuticas do sistema anterior foram removidas: não eram um formulário institucional validado.

interface Medicamento {
  id: number;
  viaUso: string;
  conteudo: string;
}

type ReceitaSalva = {
  id: string;
  createdAt: string;
  observacoes: string | null;
  profissional: string | null;
  medicamentos: { viaUso?: string; conteudo?: string }[];
};

type Aba = 'receituario' | 'historico' | 'adesivos';

const TITULO = 'RECEITUÁRIO';
const SUBTITULO = 'RECEITA MÉDICA - VIA DO PACIENTE';
const ABAS = [
  { id: 'receituario', label: 'Editor de receita', icon: 'las la-prescription-bottle' },
  { id: 'historico', label: 'Histórico do paciente', icon: 'las la-history' },
  { id: 'adesivos', label: 'Adesivos', icon: 'las la-tag' },
] as const;

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
  const cargo = session?.user?.cargo;
  const isMedico = pode(cargo, 'prescricao:registrar');
  const podeVerHistorico = pode(cargo, 'prescricao:ler');

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [activeTab, setActiveTab] = useState<Aba>('receituario');
  const [estabelecimento, setEstabelecimento] = useState('');

  const [pacienteId, setPacienteId] = useState('');
  const [paciente, setPaciente] = useState<PacienteOpcao | null>(null);
  const [alergias, setAlergias] = useState<string | null>(null);
  const [historico, setHistorico] = useState<ReceitaSalva[]>([]);
  const [carregandoPaciente, setCarregandoPaciente] = useState(false);
  const [erroPaciente, setErroPaciente] = useState('');

  const [registro, setRegistro] = useState('');
  const [autorRegistro, setAutorRegistro] = useState('');
  const [salvandoPrescricao, setSalvandoPrescricao] = useState(false);
  const [erroAcao, setErroAcao] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [alergiasCitadas, setAlergiasCitadas] = useState<string[]>([]);
  const [alergiaConfirmada, setAlergiaConfirmada] = useState(false);

  const [modalAdesivosAberto, setModalAdesivosAberto] = useState(false);
  const [editorAtivoIndex, setEditorAtivoIndex] = useState<number | null>(null);

  const editorRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  // Trava síncrona contra duplo clique: o estado só muda no próximo render.
  const salvandoRef = useRef(false);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    let ativo = true;
    (async () => {
      try {
        const resposta = await fetch('/api/me');
        const dados = await resposta.json();
        if (ativo && resposta.ok && typeof dados.hospital?.nome === 'string') setEstabelecimento(dados.hospital.nome);
      } catch {
        // O estabelecimento fica vazio e a impressão permanece bloqueada.
      }
    })();
    return () => { ativo = false; };
  }, [sessionStatus]);

  const carregarPaciente = useCallback(async (id: string) => {
    setCarregandoPaciente(true);
    setErroPaciente('');
    try {
      const resposta = await fetch(`/api/receitas?pacienteId=${encodeURIComponent(id)}`);
      if (!resposta.ok) throw new Error(await mensagemErro(resposta, 'Não foi possível carregar os dados do paciente.'));
      const dados = await resposta.json();
      setAlergias(typeof dados.paciente?.alergias === 'string' ? dados.paciente.alergias : '');
      setHistorico(Array.isArray(dados.receitas) ? dados.receitas : []);
    } catch (erro) {
      setAlergias(null);
      setHistorico([]);
      setErroPaciente(textoDoErro(erro, 'Não foi possível carregar os dados do paciente.'));
    } finally {
      setCarregandoPaciente(false);
    }
  }, []);

  const invalidarRegistro = () => {
    setRegistro('');
    setAutorRegistro('');
    setSucesso('');
  };

  const selecionarPaciente = (id: string, selecionado: PacienteOpcao | null) => {
    setPacienteId(id);
    setPaciente(selecionado);
    setAlergias(null);
    setHistorico([]);
    setAlergiasCitadas([]);
    setAlergiaConfirmada(false);
    invalidarRegistro();
    if (id && podeVerHistorico) void carregarPaciente(id);
  };

  const saveDadosMemoria = (meds: Medicamento[]) => {
    setMedicamentos(meds);
    setAlergiasCitadas([]);
    setAlergiaConfirmada(false);
    invalidarRegistro();
  };

  const addMedicamento = () => saveDadosMemoria([...medicamentos, { id: Date.now(), viaUso: 'Oral', conteudo: '' }]);
  const removerMedicamento = (idx: number) => saveDadosMemoria(medicamentos.filter((_, i) => i !== idx));
  const atualizarViaUso = (idx: number, val: string) => saveDadosMemoria(medicamentos.map((med, i) => (i === idx ? { ...med, viaUso: val } : med)));

  const handleEditorInput = (idx: number, html: string) => {
    const conteudo = sanitizeRecipeHtml(html);
    // Sair do campo sem editar não pode invalidar a receita já salva.
    if (medicamentos[idx]?.conteudo === conteudo) return;
    saveDadosMemoria(medicamentos.map((med, i) => (i === idx ? { ...med, conteudo } : med)));
  };

  const inserirTextoEditor = (idx: number, texto: string) => {
    const ref = editorRefs.current[idx];
    if (ref) {
      ref.insertAdjacentText('beforeend', texto);
      handleEditorInput(idx, ref.innerHTML);
    }
  };

  const inserirCaractere = (c: string) => {
    if (editorAtivoIndex !== null) inserirTextoEditor(editorAtivoIndex, c);
  };

  const inserirAdesivo = (adesivo: Adesivo) => {
    if (editorAtivoIndex === null) return;
    const ref = editorRefs.current[editorAtivoIndex];
    if (ref) {
      const imagem = document.createElement('img');
      imagem.src = `/adesivos/${adesivo.pasta}/${adesivo.arquivo}`;
      imagem.alt = adesivo.nome;
      ref.appendChild(imagem);
      handleEditorInput(editorAtivoIndex, ref.innerHTML);
    }
  };

  const salvarPrescricao = async () => {
    if (salvandoRef.current || !isMedico) return;
    setErroAcao('');
    setSucesso('');
    if (!pacienteId) {
      setErroAcao('Selecione o paciente para salvar a receita.');
      return;
    }
    if (medicamentos.length === 0) {
      setErroAcao('Adicione ao menos um item prescrito.');
      return;
    }

    salvandoRef.current = true;
    setSalvandoPrescricao(true);
    try {
      const res = await fetch('/api/receitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacienteId, medicamentos, observacoes: TITULO, alergiaConfirmada }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.codigo === 'ALERGIA_NAO_CONFIRMADA' && Array.isArray(data.alergias)) {
          setAlergiasCitadas(data.alergias);
          setAlergiaConfirmada(false);
          return;
        }
        throw new Error(typeof data?.error === 'string' ? data.error : 'Não foi possível salvar a receita.');
      }
      setRegistro(data.id);
      setAutorRegistro(typeof data.profissional === 'string' ? data.profissional : '');
      setAlergiasCitadas([]);
      setSucesso('Receita salva. A impressão está liberada.');
      await carregarPaciente(pacienteId);
    } catch (erro) {
      setErroAcao(textoDoErro(erro, 'Não foi possível salvar a receita.'));
    } finally {
      salvandoRef.current = false;
      setSalvandoPrescricao(false);
    }
  };

  const limparTudo = async () => {
    if (await confirm('Limpar todo o receituário?')) {
      saveDadosMemoria([]);
      selecionarPaciente('', null);
      setErroAcao('');
    }
  };

  const temAlergiaRegistrada = termosDeAlergia(alergias).length > 0;

  if (sessionStatus === 'loading') return <LoadingState message="Carregando receituário..." />;

  return (
    <div className={`container-receituario ${isMedico ? '' : 'receituario-restrito'}`}>
      <div className="sidebar-receita hide-on-print">
        {isMedico && <>
          <div className="professional-switcher">
            <p className="professional-rotulo"><i className="las la-user-md" aria-hidden="true"></i> Profissional da sessão</p>
            <span className="perfil-btn ativo"><i className="las la-stethoscope" aria-hidden="true"></i> {session?.user?.name || 'Médico'}</span>
          </div>
          <button type="button" className="cta-button" onClick={addMedicamento}><i className="las la-plus-circle" aria-hidden="true"></i> Adicionar prescrição</button>
          <div role="note" className="aviso-permissao"><i className="las la-info-circle" aria-hidden="true"></i> Catálogo institucional não integrado. A receita é preenchida pelo profissional, sem sugestões automáticas de medicamentos.</div>
        </>}
      </div>

      <div className="main-receita">
        <div className="hide-on-print">
          <Tabs tabs={ABAS} active={activeTab} onChange={setActiveTab} label="Seções do receituário" />

          {erroAcao && <p className="mod-aviso mod-aviso-erro" role="alert">{erroAcao}</p>}
          {sucesso && <p className="mod-aviso mod-aviso-sucesso" role="status">{sucesso}</p>}

          {activeTab !== 'adesivos' && podeVerHistorico && (
            <section className="papel-receita rec-identificacao" aria-label="Identificação do paciente">
              <PacienteSelect value={pacienteId} onChange={selecionarPaciente} required />

              {erroPaciente && <ErrorState message={erroPaciente} onRetry={() => void carregarPaciente(pacienteId)} />}
              {pacienteId && !erroPaciente && !carregandoPaciente && alergias !== null && (
                temAlergiaRegistrada ? (
                  <div className="rec-alergia rec-alergia-sim" role="alert">
                    <strong><i className="las la-exclamation-triangle" aria-hidden="true"></i> ALERGIAS REGISTRADAS</strong>
                    <p className="mod-texto-longo">{alergias}</p>
                  </div>
                ) : (
                  <div className="rec-alergia rec-alergia-nao" role="status">
                    <strong>Alergias: </strong>{alergias.trim() || 'não informadas. Confirme com o paciente.'}
                  </div>
                )
              )}
              <p className="mod-nota rec-limitacao">Sem catálogo de medicamentos, o sistema só compara o texto prescrito com o texto da alergia. Nome comercial e classe farmacológica não são reconhecidos: a conferência é do prescritor.</p>
            </section>
          )}

          {alergiasCitadas.length > 0 && activeTab === 'receituario' && (
            <section className="mod-aviso mod-aviso-erro" role="alert">
              <strong>A prescrição cita alergia registrada: {alergiasCitadas.join(', ')}.</strong>
              <label className="rec-confirmacao">
                <input type="checkbox" checked={alergiaConfirmada} onChange={e => setAlergiaConfirmada(e.target.checked)} />
                <span>Revisei a alergia e confirmo esta prescrição. A confirmação fica registrada na auditoria.</span>
              </label>
            </section>
          )}
        </div>

        {activeTab === 'receituario' && !isMedico && <div role="status" className="papel-receita">A criação e impressão de prescrições está disponível apenas para médicos.</div>}

        {activeTab === 'receituario' && isMedico && (
          <div className="toolbar-receita hide-on-print">
            <button type="button" className="tool-btn" disabled={medicamentos.length === 0} onClick={() => { setEditorAtivoIndex(medicamentos.length - 1); setModalAdesivosAberto(true); }}><i className="las la-tag" aria-hidden="true"></i> Inserir adesivo</button>
            <button type="button" className="tool-btn tool-btn-salvar" onClick={() => void salvarPrescricao()} disabled={salvandoPrescricao || !!registro || (alergiasCitadas.length > 0 && !alergiaConfirmada)}><i className="las la-save" aria-hidden="true"></i> {salvandoPrescricao ? 'Salvando…' : registro ? 'Receita salva' : 'Salvar no prontuário'}</button>
            <button type="button" className="tool-btn" onClick={() => window.print()} disabled={!registro || !estabelecimento} title={registro ? 'Imprimir receita salva' : 'Salve a receita para liberar a impressão'}><i className="las la-print" aria-hidden="true"></i> Imprimir</button>
            <button type="button" className="tool-btn danger" onClick={() => void limparTudo()}><i className="las la-trash-alt" aria-hidden="true"></i> Limpar tudo</button>
          </div>
        )}

        {activeTab === 'receituario' && isMedico && (
          <div className="papel-receita" id="papelReceita">
            <h1 id="tituloDocumento">{TITULO}</h1>
            <div className="subtitulo" id="subtituloDocumento">{SUBTITULO}</div>

            <div className="form-row hide-on-print">
              <div className="form-campo">
                <label htmlFor="receituario-estabelecimento">ESTABELECIMENTO DE SAÚDE (Institucional):</label>
                <input id="receituario-estabelecimento" className="rec-somente-leitura" type="text" value={estabelecimento} readOnly title="Vinculado automaticamente à unidade da sua sessão" />
              </div>
              <div className="form-campo">
                <label htmlFor="receituario-registro">CÓDIGO DO REGISTRO:</label>
                <input id="receituario-registro" className="rec-somente-leitura rec-registro" type="text" value={registro || 'Rascunho: ainda não registrado'} readOnly title="O código é atribuído pelo servidor ao salvar" />
              </div>
            </div>

            <div className="print-header">
              <p><strong>Estabelecimento:</strong> {estabelecimento}</p>
              <p><strong>Registro:</strong> {registro}</p>
              {paciente && <p className="print-paciente"><strong>Paciente:</strong> {paciente.nome}</p>}
              {paciente && <p>{formatarNascimento(paciente.nascimento)} | {cpfParcial(paciente.cpf)}</p>}
              <hr />
            </div>

            <div className="medicamentos-list">
              {medicamentos.length === 0 ? (
                <div className="rec-vazio hide-on-print">
                  <i className="las la-capsules" aria-hidden="true"></i>
                  <p>Nenhum medicamento adicionado</p>
                </div>
              ) : (
                medicamentos.map((med, idx) => (
                  <div className="medicamento-card" key={med.id}>
                    <div className="card-header hide-on-print">
                      <select aria-label={`Via de uso da prescrição ${idx + 1}`} value={med.viaUso} onChange={e => atualizarViaUso(idx, e.target.value)}>
                        <option value="Oral">Oral</option>
                        <option value="Intravenosa">IV</option>
                        <option value="Intramuscular">IM</option>
                        <option value="Tópica">Tópica</option>
                      </select>
                      <span className="card-title">Prescrição {idx + 1}</span>
                      <button type="button" className="btn-remove-card" aria-label={`Remover prescrição ${idx + 1}`} onClick={() => removerMedicamento(idx)}><i className="las la-trash" aria-hidden="true"></i></button>
                    </div>
                    <div className="print-via-uso">Uso: {med.viaUso}</div>

                    <div
                      className="editor-custom"
                      contentEditable
                      role="textbox"
                      aria-label={`Conteúdo da prescrição ${idx + 1}`}
                      aria-multiline="true"
                      suppressContentEditableWarning
                      ref={el => { if (el) { editorRefs.current[idx] = el; } }}
                      onBlur={e => handleEditorInput(idx, e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: sanitizeRecipeHtml(med.conteudo) }}
                    />

                    <div className="card-footer hide-on-print">
                      <button className="icon-btn" type="button" title="Inserir adesivo" aria-label="Inserir adesivo" onClick={() => { setEditorAtivoIndex(idx); setModalAdesivosAberto(true); }}><i className="las la-smile-wink" aria-hidden="true"></i></button>
                      <button className="icon-btn" type="button" title="Inserir data de hoje" aria-label="Inserir data de hoje" onClick={() => inserirTextoEditor(idx, new Date().toLocaleDateString('pt-BR'))}><i className="las la-calendar" aria-hidden="true"></i></button>
                      <button className="icon-btn" type="button" title="Inserir marca de conferência" aria-label="Inserir marca de conferência" onClick={() => inserirTextoEditor(idx, ' ✓ ')}><i className="las la-check-circle" aria-hidden="true"></i></button>
                      <button className="icon-btn" type="button" title="Inserir marca de atenção" aria-label="Inserir marca de atenção" onClick={() => inserirTextoEditor(idx, ' ✗ ')}><i className="las la-times-circle" aria-hidden="true"></i></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="data-receita">
              <i className="las la-calendar" aria-hidden="true"></i> Data: {new Date().toLocaleDateString('pt-BR')}
            </div>

            <div className="assinatura-area">
              <div className="assinatura-item">
                <div className="linha"></div>
                <p>{autorRegistro || session?.user?.name || 'Assinatura do profissional'}</p>
              </div>
              <div className="assinatura-item">
                <div className="linha"></div>
                <p>Carimbo / Registro</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="papel-receita hide-on-print">
            <h2><i className="las la-history" aria-hidden="true"></i> Receitas salvas{paciente ? ` de ${paciente.nome}` : ''}</h2>
            {!podeVerHistorico ? <p>Seu cargo não tem acesso ao histórico de prescrições.</p>
              : !pacienteId ? <EmptyState icon="las la-user" message="Selecione o paciente para ver o histórico." />
              : carregandoPaciente ? <LoadingState message="Carregando histórico..." />
              : historico.length === 0 ? <EmptyState icon="las la-file-prescription" message="Nenhuma receita salva para este paciente." />
              : historico.map(h => (
                <article key={h.id} className="rec-historico-item">
                  <strong>{new Date(h.createdAt).toLocaleString('pt-BR')}</strong>
                  <p className="mod-secundario">{h.observacoes} | Profissional: {h.profissional || 'não registrado'}</p>
                  <ul>
                    {(Array.isArray(h.medicamentos) ? h.medicamentos : []).map((m, i) => (
                      <li key={i}><strong>Uso {m.viaUso}:</strong> <span dangerouslySetInnerHTML={{ __html: sanitizeRecipeHtml(typeof m.conteudo === 'string' ? m.conteudo : '') }} /></li>
                    ))}
                  </ul>
                </article>
              ))}
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
    </div>
  );
}
