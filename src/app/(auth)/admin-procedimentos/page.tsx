'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader, Badge, EmptyState, LoadingState, ErrorState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './procedimentos.css';

interface Procedimento {
  id: string;
  nome: string;
  descricao: string;
  valorBase: number | null;
  ativo: boolean;
}

export default function AdminProcedimentosPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.cargo === 'ADMIN';
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formValor, setFormValor] = useState('');
  const carregarProcedimentos = async () => {
    setCarregando(true);
    try {
      const response = await fetch('/api/procedimento');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o catálogo.');
      setProcedimentos(Array.isArray(data) ? data : []);
      setErro('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar o catálogo.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!isAdmin) {
      void Promise.resolve().then(() => { setCarregando(false); });
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
    void carregarProcedimentos();
  }, [isAdmin, sessionStatus]);

  const abrirModal = (index: number | null = null) => {
    if (index !== null) {
      const p = procedimentos[index];
      setEditIndex(index);
      setFormNome(p.nome);
      setFormDescricao(p.descricao);
      setFormValor(p.valorBase === null ? '' : String(p.valorBase));
    } else {
      setEditIndex(null);
      setFormNome('');
      setFormDescricao('');
      setFormValor('');
    }
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEditIndex(null);
  };

  const salvarProcedimento = async () => {
    if (!formNome.trim()) {
      alert("Informe o nome do procedimento!");
      return;
    }
    const valorBase = formValor.trim() ? Number(formValor.replace(',', '.')) : null;
    if (valorBase !== null && (!Number.isFinite(valorBase) || valorBase < 0 || valorBase > 100000000)) {
      alert('Informe um valor base entre R$ 0,00 e R$ 100.000.000,00.');
      return;
    }
    setSalvando(true);
    try {
      const editing = editIndex !== null ? procedimentos[editIndex] : null;
      const response = await fetch(editing ? `/api/procedimento/${editing.id}` : '/api/procedimento', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: formNome.trim(), descricao: formDescricao.trim(), valorBase }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o procedimento.');
      await carregarProcedimentos();
      fecharModal();
      alert('Procedimento salvo com sucesso.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao salvar procedimento.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirProcedimento = async (index: number) => {
    if(await confirm("Tem certeza que deseja excluir este procedimento?")) {
      try {
        const response = await fetch(`/api/procedimento/${procedimentos[index].id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível desativar o procedimento.');
        await carregarProcedimentos();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Erro ao desativar procedimento.');
      }
    }
  };

  const reativarProcedimento = async (procedimento: Procedimento) => {
    try {
      const response = await fetch(`/api/procedimento/${procedimento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível reativar o procedimento.');
      await carregarProcedimentos();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao reativar procedimento.');
    }
  };

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-syringe"
        title="Procedimentos"
        subtitle="Catálogo de procedimentos, exames e serviços."
        actions={isAdmin ? (
          <button type="button" className="btn btn-primary" onClick={() => abrirModal()}>
            <i className="las la-plus" aria-hidden="true"></i> Novo procedimento
          </button>
        ) : undefined}
      />

      {sessionStatus === 'authenticated' && !isAdmin && <p role="alert" className="mod-aviso mod-aviso-erro">Acesso restrito a administradores do hospital.</p>}

      {carregando ? (
        <LoadingState message="Carregando procedimentos..." />
      ) : erro ? (
        <ErrorState message={erro} onRetry={isAdmin ? () => void carregarProcedimentos() : undefined} />
      ) : procedimentos.length === 0 ? (
        <EmptyState icon="las la-syringe" message="Nenhum procedimento cadastrado." />
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Procedimento</th>
                <th>Descrição</th>
                <th>Valor base</th>
                <th>Status</th>
                {isAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {procedimentos.map((p, idx) => (
                <tr key={p.id}>
                  <td><strong>{p.nome}</strong></td>
                  <td className="proc-descricao">{p.descricao || <span className="ux-mudo">Sem descrição</span>}</td>
                  <td>{p.valorBase !== null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorBase) : <span className="ux-mudo">Não informado</span>}</td>
                  <td><Badge tone={p.ativo ? 'success' : 'neutral'}>{p.ativo ? 'Ativo' : 'Desativado'}</Badge></td>
                  {isAdmin && (
                    <td>
                      <span className="ux-acoes">
                        <button type="button" className="btn btn-secondary btn-sm ux-icon-btn" onClick={() => abrirModal(idx)} aria-label={`Editar ${p.nome}`} title="Editar"><i className="las la-edit" aria-hidden="true"></i></button>
                        {p.ativo ? (
                          <button type="button" className="btn btn-danger btn-sm ux-icon-btn" onClick={() => excluirProcedimento(idx)} aria-label={`Desativar ${p.nome}`} title="Desativar"><i className="las la-ban" aria-hidden="true"></i></button>
                        ) : (
                          <button type="button" className="btn btn-secondary btn-sm ux-icon-btn" onClick={() => reativarProcedimento(p)} aria-label={`Reativar ${p.nome}`} title="Reativar"><i className="las la-undo" aria-hidden="true"></i></button>
                        )}
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
        <Modal title={editIndex !== null ? 'Editar procedimento' : 'Novo procedimento'} icon={editIndex !== null ? 'las la-edit' : 'las la-plus-circle'} onClose={fecharModal} busy={salvando}>
          <div className="form-group">
            <label htmlFor="procedimento-nome">Nome *</label>
            <input
              id="procedimento-nome"
              type="text"
              value={formNome}
              onChange={e => setFormNome(e.target.value)}
              placeholder="Ex.: Curativo simples"
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="procedimento-descricao">Descrição</label>
            <textarea
              id="procedimento-descricao"
              rows={3}
              value={formDescricao}
              onChange={e => setFormDescricao(e.target.value)}
              placeholder="Detalhes e observações"
              maxLength={2000}
            />
          </div>
          <div className="form-group">
            <label htmlFor="procedimento-valor">Valor base (opcional)</label>
            <input
              id="procedimento-valor"
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              value={formValor}
              onChange={e => setFormValor(e.target.value)}
              placeholder="Ex.: 50,00"
            />
          </div>
          <div className="ui-modal-foot">
            <button type="button" className="btn btn-secondary" onClick={fecharModal} disabled={salvando}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={salvarProcedimento} disabled={salvando}><i className="las la-save" aria-hidden="true"></i> {salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
