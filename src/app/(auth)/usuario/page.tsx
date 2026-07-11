'use client';
import { useState, useEffect } from 'react';
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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroAtual, setFiltroAtual] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalAberto, setModalAberto] = useState(false);
  const [formUsuario, setFormUsuario] = useState({ id: '', nome: '', email: '', senha: '', cargo: 'MEDICO' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

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
  const adminCount = usuarios.filter(u => getNivel(u.cargo) === 'admin').length;
  const profissionalCount = usuarios.filter(u => getNivel(u.cargo) === 'profissional').length;
  const recepcaoCount = usuarios.filter(u => getNivel(u.cargo) === 'recepcao').length;

  // Filtro
  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroAtual === 'todos') return true;
    return getNivel(u.cargo) === filtroAtual;
  });

  const abrirModal = (u?: Usuario) => {
    if (u) {
      setFormUsuario({ id: u.id, nome: u.nome, email: u.email, senha: '', cargo: u.cargo });
    } else {
      setFormUsuario({ id: '', nome: '', email: '', senha: '', cargo: 'MEDICO' });
    }
    setModalAberto(true);
  };

  const salvarUsuario = async () => {
    if (!formUsuario.nome || !formUsuario.email) {
      alert("Preencha nome e e-mail!");
      return;
    }
    if (!formUsuario.id && !formUsuario.senha) {
      alert("Informe uma senha para o novo usuário!");
      return;
    }

    setIsSaving(true);
    try {
      const url = formUsuario.id ? `/api/usuarios/${formUsuario.id}` : '/api/usuarios';
      const method = formUsuario.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUsuario)
      });

      if (res.ok) {
        alert("Usuário salvo com sucesso!");
        setModalAberto(false);
        carregarUsuarios();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao salvar usuário");
      }
    } catch (error) {
      alert("Erro de conexão");
    } finally {
      setIsSaving(false);
    }
  };

  const excluirUsuario = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
          alert("Usuário excluído!");
          carregarUsuarios();
        } else {
          alert("Erro ao excluir usuário");
        }
      } catch (error) {
        alert("Erro de conexão");
      }
    }
  };

  return (
    <div className="conteudo">
      <div className="header-usuarios">
        <h2><i className="las la-users"></i> Usuários do Sistema</h2>
        <button className="btn-novo" onClick={() => abrirModal()}>
          <i className="las la-user-plus"></i> Novo Usuário
        </button>
      </div>

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
          <h4><i className="las la-users"></i> Total</h4>
          <div className="numero">{usuarios.length}</div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="filtros-usuarios">
        <button className={`filtro-btn ${filtroAtual === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltroAtual('todos')}><i className="las la-list-ul"></i> Todos</button>
        <button className={`filtro-btn ${filtroAtual === 'admin' ? 'ativo' : ''}`} onClick={() => setFiltroAtual('admin')}><i className="las la-crown"></i> Administradores</button>
        <button className={`filtro-btn ${filtroAtual === 'profissional' ? 'ativo' : ''}`} onClick={() => setFiltroAtual('profissional')}><i className="las la-stethoscope"></i> Profissionais</button>
        <button className={`filtro-btn ${filtroAtual === 'recepcao' ? 'ativo' : ''}`} onClick={() => setFiltroAtual('recepcao')}><i className="las la-headset"></i> Recepção</button>
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="sem-dados">Carregando usuários...</td></tr>
            ) : usuariosFiltrados.length === 0 ? (
              <tr><td colSpan={6} className="sem-dados">Nenhum usuário encontrado</td></tr>
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
                    <td>
                      <button className="btn-editar" onClick={() => abrirModal(u)}><i className="las la-edit"></i></button>
                      <button className="btn-excluir" onClick={() => excluirUsuario(u.id)}><i className="las la-trash"></i></button>
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
        <div className="modal-usuario" style={{ display: 'flex' }}>
          <div className="modal-content">
            <div className="modal-header">
              <span><i className="las la-user-plus"></i> {formUsuario.id ? 'Editar Usuário' : 'Novo Usuário'}</span>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <label>Nome completo</label>
              <input type="text" value={formUsuario.nome} onChange={e => setFormUsuario({...formUsuario, nome: e.target.value})} placeholder="Nome completo" />
              
              <label>E-mail</label>
              <input type="email" value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})} placeholder="E-mail" />
              
              <label>Senha {formUsuario.id && '(Deixe em branco para manter a atual)'}</label>
              <input type="password" value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} placeholder="Senha" />
              
              <label>Cargo do Sistema</label>
              <select value={formUsuario.cargo} onChange={e => setFormUsuario({...formUsuario, cargo: e.target.value})}>
                <option value="ADMIN">Gestor / Administrador</option>
                <option value="MEDICO">Médico(a)</option>
                <option value="ENFERMEIRO_ASSISTENCIAL">Enfermeiro(a)</option>
                <option value="TECNICO_ENFERMAGEM">Técnico(a) de Enfermagem</option>
                <option value="FARMACEUTICO">Farmacêutico(a)</option>
                <option value="RECEPCIONISTA">Recepção / Atendimento</option>
                <option value="OUTROS">Outros</option>
              </select>
              
              <button className="btn-salvar" onClick={salvarUsuario} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
