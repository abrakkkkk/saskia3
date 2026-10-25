'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  const isAdmin = (session?.user as any)?.cargo === 'ADMIN';
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

  useEffect(() => { carregarProcedimentos(); }, []);

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
    if (valorBase !== null && (!Number.isFinite(valorBase) || valorBase < 0)) {
      alert('Informe um valor base válido.');
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
    <div className="conteudo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2><i className="las la-syringe"></i> Procedimentos</h2>
          <p>Gerencie o catálogo de procedimentos, exames e serviços prestados.</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => abrirModal()} style={{ padding: '12px 24px' }}>
          <i className="las la-plus"></i> Novo Procedimento
        </button>}
      </div>

      {sessionStatus === 'authenticated' && !isAdmin && <p role="alert" className="alert-erro">Acesso restrito a administradores do hospital.</p>}
      {erro && <p role="alert" className="alert-erro">{erro}</p>}

      <div className="lista-procedimentos">
        {carregando ? (
          <p role="status" style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '40px' }}>Carregando procedimentos…</p>
        ) : procedimentos.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nenhum procedimento cadastrado.</p>
        ) : (
          procedimentos.map((p, idx) => (
            <div className="procedimento-item" key={p.id}>
              <div className="procedimento-info">
                <h4>{p.nome}</h4>
                <p>{p.descricao}</p>
                <div className="procedimento-footer">
                  <span className={`badge-area ${p.ativo ? 'area-ativo' : 'area-inativo'}`}>
                    <i className={`las ${p.ativo ? 'la-check-circle' : 'la-ban'}`} aria-hidden="true"></i>
                    {p.ativo ? 'Ativo' : 'Desativado'}
                  </span>
                  {p.valorBase !== null && (
                    <span className="badge-valor">
                      <i className="las la-coins"></i> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorBase)}
                    </span>
                  )}
                </div>
              </div>
              <div className="procedimento-acoes">
                {isAdmin && <button className="btn-editar" onClick={() => abrirModal(idx)} title="Editar"><i className="las la-edit"></i></button>}
                {isAdmin && p.ativo && <button className="btn-excluir" onClick={() => excluirProcedimento(idx)} title="Desativar"><i className="las la-ban"></i></button>}
                {isAdmin && !p.ativo && <button className="btn-editar" onClick={() => reativarProcedimento(p)} title="Reativar"><i className="las la-undo"></i></button>}
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className={editIndex !== null ? "las la-edit" : "las la-plus-circle"}></i> {editIndex !== null ? "Editar Procedimento" : "Novo Procedimento"}</h3>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }} onClick={fecharModal}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nome do procedimento *</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={e => setFormNome(e.target.value)}
                  placeholder="Ex: Curativo Simples"
                />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  rows={3}
                  value={formDescricao}
                  onChange={e => setFormDescricao(e.target.value)}
                  placeholder="Detalhes e observações sobre o procedimento"
                />
              </div>
              <div className="form-group">
                <label>Valor base (opcional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValor}
                  onChange={e => setFormValor(e.target.value)}
                  placeholder="Ex: 50,00"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" onClick={fecharModal}>Cancelar</button>
              <button className="btn btn-success" onClick={salvarProcedimento} disabled={salvando}><i className="las la-save"></i> {salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
