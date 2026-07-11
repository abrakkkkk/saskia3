'use client';
import { useState, useEffect, useRef } from 'react';
import './receituario.css';

// --- DATA CONSTANTS ---
const categoriasData: any = {
    medico: [
        { nome: "Cardiovascular", icone: "las la-heart", itens: ["Hipertensão", "Insuficiência Cardíaca", "Arritmias", "Anti-hipertensivos"] },
        { nome: "Endócrino", icone: "las la-chart-line", itens: ["Diabetes Tipo 1", "Diabetes Tipo 2", "Hipotireoidismo", "Hipertireoidismo"] },
        { nome: "Antibióticos", icone: "las la-capsules", itens: ["Amoxicilina", "Azitromicina", "Cefalexina", "Clindamicina"] },
        { nome: "Saúde da Mulher", icone: "las la-female", itens: ["Anticoncepcionais", "Reposição Hormonal", "ISTs", "Pré-natal"] },
        { nome: "Saúde do Homem", icone: "las la-male", itens: ["Próstata", "Testosterona", "Disfunção Erétil"] },
        { nome: "Saúde Mental", icone: "las la-brain", itens: ["Depressão", "Ansiedade", "Insônia", "TDAH"] },
        { nome: "Pediatria", icone: "las la-child", itens: ["Febre", "Otite", "Bronquiolite", "Vacinas"] },
        { nome: "Pneumologia", icone: "las la-lungs", itens: ["Asma", "DPOC", "Pneumonia", "Bronquite"] },
        { nome: "Sintomáticos", icone: "las la-thermometer", itens: ["Analgésicos", "Antitérmicos", "Anti-inflamatórios"] },
        { nome: "Sintomáticos Injetáveis", icone: "las la-syringe", itens: ["Dipirona", "Cetoprofeno", "Buscopan"] }
    ],
    enfermeiro: [
        { nome: "NANDA-I", icone: "las la-clipboard-list", itens: ["00001 - Desequilíbrio nutricional", "00002 - Risco de infecção"] },
        { nome: "NOC", icone: "las la-chart-line", itens: ["1000 - Controle da dor", "1002 - Controle de infecção"] },
        { nome: "NIC", icone: "las la-syringe", itens: ["1100 - Administração de medicamentos", "1160 - Curativos"] },
        { nome: "SAE", icone: "las la-stethoscope", itens: ["Histórico", "Diagnóstico", "Planejamento"] }
    ],
    fisioterapeuta: [
        { nome: "Recursos", icone: "las la-bolt", itens: ["Eletroterapia", "Ultrassom"] },
        { nome: "Exercícios", icone: "las la-walking", itens: ["Alongamento", "Fortalecimento"] }
    ],
    odontologista: [
        { nome: "Procedimentos", icone: "las la-tooth", itens: ["Restauração", "Canal"] },
        { nome: "Anestésicos", icone: "las la-syringe", itens: ["Lidocaína", "Articaína"] }
    ],
    nutricionista: [
        { nome: "Dietas", icone: "las la-utensils", itens: ["Hipocalórica", "Low Carb"] },
        { nome: "Suplementos", icone: "las la-capsules", itens: ["Vitaminas", "Minerais"] }
    ]
};

const adesivosCombinados = [
    { nome: "Ícone 2", arquivo: "2.png", icone: "las la-capsule" },{ nome: "Ícone 3", arquivo: "3.png", icone: "las la-capsule" },
    { nome: "Ícone 4", arquivo: "4.png", icone: "las la-capsule" },{ nome: "Ícone 5", arquivo: "5.png", icone: "las la-capsule" },
    { nome: "Ícone 6", arquivo: "6.jpg", icone: "las la-capsule" },{ nome: "Ícone 7", arquivo: "7.jpg", icone: "las la-capsule" },
    { nome: "Ícone 8", arquivo: "8.jpg", icone: "las la-capsule" },{ nome: "Ícone 9", arquivo: "9.jpg", icone: "las la-capsule" }
];
const adesivosMotivos = [
    { nome: "Dor estômago", arquivo: "002-stomach-ache.png", icone: "las la-stomach" },
    { nome: "Dor", arquivo: "003-pain.png", icone: "las la-tachometer-alt" },
    { nome: "Dor muscular", arquivo: "004-muscle-pain.png", icone: "las la-dumbbell" },
    { nome: "Dor cabeça", arquivo: "031-dor-de-cabeca.png", icone: "las la-brain" }
];
const adesivosVias = [
    { nome: "Comprimido", arquivo: "Comprimido.jpg", icone: "las la-capsule" },
    { nome: "Seringa", arquivo: "001-contorno-de-seringa.png", icone: "las la-syringe" },
    { nome: "Xarope", arquivo: "001-xarope.png", icone: "las la-flask" },
    { nome: "Colírio", arquivo: "005-colirio.png", icone: "las la-eye" }
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

export default function ReceituarioPage() {
  const [perfilAtual, setPerfilAtual] = useState('medico');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [activeTab, setActiveTab] = useState<'receituario'|'adesivos'|'modelos'>('receituario');
  const [activeCategoria, setActiveCategoria] = useState<string | null>(null);
  
  // Header form
  const [estabelecimento, setEstabelecimento] = useState('');
  const [registro, setRegistro] = useState('');
  const [nomePaciente, setNomePaciente] = useState('');

  // Modals
  const [modalAdesivosAberto, setModalAdesivosAberto] = useState(false);
  const [editorAtivoIndex, setEditorAtivoIndex] = useState<number | null>(null);
  const [filtroAdesivo, setFiltroAdesivo] = useState('todos');

  const editorRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  useEffect(() => {
    try {
      const hid = localStorage.getItem('usuarioLogado') ? JSON.parse(localStorage.getItem('usuarioLogado')!).hospitalId || 'hospital_001' : 'hospital_001';
      const saved = JSON.parse(localStorage.getItem(`${hid}_receita_medicamentos`) || '[]');
      if (saved.length > 0) {
        setMedicamentos(saved);
      }
    } catch(e) {}
  }, []);

  const saveDados = (meds: Medicamento[]) => {
    setMedicamentos(meds);
    try {
      const hid = localStorage.getItem('usuarioLogado') ? JSON.parse(localStorage.getItem('usuarioLogado')!).hospitalId || 'hospital_001' : 'hospital_001';
      localStorage.setItem(`${hid}_receita_medicamentos`, JSON.stringify(meds));
    } catch(e) {}
  };

  const mudarPerfil = (perfil: string) => {
    setPerfilAtual(perfil);
    setActiveCategoria(null);
  };

  const getTitulos = () => {
    const map: any = {
      medico: { titulo: "RECEITUÁRIO", subtitulo: "RECEITA MÉDICA - VIA DO PACIENTE" },
      enfermeiro: { titulo: "PRESCRIÇÃO DE ENFERMAGEM", subtitulo: "CUIDADOS DE ENFERMAGEM" },
      fisioterapeuta: { titulo: "PLANO TERAPÊUTICO", subtitulo: "FISIOTERAPIA - CONDUTA" },
      odontologista: { titulo: "PRESCRIÇÃO ODONTOLÓGICA", subtitulo: "TRATAMENTO ODONTOLÓGICO" },
      nutricionista: { titulo: "PLANO ALIMENTAR", subtitulo: "ORIENTAÇÃO NUTRICIONAL" }
    };
    return map[perfilAtual] || map.medico;
  };

  const addMedicamento = () => {
    const meds = [...medicamentos, { id: Date.now(), viaUso: "Oral", conteudo: "" }];
    saveDados(meds);
  };

  const removerMedicamento = (idx: number) => {
    const meds = medicamentos.filter((_, i) => i !== idx);
    saveDados(meds);
  };

  const atualizarViaUso = (idx: number, val: string) => {
    const meds = [...medicamentos];
    meds[idx].viaUso = val;
    saveDados(meds);
  };

  const handleEditorInput = (idx: number, html: string) => {
    const meds = [...medicamentos];
    meds[idx].conteudo = html;
    saveDados(meds);
  };

  const insertTextPronto = (text: string) => {
    let meds = [...medicamentos];
    if (meds.length === 0) {
      meds.push({ id: Date.now(), viaUso: "Oral", conteudo: text });
    } else {
      meds[meds.length - 1].conteudo += `\n${text}`;
      if (editorRefs.current[meds.length - 1]) {
         editorRefs.current[meds.length - 1]!.innerHTML = meds[meds.length - 1].conteudo;
      }
    }
    saveDados(meds);
  };

  const inserirTextoEditor = (idx: number, texto: string) => {
    const ref = editorRefs.current[idx];
    if (ref) {
      ref.innerHTML += texto;
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

  const imprimir = () => {
    window.print();
  };

  const limparTudo = () => {
    if (confirm("Limpar todo o receituário?")) {
      saveDados([]);
      setEstabelecimento('');
      setRegistro('');
      setNomePaciente('');
    }
  };

  const categorias = categoriasData[perfilAtual] || [];
  const listaAdesivosFiltrados = filtroAdesivo === 'todos' ? todosAdesivos : todosAdesivos.filter(a => a.categoria === filtroAdesivo);

  return (
    <div className="container-receituario">
      <div className="sidebar-receita hide-on-print">
        <div className="professional-switcher">
          <label><i className="las la-user-md"></i> Perfil Profissional</label>
          <select className="professional-select" value={perfilAtual} onChange={e => mudarPerfil(e.target.value)}>
            <option value="medico">👨‍⚕️ Médico</option>
            <option value="enfermeiro">👩‍⚕️ Enfermeiro</option>
            <option value="fisioterapeuta">🦵 Fisioterapeuta</option>
            <option value="odontologista">🦷 Odontologista</option>
            <option value="nutricionista">🍎 Nutricionista</option>
          </select>
        </div>
        <button className="cta-button" onClick={addMedicamento}><i className="las la-plus-circle"></i> Adicionar Prescrição</button>
        <div className="search-box">
          <input type="text" placeholder="Buscar medicamento..." />
        </div>
        <div>
          {categorias.map((cat: any, i: number) => (
            <div className="acordeao-item" key={i}>
              <div className={`acordeao-header ${activeCategoria === cat.nome ? 'ativo' : ''}`} onClick={() => setActiveCategoria(activeCategoria === cat.nome ? null : cat.nome)}>
                <div><i className={cat.icone}></i> {cat.nome}</div>
                <i className="las la-angle-right chevron"></i>
              </div>
              <div className={`acordeao-conteudo ${activeCategoria === cat.nome ? 'ativo' : ''}`}>
                {cat.itens.map((item: string, j: number) => (
                  <div className="acordeao-item-lista" key={j} onClick={() => insertTextPronto(item)}>
                    <i className="las la-file-alt"></i> {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="main-receita">
        <div className="tabs-receita hide-on-print">
          <button className={`tab-btn ${activeTab === 'receituario' ? 'ativo' : ''}`} onClick={() => setActiveTab('receituario')}><i className="las la-prescription-bottle"></i> Receituário</button>
          <button className={`tab-btn ${activeTab === 'adesivos' ? 'ativo' : ''}`} onClick={() => setActiveTab('adesivos')}><i className="las la-tag"></i> Adesivos</button>
          <button className={`tab-btn ${activeTab === 'modelos' ? 'ativo' : ''}`} onClick={() => setActiveTab('modelos')}><i className="las la-file-alt"></i> Modelos</button>
        </div>

        <div className="toolbar-receita hide-on-print">
          <button className="tool-btn"><i className="las la-exchange-alt"></i> Trocar</button>
          <button className="tool-btn" onClick={() => { setEditorAtivoIndex(medicamentos.length > 0 ? medicamentos.length - 1 : null); setModalAdesivosAberto(true); }}><i className="las la-tag"></i> Criar Adesivos</button>
          <button className="tool-btn" onClick={imprimir}><i className="las la-print"></i> Imprimir</button>
          <div className="switch-label"><span><i className="las la-exclamation-triangle"></i> Controle Especial</span><label className="switch"><input type="checkbox" /><span className="slider"></span></label></div>
          <button className="tool-btn danger" onClick={limparTudo}><i className="las la-trash-alt"></i> Limpar Tudo</button>
        </div>

        {activeTab === 'receituario' && (
          <div className="papel-receita" id="papelReceita">
            <h1 id="tituloDocumento">{getTitulos().titulo}</h1>
            <div className="subtitulo" id="subtituloDocumento">{getTitulos().subtitulo}</div>
            
            <div className="form-row hide-on-print">
              <div className="form-campo">
                <label>ESTABELECIMENTO DE SAÚDE:</label>
                <input type="text" value={estabelecimento} onChange={e => setEstabelecimento(e.target.value)} placeholder="Nome do estabelecimento" />
              </div>
              <div className="form-campo">
                <label>REGISTRO Nº:</label>
                <input type="text" value={registro} onChange={e => setRegistro(e.target.value)} placeholder="Número de registro" />
              </div>
            </div>
            <div className="form-campo hide-on-print">
              <label>NOME DO PACIENTE:</label>
              <input type="text" value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Nome completo do paciente" />
            </div>

            {/* Print Header */}
            <div className="print-header" style={{display:'none'}}>
              {estabelecimento && <p><strong>Estabelecimento:</strong> {estabelecimento}</p>}
              {registro && <p><strong>Registro:</strong> {registro}</p>}
              {nomePaciente && <p style={{marginTop:'10px', fontSize:'18px'}}><strong>Paciente:</strong> {nomePaciente}</p>}
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
                      dangerouslySetInnerHTML={{ __html: med.conteudo }}
                      style={{ whiteSpace: 'pre-wrap' }}
                    />

                    <div className="card-footer hide-on-print">
                      <button className="icon-btn" onClick={() => { setEditorAtivoIndex(idx); setModalAdesivosAberto(true); }}><i className="las la-smile-wink"></i></button>
                      <button className="icon-btn" onClick={() => inserirTextoEditor(idx, '📅')}><i className="las la-calendar"></i></button>
                      <button className="icon-btn" onClick={() => inserirTextoEditor(idx, '✅')}><i className="las la-check-circle"></i></button>
                      <button className="icon-btn" onClick={() => inserirTextoEditor(idx, '❌')}><i className="las la-times-circle"></i></button>
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

        {activeTab === 'adesivos' && (
          <div className="papel-receita">
            <h2><i className="las la-tag"></i> Gerador de Adesivos</h2>
            <p>Em desenvolvimento...</p>
          </div>
        )}

        {activeTab === 'modelos' && (
          <div className="papel-receita">
            <h2><i className="las la-file-alt"></i> Modelos Prontos</h2>
            <p>Em desenvolvimento...</p>
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

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
            body * { visibility: hidden; }
            #papelReceita, #papelReceita * { visibility: visible; }
            #papelReceita { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
            .hide-on-print { display: none !important; }
            .print-header { display: block !important; }
            .print-via-uso { display: block !important; }
            .editor-custom { border: none !important; padding: 0 !important; }
            .medicamento-card { border: none !important; background: transparent !important; margin-bottom: 20px !important; padding: 0 !important; }
        }
      `}} />
    </div>
  );
}
