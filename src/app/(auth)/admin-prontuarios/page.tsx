'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import './prontuarios.css';

interface CampoProntuario {
  id?: string;
  nome: string;
  tipo: string;
}

interface ModeloProntuario {
  id: string;
  titulo: string;
  descricao: string;
  campos: CampoProntuario[];
}

export default function AdminProntuariosPage() {
  const { data: session, status: statusSessao } = useSession();
  const isAdmin = (session?.user as any)?.cargo === 'ADMIN';
  const [modelos, setModelos] = useState<ModeloProntuario[]>([]);
  const [erro, setErro] = useState('');
  const [feedback, setFeedback] = useState('');
  const [erroFormulario, setErroFormulario] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCampos, setFormCampos] = useState<CampoProntuario[]>([]);

  const carregarModelos = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await fetch('/api/prontuarios-modelos', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os modelos.');
      if (!Array.isArray(data)) throw new Error('A resposta dos modelos está em formato inválido.');
      setModelos(data);
      setErro('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar os modelos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (statusSessao === 'loading') return;
    if (!isAdmin) {
      setModelos([]);
      setErro('');
      setCarregando(false);
      return;
    }
    void carregarModelos();
  }, [statusSessao, isAdmin, carregarModelos]);

  useEffect(() => {
    if (!isModalOpen) return;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !salvando) {
        setIsModalOpen(false);
        setEditIndex(null);
      }
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [isModalOpen, salvando]);

  const abrirModal = (index: number | null = null) => {
    setErroFormulario('');
    if (index !== null) {
      const m = modelos[index];
      setEditIndex(index);
      setFormTitulo(m.titulo);
      setFormDescricao(m.descricao || '');
      setFormCampos(m.campos ? JSON.parse(JSON.stringify(m.campos)) : []); // Deep copy
    } else {
      setEditIndex(null);
      setFormTitulo('');
      setFormDescricao('');
      setFormCampos([]);
    }
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditIndex(null);
  };

  const adicionarCampo = () => {
    setFormCampos([
      ...formCampos, 
      { id: crypto.randomUUID(), nome: 'Novo campo', tipo: 'texto' }
    ]);
  };

  const atualizarCampo = (index: number, prop: keyof CampoProntuario, valor: string) => {
    const novosCampos = [...formCampos];
    novosCampos[index] = { ...novosCampos[index], [prop]: valor };
    setFormCampos(novosCampos);
  };

  const removerCampo = (index: number) => {
    const novosCampos = [...formCampos];
    novosCampos.splice(index, 1);
    setFormCampos(novosCampos);
  };

  const salvarModelo = async () => {
    if (!formTitulo.trim()) {
      setErroFormulario('Informe o título do modelo.');
      return;
    }
    if (formCampos.length === 0) {
      setErroFormulario('Adicione pelo menos um campo ao modelo.');
      return;
    }
    if (formCampos.some(campo => !campo.nome.trim())) {
      setErroFormulario('Preencha o nome de todos os campos antes de salvar.');
      return;
    }

    const payload = {
      titulo: formTitulo,
      descricao: formDescricao,
      campos: formCampos
    };

    setSalvando(true);
    setErroFormulario('');
    try {
      let response: Response;
      if (editIndex !== null) {
        const id = modelos[editIndex].id;
        response = await fetch(`/api/prontuarios-modelos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/prontuarios-modelos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o modelo.');
      await carregarModelos();
      fecharModal();
      setFeedback('Modelo salvo com sucesso.');
    } catch (error) {
      setErroFormulario(error instanceof Error ? error.message : 'Erro ao salvar modelo.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirModelo = async (index: number) => {
    if(await confirm("Deseja realmente excluir este modelo?")) {
      const id = modelos[index].id;
      if (!id) return;
      try {
        const response = await fetch(`/api/prontuarios-modelos/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível excluir o modelo.');
        await carregarModelos();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erro ao excluir.');
      }
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: any = {
      "texto": "Texto Curto",
      "numero": "Número",
      "data": "Data",
      "textarea": "Texto Longo (Observações)",
      "select": "Seleção (Múltipla Escolha)"
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="conteudo prontuarios-page">
      <div className="prontuarios-page-header">
        <div>
          <h2><i className="las la-file-alt"></i> Modelos de Prontuários</h2>
          <p>Crie e gerencie formulários customizados para os registros clínicos da sua unidade.</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => abrirModal()} style={{ padding: '12px 24px' }}>
          <i className="las la-plus"></i> Novo Modelo
        </button>}
      </div>

      {!isAdmin && <p role="alert" style={{ color: '#b91c1c', marginBottom: 16 }}>Acesso restrito a administradores do hospital.</p>}

      <div className="lista-modelos">
        {erro && <div className="prontuarios-load-error" role="alert"><span>{erro}</span><button className="btn btn-secondary" onClick={() => void carregarModelos()} disabled={carregando}>Tentar novamente</button></div>}
        {carregando ? (
          <p role="status" style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '40px' }}>Carregando modelos…</p>
        ) : erro ? null : modelos.length === 0 ? (
          <p className="prontuarios-empty">Nenhum modelo de prontuário cadastrado.</p>
        ) : (
          modelos.map((m, idx) => (
            <div className="modelo-item" key={m.id}>
              <div>
                <div className="modelo-header">
                  <h4><i className="las la-file-medical"></i> {m.titulo}</h4>
                  {isAdmin && <div className="modelo-acoes">
                    <button className="btn-editar" onClick={() => abrirModal(idx)} title="Editar Modelo" aria-label={`Editar ${m.titulo}`}><i className="las la-edit" aria-hidden="true"></i></button>
                    <button className="btn-excluir" onClick={() => excluirModelo(idx)} title="Excluir Modelo" aria-label={`Excluir ${m.titulo}`}><i className="las la-trash" aria-hidden="true"></i></button>
                  </div>}
                </div>
                <div className="modelo-descricao">
                  {m.descricao || "Nenhuma descrição fornecida."}
                </div>
              </div>
              
              <div className="modelo-campos-preview">
                <strong><i className="las la-list"></i> Estrutura ({m.campos?.length || 0} campos):</strong>
                {m.campos && m.campos.length > 0 ? (
                  <ul>
                    {m.campos.slice(0, 4).map((c, cIdx) => (
                      <li key={cIdx}><b>{c.nome}</b> <span style={{color: '#94a3b8', fontSize: '11px'}}>({getTipoLabel(c.tipo)})</span></li>
                    ))}
                    {m.campos.length > 4 && (
                      <li style={{ listStyle: 'none', fontStyle: 'italic', color: '#94a3b8', marginTop: '5px' }}>
                        + {m.campos.length - 4} campo(s)...
                      </li>
                    )}
                  </ul>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Nenhum campo estruturado</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {feedback && <p className="prontuarios-feedback" role="status">{feedback}</p>}

      {isModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !salvando) fecharModal(); }}>
          <form className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modelo-modal-title" onSubmit={e => { e.preventDefault(); void salvarModelo(); }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modelo-modal-title"><i className={editIndex !== null ? "las la-edit" : "las la-file-medical"} aria-hidden="true"></i> {editIndex !== null ? "Editar Modelo de Prontuário" : "Novo Modelo de Prontuário"}</h3>
              <button type="button" aria-label="Fechar formulário de modelo" disabled={salvando} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: salvando ? 'not-allowed' : 'pointer' }} onClick={fecharModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="modelo-titulo">Título do Modelo *</label>
                <input 
                  id="modelo-titulo"
                  type="text" 
                  value={formTitulo} 
                  onChange={e => setFormTitulo(e.target.value)} 
                  placeholder="Ex: Anamnese Pediátrica, Avaliação Cardiológica..." 
                  maxLength={160}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="modelo-descricao">Descrição e Orientação de Uso</label>
                <textarea 
                  id="modelo-descricao"
                  rows={2} 
                  value={formDescricao} 
                  onChange={e => setFormDescricao(e.target.value)} 
                  placeholder="Instruções breves sobre quando este modelo deve ser utilizado."
                  maxLength={2000}
                />
              </div>

              {erroFormulario && <p role="alert" className="prontuarios-form-error">{erroFormulario}</p>}

              <div className="campos-builder">
                <div className="campos-builder-header">
                  <h4><i className="las la-layer-group"></i> Estrutura de Campos</h4>
                  <button type="button" className="btn btn-primary" onClick={adicionarCampo} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px' }}>
                    <i className="las la-plus"></i> Adicionar Campo
                  </button>
                </div>

                {formCampos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '2px dashed #cbd5e1', color: '#94a3b8' }}>
                    <i className="las la-mouse-pointer" style={{ fontSize: '32px', marginBottom: '10px' }}></i>
                    <p style={{ margin: 0 }}>Nenhum campo adicionado.<br/>Clique no botão acima para começar a construir o prontuário.</p>
                  </div>
                ) : (
                  formCampos.map((campo, index) => (
                    <div className="campo-dinamico-item" key={campo.id || index}>
                      <div style={{ flex: '0 0 auto', color: '#94a3b8', fontWeight: 'bold' }}>{index + 1}.</div>
                      <input 
                        aria-label={`Nome do campo ${index + 1}`}
                        type="text" 
                        value={campo.nome} 
                        onChange={e => atualizarCampo(index, 'nome', e.target.value)} 
                        placeholder="Nome da pergunta / campo"
                        maxLength={120}
                        required
                      />
                      <select 
                        aria-label={`Tipo do campo ${index + 1}`}
                        value={campo.tipo} 
                        onChange={e => atualizarCampo(index, 'tipo', e.target.value)}
                      >
                        <option value="texto">Texto Curto</option>
                        <option value="numero">Número</option>
                        <option value="data">Data</option>
                        <option value="textarea">Texto Longo</option>
                        <option value="select">Seleção (Dropdown)</option>
                      </select>
                      <button type="button" className="btn-remover-campo" onClick={() => removerCampo(index)} title="Remover Campo" aria-label={`Remover campo ${index + 1}`}>
                        <i className="las la-trash"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-danger" onClick={fecharModal} disabled={salvando}>Cancelar</button>
              <button type="submit" className="btn btn-success" disabled={salvando}><i className="las la-save" aria-hidden="true"></i> {salvando ? 'Salvando…' : 'Salvar Modelo'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
