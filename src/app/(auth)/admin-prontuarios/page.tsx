'use client';
import { getSessionUser } from '@/lib/session';
import { useState, useEffect } from 'react';
import './prontuarios.css';

interface CampoProntuario {
  id?: string;
  nome: string;
  tipo: string;
}

interface ModeloProntuario {
  titulo: string;
  descricao: string;
  campos: CampoProntuario[];
}

export default function AdminProntuariosPage() {
  const [hospitalId, setHospitalId] = useState('hospital_001');
  const [modelos, setModelos] = useState<ModeloProntuario[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCampos, setFormCampos] = useState<CampoProntuario[]>([]);

  const carregarModelos = () => {
    fetch('/api/prontuarios-modelos')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setModelos(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    try {
      const u = JSON.stringify(getSessionUser());
      const usuario = u ? JSON.parse(u) : null;
      const hid = usuario?.hospitalId || usuario?.id || 'hospital_001';
      setHospitalId(hid);
    } catch(e) {}
    carregarModelos();
  }, []);

  const abrirModal = (index: number | null = null) => {
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
      { id: Date.now().toString() + Math.random(), nome: 'Novo campo', tipo: 'texto' }
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
      alert("Informe o título do modelo!");
      return;
    }
    if (formCampos.length === 0) {
      alert("Adicione pelo menos um campo ao modelo!");
      return;
    }

    const payload = {
      titulo: formTitulo,
      descricao: formDescricao,
      campos: formCampos
    };

    try {
      if (editIndex !== null) {
        const id = (modelos[editIndex] as any).id;
        await fetch(`/api/prontuarios-modelos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/prontuarios-modelos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      carregarModelos();
      fecharModal();
      alert("✅ Modelo salvo com sucesso!");
    } catch {
      alert("Erro ao salvar modelo.");
    }
  };

  const excluirModelo = async (index: number) => {
    if(await confirm("Deseja realmente excluir este modelo?")) {
      const id = (modelos[index] as any).id;
      if (!id) return;
      try {
        await fetch(`/api/prontuarios-modelos/${id}`, { method: 'DELETE' });
        carregarModelos();
      } catch {
        alert("Erro ao excluir.");
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
    <div className="conteudo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2><i className="las la-file-alt"></i> Modelos de Prontuários</h2>
          <p>Crie e gerencie formulários customizados para os registros clínicos da sua unidade.</p>
        </div>
        <button className="btn btn-primary" onClick={() => abrirModal()} style={{ padding: '12px 24px' }}>
          <i className="las la-plus"></i> Novo Modelo
        </button>
      </div>

      <div className="lista-modelos">
        {modelos.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nenhum modelo de prontuário cadastrado.</p>
        ) : (
          modelos.map((m, idx) => (
            <div className="modelo-item" key={idx}>
              <div>
                <div className="modelo-header">
                  <h4><i className="las la-file-medical"></i> {m.titulo}</h4>
                  <div className="modelo-acoes">
                    <button className="btn-editar" onClick={() => abrirModal(idx)} title="Editar Modelo"><i className="las la-edit"></i></button>
                    <button className="btn-excluir" onClick={() => excluirModelo(idx)} title="Excluir Modelo"><i className="las la-trash"></i></button>
                  </div>
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

      {isModalOpen && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className={editIndex !== null ? "las la-edit" : "las la-file-medical"}></i> {editIndex !== null ? "Editar Modelo de Prontuário" : "Novo Modelo de Prontuário"}</h3>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }} onClick={fecharModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Título do Modelo *</label>
                <input 
                  type="text" 
                  value={formTitulo} 
                  onChange={e => setFormTitulo(e.target.value)} 
                  placeholder="Ex: Anamnese Pediátrica, Avaliação Cardiológica..." 
                />
              </div>
              <div className="form-group">
                <label>Descrição e Orientação de Uso</label>
                <textarea 
                  rows={2} 
                  value={formDescricao} 
                  onChange={e => setFormDescricao(e.target.value)} 
                  placeholder="Instruções breves sobre quando este modelo deve ser utilizado."
                />
              </div>

              <div className="campos-builder">
                <div className="campos-builder-header">
                  <h4><i className="las la-layer-group"></i> Estrutura de Campos</h4>
                  <button className="btn btn-primary" onClick={adicionarCampo} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px' }}>
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
                        type="text" 
                        value={campo.nome} 
                        onChange={e => atualizarCampo(index, 'nome', e.target.value)} 
                        placeholder="Nome da pergunta / campo"
                      />
                      <select 
                        value={campo.tipo} 
                        onChange={e => atualizarCampo(index, 'tipo', e.target.value)}
                      >
                        <option value="texto">Texto Curto</option>
                        <option value="numero">Número</option>
                        <option value="data">Data</option>
                        <option value="textarea">Texto Longo</option>
                        <option value="select">Seleção (Dropdown)</option>
                      </select>
                      <button className="btn-remover-campo" onClick={() => removerCampo(index)} title="Remover Campo">
                        <i className="las la-trash"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-success" onClick={salvarModelo}><i className="las la-save"></i> Salvar Modelo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
