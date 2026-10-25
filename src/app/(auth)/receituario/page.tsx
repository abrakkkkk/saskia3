'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import './receituario.css';

// As sugestões terapêuticas do sistema anterior foram removidas: não eram um formulário institucional validado.

const adesivosCombinados = [
  { "nome": "1", "arquivo": "1.png", "icone": "las la-tag" },
  { "nome": "10", "arquivo": "10.jpg", "icone": "las la-tag" },
  { "nome": "11", "arquivo": "11.jpg", "icone": "las la-tag" },
  { "nome": "12", "arquivo": "12.jpg", "icone": "las la-tag" },
  { "nome": "13", "arquivo": "13.jpg", "icone": "las la-tag" },
  { "nome": "14", "arquivo": "14.jpg", "icone": "las la-tag" },
  { "nome": "15", "arquivo": "15.jpg", "icone": "las la-tag" },
  { "nome": "16", "arquivo": "16.jpg", "icone": "las la-tag" },
  { "nome": "17", "arquivo": "17.jpg", "icone": "las la-tag" },
  { "nome": "18", "arquivo": "18.jpg", "icone": "las la-tag" },
  { "nome": "19", "arquivo": "19.jpg", "icone": "las la-tag" },
  { "nome": "2", "arquivo": "2.png", "icone": "las la-tag" },
  { "nome": "20", "arquivo": "20.jpg", "icone": "las la-tag" },
  { "nome": "21", "arquivo": "21.jpg", "icone": "las la-tag" },
  { "nome": "22", "arquivo": "22.jpg", "icone": "las la-tag" },
  { "nome": "23", "arquivo": "23.jpg", "icone": "las la-tag" },
  { "nome": "24", "arquivo": "24.jpg", "icone": "las la-tag" },
  { "nome": "25", "arquivo": "25.jpg", "icone": "las la-tag" },
  { "nome": "26", "arquivo": "26.jpg", "icone": "las la-tag" },
  { "nome": "27", "arquivo": "27.jpg", "icone": "las la-tag" },
  { "nome": "28", "arquivo": "28.jpg", "icone": "las la-tag" },
  { "nome": "29", "arquivo": "29.jpg", "icone": "las la-tag" },
  { "nome": "3", "arquivo": "3.png", "icone": "las la-tag" },
  { "nome": "30", "arquivo": "30.jpg", "icone": "las la-tag" },
  { "nome": "31", "arquivo": "31.jpg", "icone": "las la-tag" },
  { "nome": "32", "arquivo": "32.jpg", "icone": "las la-tag" },
  { "nome": "33", "arquivo": "33.jpg", "icone": "las la-tag" },
  { "nome": "34", "arquivo": "34.jpg", "icone": "las la-tag" },
  { "nome": "35", "arquivo": "35.jpg", "icone": "las la-tag" },
  { "nome": "36", "arquivo": "36.jpg", "icone": "las la-tag" },
  { "nome": "37", "arquivo": "37.jpg", "icone": "las la-tag" },
  { "nome": "38", "arquivo": "38.jpg", "icone": "las la-tag" },
  { "nome": "39", "arquivo": "39.jpg", "icone": "las la-tag" },
  { "nome": "4", "arquivo": "4.png", "icone": "las la-tag" },
  { "nome": "40", "arquivo": "40.jpg", "icone": "las la-tag" },
  { "nome": "41", "arquivo": "41.jpg", "icone": "las la-tag" },
  { "nome": "42", "arquivo": "42.jpg", "icone": "las la-tag" },
  { "nome": "43", "arquivo": "43.jpg", "icone": "las la-tag" },
  { "nome": "44", "arquivo": "44.jpg", "icone": "las la-tag" },
  { "nome": "45", "arquivo": "45.jpg", "icone": "las la-tag" },
  { "nome": "46", "arquivo": "46.jpg", "icone": "las la-tag" },
  { "nome": "47", "arquivo": "47.jpg", "icone": "las la-tag" },
  { "nome": "48", "arquivo": "48.jpg", "icone": "las la-tag" },
  { "nome": "5", "arquivo": "5.png", "icone": "las la-tag" },
  { "nome": "6", "arquivo": "6.jpg", "icone": "las la-tag" },
  { "nome": "7", "arquivo": "7.jpg", "icone": "las la-tag" },
  { "nome": "8", "arquivo": "8.jpg", "icone": "las la-tag" },
  { "nome": "9", "arquivo": "9.jpg", "icone": "las la-tag" }
];
const adesivosMotivos = [
  { "nome": "002 stomach ache", "arquivo": "002-stomach-ache.png", "icone": "las la-tag" },
  { "nome": "003 pain", "arquivo": "003-pain.png", "icone": "las la-tag" },
  { "nome": "004 muscle pain", "arquivo": "004-muscle-pain.png", "icone": "las la-tag" },
  { "nome": "005 neck", "arquivo": "005-neck.png", "icone": "las la-tag" },
  { "nome": "006 backbone", "arquivo": "006-backbone.png", "icone": "las la-tag" },
  { "nome": "007 piolhos", "arquivo": "007-piolhos.png", "icone": "las la-tag" },
  { "nome": "008 stomach flu", "arquivo": "008-stomach-flu.png", "icone": "las la-tag" },
  { "nome": "009 stomach", "arquivo": "009-stomach.png", "icone": "las la-tag" },
  { "nome": "010 dor abdominal", "arquivo": "010-dor-abdominal.png", "icone": "las la-tag" },
  { "nome": "011 back pain", "arquivo": "011-back-pain.png", "icone": "las la-tag" },
  { "nome": "011 shoulder", "arquivo": "011-shoulder.png", "icone": "las la-tag" },
  { "nome": "012 eye", "arquivo": "012-eye.png", "icone": "las la-tag" },
  { "nome": "012 ZEAR", "arquivo": "012-ZEAR.png", "icone": "las la-tag" },
  { "nome": "012 ZZEAR", "arquivo": "012-ZZEAR.png", "icone": "las la-tag" },
  { "nome": "014 estomago", "arquivo": "014-estomago.png", "icone": "las la-tag" },
  { "nome": "019 pain", "arquivo": "019-pain.png", "icone": "las la-tag" },
  { "nome": "021 contorno em forma de coracao", "arquivo": "021-contorno-em-forma-de-coracao.png", "icone": "las la-tag" },
  { "nome": "023 anti histaminicos", "arquivo": "023-anti-histaminicos.png", "icone": "las la-tag" },
  { "nome": "024 pulmao", "arquivo": "024-pulmao.png", "icone": "las la-tag" },
  { "nome": "025 rim", "arquivo": "025-rim.png", "icone": "las la-tag" },
  { "nome": "026 coceira", "arquivo": "026-coceira.png", "icone": "las la-tag" },
  { "nome": "027 alergia", "arquivo": "027-alergia.png", "icone": "las la-tag" },
  { "nome": "028 dor de garganta", "arquivo": "028-dor-de-garganta.png", "icone": "las la-tag" },
  { "nome": "029 dor de garganta 1", "arquivo": "029-dor-de-garganta-1.png", "icone": "las la-tag" },
  { "nome": "030 espirrar", "arquivo": "030-espirrar.png", "icone": "las la-tag" },
  { "nome": "031 dor de cabeca", "arquivo": "031-dor-de-cabeca.png", "icone": "las la-tag" },
  { "nome": "032 otorrinolaringologia", "arquivo": "032-otorrinolaringologia.png", "icone": "las la-tag" },
  { "nome": "033 coriza", "arquivo": "033-coriza.png", "icone": "las la-tag" },
  { "nome": "035 quit smoking", "arquivo": "035-quit-smoking.png", "icone": "las la-tag" },
  { "nome": "037 neck", "arquivo": "037-neck.png", "icone": "las la-tag" },
  { "nome": "038 colesterol", "arquivo": "038-colesterol.png", "icone": "las la-tag" },
  { "nome": "039 injury", "arquivo": "039-injury.png", "icone": "las la-tag" },
  { "nome": "040 shin", "arquivo": "040-shin.png", "icone": "las la-tag" },
  { "nome": "37 hemorroidas", "arquivo": "37-hemorroidas.png", "icone": "las la-tag" },
  { "nome": "coracao", "arquivo": "coracao.png", "icone": "las la-tag" },
  { "nome": "disuria homem", "arquivo": "disuria homem.png", "icone": "las la-tag" },
  { "nome": "disuria mulher", "arquivo": "disuria mulher.png", "icone": "las la-tag" },
  { "nome": "glicemia", "arquivo": "glicemia.png", "icone": "las la-tag" },
  { "nome": "pressao", "arquivo": "pressao.png", "icone": "las la-tag" },
  { "nome": "tontura", "arquivo": "tontura.png", "icone": "las la-tag" },
  { "nome": "tosse (1)", "arquivo": "tosse (1).png", "icone": "las la-tag" },
  { "nome": "tosse", "arquivo": "tosse.png", "icone": "las la-tag" },
  { "nome": "vomito", "arquivo": "vomito.png", "icone": "las la-tag" }
];
const adesivosVias = [
  { "nome": "001 contorno de seringa", "arquivo": "001-contorno-de-seringa.png", "icone": "las la-tag" },
  { "nome": "001 xarope", "arquivo": "001-xarope.png", "icone": "las la-tag" },
  { "nome": "002 xarope 1", "arquivo": "002-xarope-1.png", "icone": "las la-tag" },
  { "nome": "003 xarope 2", "arquivo": "003-xarope-2.png", "icone": "las la-tag" },
  { "nome": "004 nebulizer", "arquivo": "004-nebulizer.png", "icone": "las la-tag" },
  { "nome": "005 supositorio", "arquivo": "005 supositorio.png", "icone": "las la-tag" },
  { "nome": "005 supositorios", "arquivo": "005 supositorios.png", "icone": "las la-tag" },
  { "nome": "005 zbunda", "arquivo": "005 zbunda.png", "icone": "las la-tag" },
  { "nome": "005 colirio", "arquivo": "005-colirio.png", "icone": "las la-tag" },
  { "nome": "005 injecao", "arquivo": "005-injecao.png", "icone": "las la-tag" },
  { "nome": "006 pingo dagua", "arquivo": "006-pingo-dagua.png", "icone": "las la-tag" },
  { "nome": "009 hair washing", "arquivo": "009-hair-washing.png", "icone": "las la-tag" },
  { "nome": "010 asma", "arquivo": "010-asma.png", "icone": "las la-tag" },
  { "nome": "029 drink water", "arquivo": "029-drink-water.png", "icone": "las la-tag" },
  { "nome": "034 spray nasal", "arquivo": "034-spray-nasal.png", "icone": "las la-tag" },
  { "nome": "036 vacinacao", "arquivo": "036-vacinacao.png", "icone": "las la-tag" },
  { "nome": "2 capsulas comprimido vertical", "arquivo": "2 capsulas comprimido vertical.jpg", "icone": "las la-tag" },
  { "nome": "2 comprimidos", "arquivo": "2-comprimidos.jpg", "icone": "las la-tag" },
  { "nome": "banda de comprimido", "arquivo": "banda de comprimido.jpg", "icone": "las la-tag" },
  { "nome": "CANETA NPH ICONE", "arquivo": "CANETA NPH ICONE.png", "icone": "las la-tag" },
  { "nome": "CANETA REGULAR ICONE", "arquivo": "CANETA REGULAR ICONE.png", "icone": "las la-tag" },
  { "nome": "Capsula comprimido vertical", "arquivo": "Capsula comprimido vertical.jpg", "icone": "las la-tag" },
  { "nome": "Capsula comprimido", "arquivo": "Capsula comprimido.jpg", "icone": "las la-tag" },
  { "nome": "Comprimido", "arquivo": "Comprimido.jpg", "icone": "las la-tag" },
  { "nome": "FARMÁCIA POPULAR ÍCONE", "arquivo": "FARMÁCIA POPULAR ÍCONE.png", "icone": "las la-tag" },
  { "nome": "lixa de unha", "arquivo": "lixa-de-unha.png", "icone": "las la-tag" },
  { "nome": "lixador de unha", "arquivo": "lixador-de-unha.png", "icone": "las la-tag" },
  { "nome": "sache soluvel", "arquivo": "sache soluvel.png", "icone": "las la-tag" },
  { "nome": "vasto lateral", "arquivo": "vasto lateral.png", "icone": "las la-tag" },
  { "nome": "ícone colírio", "arquivo": "ícone colírio.png", "icone": "las la-tag" }
];
const todosAdesivos = [
    ...adesivosCombinados.map(a => ({ ...a, categoria: "combinados", pasta: "Combinados" })),
    ...adesivosMotivos.map(a => ({ ...a, categoria: "motivo", pasta: "Motivos de uso" })),
    ...adesivosVias.map(a => ({ ...a, categoria: "viauso", pasta: "Vias de ADM de uso" }))
];

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
  const { data: session } = useSession();
  const isMedico = (session?.user as any)?.cargo === 'MEDICO';
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
  const [filtroAdesivo, setFiltroAdesivo] = useState('todos');

  // Gerador de Adesivos
  const [bandejaAdesivos, setBandejaAdesivos] = useState<{pasta: string, arquivo: string, nome: string, qtd: number}[]>([]);
  const [isPrintingAdesivos, setIsPrintingAdesivos] = useState(false);

  const editorRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  const carregarDados = async () => {
    try {
      const [resPacientes, resReceitas] = await Promise.all([
        fetch('/api/pacientes'),
        fetch('/api/receitas')
      ]);
      if(resPacientes.ok) setPacientes(await resPacientes.json());
      else throw new Error('Não foi possível carregar pacientes para a prescrição.');
      if(resReceitas.ok) {
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
  };

  useEffect(() => {
    carregarDados();
    try {
      fetch('/api/me').then(async response => {
        const data = await response.json();
        if (response.ok && typeof data.hospital?.nome === 'string') setEstabelecimento(data.hospital.nome);
      }).catch(() => {});
    } catch {}
  }, []);

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

  const inserirAdesivo = (pasta: string, arquivo: string, nome: string) => {
    if (editorAtivoIndex !== null) {
      const ref = editorRefs.current[editorAtivoIndex];
      if (ref) {
        const img = `<img src="/adesivos/${pasta}/${arquivo}" alt="${nome}" style="max-width: 64px; max-height: 64px; vertical-align: middle; margin: 4px;" />`;
        ref.innerHTML += img;
        handleEditorInput(editorAtivoIndex, ref.innerHTML);
      }
    }
    setModalAdesivosAberto(false);
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

  const addAdesivoBandeja = (pasta: string, arquivo: string, nome: string) => {
    setBandejaAdesivos(prev => {
      const idx = prev.findIndex(a => a.pasta === pasta && a.arquivo === arquivo);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx].qtd++;
        return novo;
      }
      return [...prev, { pasta, arquivo, nome, qtd: 1 }];
    });
  };

  const removerAdesivoBandeja = (idx: number) => {
    setBandejaAdesivos(prev => prev.filter((_, i) => i !== idx));
  };

  const alterarQtdAdesivo = (idx: number, delta: number) => {
    setBandejaAdesivos(prev => {
      const novo = [...prev];
      novo[idx].qtd += delta;
      if (novo[idx].qtd < 1) novo[idx].qtd = 1;
      return novo;
    });
  };

  const imprimirAdesivosBtn = () => {
    if (bandejaAdesivos.length === 0) {
      alert(" Adicione adesivos à bandeja para imprimir!");
      return;
    }
    setIsPrintingAdesivos(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrintingAdesivos(false), 500);
    }, 200);
  };

  const limparTudo = async () => {
    if (await confirm("Limpar todo o receituário?")) {
      saveDadosMemoria([]);
      setPacienteId('');
      setNomePaciente('');
      setRegistro('');
    }
  };

  const listaAdesivosFiltrados = filtroAdesivo === 'todos' ? todosAdesivos : todosAdesivos.filter(a => a.categoria === filtroAdesivo);

  const pacienteNomeExibido = pacienteId ? pacientes.find(p => p.id === pacienteId)?.nome : nomePaciente;

  return (
    <div className="container-receituario">
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
        <div className="tabs-receita hide-on-print">
          <button className={`tab-btn ${activeTab === 'receituario' ? 'ativo' : ''}`} onClick={() => setActiveTab('receituario')}><i className="las la-prescription-bottle"></i> Editor de Receita</button>
          <button className={`tab-btn ${activeTab === 'historico' ? 'ativo' : ''}`} onClick={() => setActiveTab('historico')}><i className="las la-history"></i> Histórico do Paciente</button>
          <button className={`tab-btn ${activeTab === 'adesivos' ? 'ativo' : ''}`} onClick={() => setActiveTab('adesivos')}><i className="las la-tag"></i> Adesivos</button>
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
                <label>ESTABELECIMENTO DE SAÚDE (Institucional):</label>
                <input
                  type="text"
                  value={estabelecimento}
                  readOnly
                  style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', color: '#1e293b', fontWeight: 600, border: '1px solid #cbd5e1' }}
                  title="Vinculado automaticamente à unidade de atendimento da sua sessão"
                />
              </div>
              <div className="form-campo">
                <label>CÓDIGO DO REGISTRO:</label>
                <input
                  type="text"
                  value={registro || 'Rascunho — ainda não registrado'}
                  readOnly
                  style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed', color: '#0369a1', fontWeight: 700, border: '1px solid #cbd5e1' }}
                  title="O código real é atribuído pelo servidor após salvar no prontuário"
                />
              </div>
            </div>
            <div className="form-campo hide-on-print">
              <label>PACIENTE CADASTRADO (Para Prontuário):</label>
              <select value={pacienteId} onChange={e => {setPacienteId(e.target.value); setNomePaciente('');}}>
                <option value="">Selecione...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            {!pacienteId && (
              <div className="form-campo hide-on-print">
                <label>NOME DO PACIENTE (Impressão Avulsa):</label>
                <input type="text" value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Nome completo do paciente" />
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
                      <select value={med.viaUso} onChange={e => atualizarViaUso(idx, e.target.value)}>
                        <option value="Oral">Oral</option>
                        <option value="Intravenosa">IV</option>
                        <option value="Intramuscular">IM</option>
                        <option value="Tópica">Tópica</option>
                      </select>
                      <span className="card-title">Prescrição {idx + 1}</span>
                      <button className="btn-remove-card" onClick={() => removerMedicamento(idx)}><i className="las la-trash"></i></button>
                    </div>
                    <div className="print-via-uso" style={{display:'none', fontWeight:'bold', marginBottom:'5px'}}>Uso: {med.viaUso}</div>

                    <div
                      className="editor-custom"
                      contentEditable
                      suppressContentEditableWarning
                      ref={el => { if(el) { editorRefs.current[idx] = el; } }}
                      onBlur={e => handleEditorInput(idx, e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: sanitizeRecipeHtml(med.conteudo) }}
                      style={{ whiteSpace: 'pre-wrap' }}
                    />

                    <div className="card-footer hide-on-print">
                      <button className="icon-btn" onClick={() => { setEditorAtivoIndex(idx); setModalAdesivosAberto(true); }}><i className="las la-smile-wink"></i></button>
                      <button className="icon-btn" onClick={() => inserirTextoEditor(idx, '')}><i className="las la-calendar"></i></button>
                      <button className="icon-btn" onClick={() => inserirTextoEditor(idx, '')}><i className="las la-check-circle"></i></button>
                      <button className="icon-btn" onClick={() => inserirTextoEditor(idx, '')}><i className="las la-times-circle"></i></button>
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

        {activeTab === 'adesivos' && (
          <div className="papel-receita">
            <h2><i className="las la-tag"></i> Gerador de Adesivos</h2>
            <p style={{color: '#64748b', marginBottom: '20px'}}>Selecione os adesivos abaixo para adicioná-los à sua cartela de impressão.</p>

            <div className="modal-tabs" style={{marginBottom: '15px'}}>
              <button className={`modal-tab ${filtroAdesivo === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltroAdesivo('todos')}><i className="las la-list-ul"></i> Todos</button>
              <button className={`modal-tab ${filtroAdesivo === 'combinados' ? 'ativo' : ''}`} onClick={() => setFiltroAdesivo('combinados')}><i className="las la-puzzle-piece"></i> Combinados</button>
              <button className={`modal-tab ${filtroAdesivo === 'motivo' ? 'ativo' : ''}`} onClick={() => setFiltroAdesivo('motivo')}><i className="las la-question-circle"></i> Motivos</button>
              <button className={`modal-tab ${filtroAdesivo === 'viauso' ? 'ativo' : ''}`} onClick={() => setFiltroAdesivo('viauso')}><i className="las la-syringe"></i> Vias ADM</button>
            </div>

            <div className="adesivos-grid" style={{maxHeight: '300px', marginBottom: '30px', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', background: '#f8fafc'}}>
              {listaAdesivosFiltrados.map((a, i) => (
                <div className="adesivo-item" key={i} onClick={() => addAdesivoBandeja(a.pasta, a.arquivo, a.nome)}>
                  <img src={`/adesivos/${a.pasta}/${a.arquivo}`} alt={a.nome} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.setAttribute('style', 'display:block;font-size:48px;color:#1e3a8a;margin-bottom:8px;'); }} />
                  <i className={a.icone} style={{display:'none'}}></i>
                  <span>{a.nome}</span>
                </div>
              ))}
            </div>

            <div className="bandeja-adesivos">
              <h3 style={{borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px'}}><i className="las la-inbox"></i> Bandeja de Impressão</h3>
              {bandejaAdesivos.length === 0 ? (
                <p style={{color: '#94a3b8', textAlign: 'center', padding: '20px'}}>Nenhum adesivo selecionado.</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px'}}>
                  {bandejaAdesivos.map((b, idx) => (
                    <div key={idx} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '10px 15px', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <img src={`/adesivos/${b.pasta}/${b.arquivo}`} alt={b.nome} style={{width: '40px', height: '40px', objectFit: 'contain'}} />
                        <span style={{fontWeight: 'bold', fontSize: '14px'}}>{b.nome}</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <div style={{display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden'}}>
                          <button onClick={() => alterarQtdAdesivo(idx, -1)} style={{padding: '5px 12px', background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRight: '1px solid #cbd5e1'}}>-</button>
                          <span style={{padding: '5px 15px', minWidth: '40px', textAlign: 'center', fontWeight: 'bold'}}>{b.qtd}</span>
                          <button onClick={() => alterarQtdAdesivo(idx, 1)} style={{padding: '5px 12px', background: '#f1f5f9', border: 'none', cursor: 'pointer', borderLeft: '1px solid #cbd5e1'}}>+</button>
                        </div>
                        <button onClick={() => removerAdesivoBandeja(idx)} style={{background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '20px'}}><i className="las la-trash"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="cta-button" onClick={imprimirAdesivosBtn} disabled={bandejaAdesivos.length === 0} style={{opacity: bandejaAdesivos.length === 0 ? 0.5 : 1}}><i className="las la-print"></i> Imprimir Cartela de Adesivos</button>
            </div>
          </div>
        )}

      </div>

      {/* Modal Adesivos */}
      {modalAdesivosAberto && (
        <div className="modal-adesivos" style={{ display: 'flex' }} onClick={(e) => { if(e.target === e.currentTarget) setModalAdesivosAberto(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <span><i className="las la-smile"></i> Inserir Elemento Visual</span>
              <button onClick={() => setModalAdesivosAberto(false)} style={{background:'none',border:'none',color:'white',fontSize:'24px',cursor:'pointer'}}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="acesso-rapido">
                {['0','1','2','3','4','5','6','7','8','9','mg','ml','h',' '].map(c => (
                  <div className="acesso-numero" key={c} onClick={() => inserirCaractere(c === ' ' ? ' ' : c)}>{c === ' ' ? 'Espaço' : c}</div>
                ))}
              </div>
              <div className="modal-tabs">
                <button className={`modal-tab ${filtroAdesivo === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltroAdesivo('todos')}><i className="las la-list-ul"></i> Todos</button>
                <button className={`modal-tab ${filtroAdesivo === 'combinados' ? 'ativo' : ''}`} onClick={() => setFiltroAdesivo('combinados')}><i className="las la-puzzle-piece"></i> Combinados</button>
                <button className={`modal-tab ${filtroAdesivo === 'motivo' ? 'ativo' : ''}`} onClick={() => setFiltroAdesivo('motivo')}><i className="las la-question-circle"></i> Motivos</button>
                <button className={`modal-tab ${filtroAdesivo === 'viauso' ? 'ativo' : ''}`} onClick={() => setFiltroAdesivo('viauso')}><i className="las la-syringe"></i> Vias ADM</button>
              </div>
              <div className="adesivos-grid">
                {listaAdesivosFiltrados.map((a, i) => (
                  <div className="adesivo-item" key={i} onClick={() => inserirAdesivo(a.pasta, a.arquivo, a.nome)}>
                    {/* Placeholder for images since we don't have the actual assets, but we output the <i> if image fails */}
                    <img src={`/adesivos/${a.pasta}/${a.arquivo}`} alt={a.nome} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.setAttribute('style', 'display:block;font-size:48px;color:#1e3a8a;margin-bottom:8px;'); }} />
                    <i className={a.icone} style={{display:'none'}}></i>
                    <span>{a.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isPrintingAdesivos && (
        <div className="print-adesivos-container">
          {bandejaAdesivos.flatMap((b, idx) =>
            Array.from({ length: b.qtd }).map((_, i) => (
              <div className="print-adesivo-item" key={`${idx}-${i}`}>
                <img src={`/adesivos/${b.pasta}/${b.arquivo}`} alt={b.nome} />
                <span>{b.nome}</span>
              </div>
            ))
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
            body * { visibility: hidden; }
            ${isPrintingAdesivos ? `
              .print-adesivos-container, .print-adesivos-container * { visibility: visible; }
              .print-adesivos-container { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: repeat(auto-fill, minmax(3cm, 1fr)); gap: 10px; align-content: start; }
              .print-adesivo-item { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed #ccc; padding: 5px; text-align: center; height: 3cm; }
              .print-adesivo-item img { max-width: 2cm; max-height: 2cm; object-fit: contain; }
              .print-adesivo-item span { font-size: 8px; margin-top: 4px; line-height: 1; }
              .container-receituario { display: none !important; }
            ` : `
              #papelReceita, #papelReceita * { visibility: visible; }
              #papelReceita { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
              .hide-on-print { display: none !important; }
              .print-header { display: block !important; }
              .print-via-uso { display: block !important; }
              .editor-custom { border: none !important; padding: 0 !important; }
              .medicamento-card { border: none !important; background: transparent !important; margin-bottom: 20px !important; padding: 0 !important; }
            `}
        }
      `}} />
    </div>
  );
}
