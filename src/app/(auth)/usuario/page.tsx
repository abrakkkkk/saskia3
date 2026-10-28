'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import './usuario.css';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  createdAt: string;
}

export default function UsuarioPage() {
  const { data: session, status: statusSessao } = useSession();
  const isAdmin = (session?.user as { cargo?: string } | undefined)?.cargo === 'ADMIN';
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroAtual, setFiltroAtual] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [acaoId, setAcaoId] = useState('');

  // Modal State
  const [modalAberto, setModalAberto] = useState(false);
  const [formUsuario, setFormUsuario] = useState({ id: '', nome: '', email: '', senha: '', cargo: 'MEDICO' });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [erroSalvar, setErroSalvar] = useState('');

  const carregarUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Não foi possível carregar usuários.');
      if (!Array.isArray(data)) throw new Error('A resposta de usuários é inválida.');
      setUsuarios(data);
      setErro('');
    } catch (error) {
      setUsuarios([]);
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (statusSessao === 'loading') return;
    if (!isAdmin) {
      setUsuarios([]);
      setErro('');
      setLoading(false);
      return;
    }
    void carregarUsuarios();
  }, [statusSessao, isAdmin, carregarUsuarios]);

  // Funções Auxiliares para traduzir o Cargo do Prisma para Nível/Cargo da UI Antiga
  const getNivel = (cargo: string) => {
    if (cargo === 'ADMIN') return 'admin';
    if (['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM', 'FARMACEUTICO'].includes(cargo)) return 'profissional';
    return 'recepcao';
  };

  const getNivelNome = (nivel: string) => {
    if (nivel === 'admin') return 'Administrador';
    if (nivel === 'profissional') return 'Profissional de Saúde';
    return 'Recepção';
  };

  const getCargoLabel = (cargo: string) => {
    const mapa: Record<string, string> = {
      ADMIN: "Gestor do Sistema",
      MEDICO: "Médico(a)",
      ENFERMEIRO_ASSISTENCIAL: "Enfermeiro(a)",
      TECNICO_ENFERMAGEM: "Técnico(a) de Enfermagem",
      FARMACEUTICO: "Farmacêutico(a)",
      RECEPCIONISTA: "Atendente / Recepcionista",
      OUTROS: "Outros"
    };
    return mapa[cargo] || "Outros";
  };

  // Stats
  const usuariosAtivos = usuarios.filter(u => u.ativo);
  const adminCount = usuariosAtivos.filter(u => getNivel(u.cargo) === 'admin').length;
  const profissionalCount = usuariosAtivos.filter(u => getNivel(u.cargo) === 'profissional').length;
  const recepcaoCount = usuariosAtivos.filter(u => getNivel(u.cargo) === 'recepcao').length;

  // Filtro
  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroAtual === 'todos') return true;
    return getNivel(u.cargo) === filtroAtual;
  });

  const abrirModal = (u?: Usuario) => {
    setFeedback('');
    setErroSalvar('');
    if (u) {
      setFormUsuario({ id: u.id, nome: u.nome, email: u.email, senha: '', cargo: u.cargo });
    } else {
      setFormUsuario({ id: '', nome: '', email: '', senha: '', cargo: 'MEDICO' });
    }
    setModalAberto(true);
  };

  const salvarUsuario = async () => {
    if (!formUsuario.nome.trim() || !formUsuario.email.trim()) {
      setErroSalvar('Preencha nome e e-mail.');
      return;
    }
    if (!formUsuario.id && !formUsuario.senha) {
      setErroSalvar('Informe uma senha para o novo usuário.');
      return;
    }
    if (formUsuario.senha && new TextEncoder().encode(formUsuario.senha).length > 72) {
      setErroSalvar('A senha pode ter no máximo 72 bytes.');
      return;
    }

    setIsSaving(true);
    setErroSalvar('');
    try {
      const url = formUsuario.id ? `/api/usuarios/${formUsuario.id}` : '/api/usuarios';
      const method = formUsuario.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUsuario)
      });

      if (res.ok) {
        setModalAberto(false);
        setFeedback('Usuário salvo com sucesso.');
        await carregarUsuarios();
      } else {
        const errorData = await res.json().catch(() => null);
        setErroSalvar(errorData?.error || 'Erro ao salvar usuário.');
      }
    } catch (error) {
      setErroSalvar('Erro de conexão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const excluirUsuario = async (id: string) => {
    if (await confirm("Desativar este usuário? Ele permanecerá no histórico e poderá ser reativado.")) {
      try {
        setAcaoId(id);
        const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
          alert("Usuário desativado!");
          await carregarUsuarios();
        } else {
          const data = await res.json().catch(() => null);
          alert(data?.error || "Erro ao desativar usuário");
        }
      } catch (error) {
        alert("Erro de conexão");
      } finally {
        setAcaoId('');
      }
    }
  };

  const ativarUsuario = async (id: string) => {
    try {
      setAcaoId(id);
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Erro ao reativar usuário');
      await carregarUsuarios();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro de conexão');
    } finally {
      setAcaoId('');
    }
  };

  return (
    <div className="conteudo">
      {statusSessao !== 'loading' && !isAdmin ? (
        <p role="alert">Acesso restrito a administradores.</p>
      ) : <>
      <div className="header-usuarios">
        <h2><i className="las la-users"></i> Usuários do Sistema</h2>
        <button className="btn-novo" onClick={() => abrirModal()} disabled={statusSessao === 'loading' || !isAdmin}>
          <i className="las la-user-plus"></i> Novo Usuário
        </button>
      </div>
      {feedback && <p className="usuario-feedback" role="status" aria-live="polite">{feedback}</p>}

      {/* CARDS ESTATÍSTICOS */}
      <div className="stats-usuarios">
        <div className="stat-card-user">
          <h4><i className="las la-crown"></i> Administradores</h4>
          <div className="numero">{adminCount}</div>
        </div>
        <div className="stat-card-user">
          <h4><i className="las la-stethoscope"></i> Profissionais</h4>
          <div className="numero">{profissionalCount}</div>
        </div>
        <div className="stat-card-user">
          <h4><i className="las la-headset"></i> Recepção</h4>
          <div className="numero">{recepcaoCount}</div>
        </div>
        <div className="stat-card-user">
          <h4><i className="las la-users"></i> Usuários ativos</h4>
          <div className="numero">{usuariosAtivos.length}</div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="filtros-usuarios">
        <button aria-pressed={filtroAtual === 'todos'} className={`filtro-btn ${filtroAtual === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltroAtual('todos')}><i aria-hidden="true" className="las la-list-ul"></i> Todos</button>
        <button aria-pressed={filtroAtual === 'admin'} className={`filtro-btn ${filtroAtual === 'admin' ? 'ativo' : ''}`} onClick={() => setFiltroAtual('admin')}><i aria-hidden="true" className="las la-crown"></i> Administradores</button>
        <button aria-pressed={filtroAtual === 'profissional'} className={`filtro-btn ${filtroAtual === 'profissional' ? 'ativo' : ''}`} onClick={() => setFiltroAtual('profissional')}><i aria-hidden="true" className="las la-stethoscope"></i> Profissionais</button>
        <button aria-pressed={filtroAtual === 'recepcao'} className={`filtro-btn ${filtroAtual === 'recepcao' ? 'ativo' : ''}`} onClick={() => setFiltroAtual('recepcao')}><i aria-hidden="true" className="las la-headset"></i> Recepção</button>
      </div>

      {/* TABELA DE USUÁRIOS */}
      <div className="tabela-usuarios">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Nível</th>
              <th>Cargo</th>
              <th>Cadastro</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {erro ? (
              <tr><td colSpan={7} className="sem-dados" role="alert">{erro}</td></tr>
            ) : loading || statusSessao === 'loading' ? (
              <tr><td colSpan={7} className="sem-dados">Carregando usuários...</td></tr>
            ) : usuariosFiltrados.length === 0 ? (
              <tr><td colSpan={7} className="sem-dados">Nenhum usuário encontrado</td></tr>
            ) : (
              usuariosFiltrados.map(u => {
                const nivel = getNivel(u.cargo);
                return (
                  <tr key={u.id}>
                    <td><i className="las la-user-circle"></i> {u.nome}</td>
                    <td><i className="las la-envelope"></i> {u.email}</td>
                    <td><span className={`badge-nivel nivel-${nivel}`}>{getNivelNome(nivel)}</span></td>
                    <td>{getCargoLabel(u.cargo)}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>{u.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td>
                      <button className="btn-editar" aria-label={`Editar ${u.nome}`} onClick={() => abrirModal(u)} disabled={!isAdmin || Boolean(acaoId)}><i className="las la-edit" aria-hidden="true"></i></button>
                      {u.ativo ? (
                        <button className="btn-excluir" aria-label={`Desativar ${u.nome}`} onClick={() => excluirUsuario(u.id)} disabled={!isAdmin || Boolean(acaoId)}><i className="las la-user-slash" aria-hidden="true"></i></button>
                      ) : (
                        <button className="btn-editar" aria-label={`Reativar ${u.nome}`} onClick={() => ativarUsuario(u.id)} disabled={!isAdmin || Boolean(acaoId)}><i className="las la-user-check" aria-hidden="true"></i></button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalAberto && (
        <div className="modal-usuario">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="usuario-modal-title">
            <div className="modal-header">
              <span id="usuario-modal-title"><i aria-hidden="true" className="las la-user-plus"></i> {formUsuario.id ? 'Editar Usuário' : 'Novo Usuário'}</span>
              <button type="button" aria-label="Fechar janela" onClick={() => !isSaving && setModalAberto(false)} disabled={isSaving} className="usuario-modal-close">×</button>
            </div>
            <div className="modal-body">
              <label htmlFor="usuario-nome">Nome completo</label>
              <input id="usuario-nome" name="nome" type="text" maxLength={160} required value={formUsuario.nome} onChange={e => setFormUsuario({...formUsuario, nome: e.target.value})} placeholder="Nome completo" />
              
              <label htmlFor="usuario-email">E-mail</label>
              <input id="usuario-email" name="email" type="email" maxLength={254} required value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})} placeholder="E-mail" />
              
              <label htmlFor="usuario-senha">Senha {formUsuario.id && '(Deixe em branco para manter a atual)'}</label>
              <input id="usuario-senha" name="senha" type="password" maxLength={72} minLength={formUsuario.id ? undefined : 12} autoComplete="new-password" value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} placeholder="Senha" />
              
              <label htmlFor="usuario-cargo">Cargo do Sistema</label>
              <select id="usuario-cargo" name="cargo" value={formUsuario.cargo} onChange={e => setFormUsuario({...formUsuario, cargo: e.target.value})}>
                <option value="ADMIN">Gestor / Administrador</option>
                <option value="MEDICO">Médico(a)</option>
                <option value="ENFERMEIRO_ASSISTENCIAL">Enfermeiro(a)</option>
                <option value="TECNICO_ENFERMAGEM">Técnico(a) de Enfermagem</option>
                <option value="FARMACEUTICO">Farmacêutico(a)</option>
                <option value="RECEPCIONISTA">Recepção / Atendimento</option>
                <option value="OUTROS">Outros</option>
              </select>
              
              {erroSalvar && <p className="usuario-form-error" role="alert" aria-live="assertive">{erroSalvar}</p>}
              <button type="button" className="btn-salvar" onClick={() => void salvarUsuario()} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
