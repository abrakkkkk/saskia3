'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader, Badge, EmptyState, LoadingState, ErrorState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
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
  const isAdmin = session?.user?.cargo === 'ADMIN';
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
      setModelos([]);
      setErro('');
      setCarregando(false);
      return;
    }
    void carregarModelos();
  }, [statusSessao, isAdmin, carregarModelos]);

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
    const tipos: Record<string, string> = {
      "texto": "Texto Curto",
      "numero": "Número",
      "data": "Data",
      "textarea": "Texto Longo (Observações)",
      "select": "Seleção (Múltipla Escolha)"
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-file-alt"
        title="Modelos de prontuário"
        subtitle="Formulários dos registros clínicos da unidade."
        actions={isAdmin ? (
          <button type="button" className="btn btn-primary" onClick={() => abrirModal()}>
            <i className="las la-plus" aria-hidden="true"></i> Novo modelo
          </button>
        ) : undefined}
      />

      {!isAdmin && statusSessao !== 'loading' && <p role="alert" className="mod-aviso mod-aviso-erro">Acesso restrito a administradores do hospital.</p>}
      {feedback && <p className="mod-aviso mod-aviso-sucesso" role="status">{feedback}</p>}

      {carregando ? (
        <LoadingState message="Carregando modelos..." />
      ) : erro ? (
        <ErrorState message={erro} onRetry={() => void carregarModelos()} />
      ) : modelos.length === 0 ? (
        <EmptyState icon="las la-file-medical" message="Nenhum modelo de prontuário cadastrado." />
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Campos</th>
                {isAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {modelos.map((m, idx) => (
                <tr key={m.id}>
                  <td className="pr-modelo">
                    <strong>{m.titulo}</strong>
                    <span className="ux-secundario">{m.descricao || 'Sem descrição'}</span>
                  </td>
                  <td className="pr-campos">
                    {m.campos && m.campos.length > 0 ? (
                      <>
                        <Badge tone="info">{m.campos.length} {m.campos.length === 1 ? 'campo' : 'campos'}</Badge>
                        <span className="ux-secundario">
                          {m.campos.slice(0, 4).map(c => `${c.nome} (${getTipoLabel(c.tipo)})`).join(', ')}
                          {m.campos.length > 4 ? ` e mais ${m.campos.length - 4}` : ''}
                        </span>
                      </>
                    ) : (
                      <span className="ux-mudo">Nenhum campo</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <span className="ux-acoes">
                        <button type="button" className="btn btn-secondary btn-sm ux-icon-btn" onClick={() => abrirModal(idx)} title="Editar" aria-label={`Editar ${m.titulo}`}><i className="las la-edit" aria-hidden="true"></i></button>
                        <button type="button" className="btn btn-danger btn-sm ux-icon-btn" onClick={() => excluirModelo(idx)} title="Excluir" aria-label={`Excluir ${m.titulo}`}><i className="las la-trash" aria-hidden="true"></i></button>
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <Modal size="lg" title={editIndex !== null ? 'Editar modelo' : 'Novo modelo'} icon={editIndex !== null ? 'las la-edit' : 'las la-file-medical'} onClose={fecharModal} busy={salvando}>
          <form onSubmit={e => { e.preventDefault(); void salvarModelo(); }}>
            <div className="form-group">
              <label htmlFor="modelo-titulo">Título *</label>
              <input
                id="modelo-titulo"
                type="text"
                value={formTitulo}
                onChange={e => setFormTitulo(e.target.value)}
                placeholder="Ex.: Anamnese pediátrica"
                maxLength={160}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="modelo-descricao">Orientação de uso</label>
              <textarea
                id="modelo-descricao"
                rows={2}
                value={formDescricao}
                onChange={e => setFormDescricao(e.target.value)}
                placeholder="Quando este modelo deve ser usado"
                maxLength={2000}
              />
            </div>

            {erroFormulario && <p role="alert" className="mod-aviso mod-aviso-erro">{erroFormulario}</p>}

            <div className="pr-builder-topo">
              <h3>Campos</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarCampo}>
                <i className="las la-plus" aria-hidden="true"></i> Adicionar campo
              </button>
            </div>

            {formCampos.length === 0 ? (
              <EmptyState icon="las la-list" message="Nenhum campo. Use “Adicionar campo” para montar o modelo." />
            ) : (
              <ul className="ux-lista">
                {formCampos.map((campo, index) => (
                  <li key={campo.id || index} className="form-group pr-campo">
                    <span className="pr-campo-num" aria-hidden="true">{index + 1}</span>
                    <input
                      aria-label={`Nome do campo ${index + 1}`}
                      type="text"
                      value={campo.nome}
                      onChange={e => atualizarCampo(index, 'nome', e.target.value)}
                      placeholder="Nome do campo"
                      maxLength={120}
                      required
                    />
                    <select
                      aria-label={`Tipo do campo ${index + 1}`}
                      value={campo.tipo}
                      onChange={e => atualizarCampo(index, 'tipo', e.target.value)}
                    >
                      <option value="texto">Texto curto</option>
                      <option value="numero">Número</option>
                      <option value="data">Data</option>
                      <option value="textarea">Texto longo</option>
                      <option value="select">Seleção</option>
                    </select>
                    <button type="button" className="btn btn-danger btn-sm ux-icon-btn" onClick={() => removerCampo(index)} title="Remover campo" aria-label={`Remover campo ${index + 1}`}>
                      <i className="las la-trash" aria-hidden="true"></i>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="ui-modal-foot">
              <button type="button" className="btn btn-secondary" onClick={fecharModal} disabled={salvando}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={salvando}><i className="las la-save" aria-hidden="true"></i> {salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
