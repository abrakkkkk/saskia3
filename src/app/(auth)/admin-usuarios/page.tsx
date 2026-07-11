'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import './usuarios.css';

interface Permissoes {
  perm_pacientes: boolean;
  perm_agenda: boolean;
  perm_receituario: boolean;
  perm_recepcao: boolean;
  perm_admin: boolean;
  perm_relatorios: boolean;
  perm_prontuarios: boolean;
  perm_financeiro: boolean;
}

interface Usuario {
  id: string;
  hospitalId: string;
  nome: string;
  email: string;
  senha?: string;
  nivel: string;
  cargo: string;
  permissoes?: Permissoes;
  ativo?: boolean;
}

interface Hospital {
  id: string;
  nome: string;
  ativo?: boolean;
}

const CARGOS_POR_NIVEL: Record<string, { value: string; label: string }[]> = {
  nivel1: [
    { value: "diretor_geral", label: "Diretor Geral (CEO)" },
    { value: "diretor_admin", label: "Diretor Administrativo" },
    { value: "diretor_tecnico", label: "Diretor Técnico/Clínico" },
    { value: "diretor_enfermagem", label: "Diretor de Enfermagem" }
  ],
  nivel2: [
    { value: "chefe_departamento", label: "Chefe de Departamento" },
    { value: "coordenador_unidade", label: "Coordenador de Unidade" },
    { value: "enfermeiro_supervisor", label: "Enfermeiro Supervisor" }
  ],
  nivel3: [
    { value: "medico_especialista", label: "Médico Especialista" },
    { value: "medico_plantonista", label: "Médico Plantonista" },
    { value: "enfermeiro_assistencial", label: "Enfermeiro Assistencial" },
    { value: "fisioterapeuta", label: "Fisioterapeuta" },
    { value: "nutricionista", label: "Nutricionista" },
    { value: "psicologo", label: "Psicólogo" },
    { value: "farmaceutico", label: "Farmacêutico" },
    { value: "assistente_social", label: "Assistente Social" }
  ],
  nivel4: [
    { value: "tecnico_enfermagem", label: "Técnico de Enfermagem" },
    { value: "tecnico_radiologia", label: "Técnico de Radiologia" },
    { value: "tecnico_laboratorio", label: "Técnico de Laboratório" },
    { value: "auxiliar_enfermagem", label: "Auxiliar de Enfermagem" }
  ],
  nivel5: [
    { value: "recepcionista", label: "Recepcionista" },
    { value: "faturista", label: "Faturista" },
    { value: "maqueiro", label: "Maqueiro" },
    { value: "auxiliar_farmacia", label: "Auxiliar de Farmácia" }
  ],
  nivel6: [
    { value: "cozinha_nutricao", label: "Cozinha e Nutrição" },
    { value: "manutencao", label: "Manutenção" },
    { value: "seguranca", label: "Segurança e Portaria" },
    { value: "higiene_limpeza", label: "Auxiliar de Higiene e Limpeza" }
  ]
};

const INFO_NIVEL: Record<string, string> = {
  nivel1: "Alta gestão - Acesso total ao sistema.",
  nivel2: "Coordenação - Gerencia equipes e processos.",
  nivel3: "Assistência direta ao paciente.",
  nivel4: "Suporte assistencial sob supervisão.",
  nivel5: "Apoio administrativo e atendimento.",
  nivel6: "Infraestrutura, segurança e higiene."
};

const defaultPermissoes = (): Permissoes => ({
  perm_pacientes: false,
  perm_agenda: false,
  perm_receituario: false,
  perm_recepcao: false,
  perm_admin: false,
  perm_relatorios: false,
  perm_prontuarios: false,
  perm_financeiro: false
});

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [filtroAtual, setFiltroAtual] = useState('todos');

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<string | null>(null);
  
  const [formHospital, setFormHospital] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [formNivel, setFormNivel] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formPermissoes, setFormPermissoes] = useState<Permissoes>(defaultPermissoes());

  useEffect(() => {
    fetch('/api/usuario').then(res => res.json()).then(data => {
      if (Array.isArray(data)) {
        if (data.length === 0) {
          const defaultUser: Usuario = {
            id: "user_master",
            hospitalId: "hosp_matriz",
            nome: "Administrador Master",
            email: "admin@saskiasaude.com.br",
            senha: "admin123",
            cargo: "diretor_geral",
            nivel: "nivel1",
            ativo: true,
            permissoes: { ...defaultPermissoes(), perm_pacientes: true, perm_agenda: true, perm_receituario: true, perm_recepcao: true, perm_admin: true, perm_relatorios: true, perm_prontuarios: true, perm_financeiro: true }
          };
          setUsuarios([defaultUser]);
          fetch('/api/usuario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(defaultUser) }).catch(console.error);
        } else {
          setUsuarios(data);
        }
      }
    }).catch(console.error);

    fetch('/api/hospital').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setHospitais(data);
    }).catch(console.error);
  }, []);

  const handleChangeNivel = (nivel: string) => {
    setFormNivel(nivel);
    setFormCargo('');
    
    // Auto permissoes setup based on legacy logic
    const p = defaultPermissoes();
    if(nivel === 'nivel1') {
      p.perm_pacientes = true; p.perm_agenda = true; p.perm_receituario = true; p.perm_recepcao = true; p.perm_admin = true; p.perm_relatorios = true; p.perm_prontuarios = true; p.perm_financeiro = true;
    } else if (nivel === 'nivel2') {
      p.perm_pacientes = true; p.perm_agenda = true; p.perm_receituario = true; p.perm_recepcao = true; p.perm_relatorios = true; p.perm_prontuarios = true;
    } else if (nivel === 'nivel3') {
      p.perm_pacientes = true; p.perm_agenda = true; p.perm_receituario = true; p.perm_prontuarios = true;
    } else if (nivel === 'nivel4') {
      p.perm_pacientes = true; p.perm_agenda = true;
    } else if (nivel === 'nivel5') {
      p.perm_pacientes = true; p.perm_agenda = true; p.perm_recepcao = true;
    }
    setFormPermissoes(p);
  };

  const handlePermCheckbox = (field: keyof Permissoes) => {
    setFormPermissoes(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const abrirModal = (id?: string) => {
    if (id) {
      const u = usuarios.find(usr => usr.id === id);
      if (u) {
        setEditIndex(id);
        setFormHospital(u.hospitalId || '');
        setFormNome(u.nome || '');
        setFormEmail(u.email || '');
        setFormSenha(''); // only edit if typed
        setFormNivel(u.nivel || '');
        setFormCargo(u.cargo || '');
        setFormPermissoes(u.permissoes || defaultPermissoes());
      }
    } else {
      setEditIndex(null);
      setFormHospital('');
      setFormNome('');
      setFormEmail('');
      setFormSenha('');
      setFormNivel('');
      setFormCargo('');
      setFormPermissoes(defaultPermissoes());
    }
    setIsModalOpen(true);
  };

  const salvarUsuario = () => {
    if(!formHospital) return alert("Selecione o hospital!");
    if(!formNome || !formEmail) return alert("Preencha nome e e-mail!");
    if(!formNivel || !formCargo) return alert("Selecione nível e cargo!");

    let newUsuarios = [...usuarios];
    let finalSenha = formSenha;

    if (editIndex) {
      const index = newUsuarios.findIndex(u => u.id === editIndex);
      if (index >= 0) {
        if(!finalSenha) finalSenha = newUsuarios[index].senha || '123456';
        newUsuarios[index] = {
          ...newUsuarios[index],
          hospitalId: formHospital,
          nome: formNome,
          email: formEmail.toLowerCase(),
          senha: finalSenha,
          nivel: formNivel,
          cargo: formCargo,
          permissoes: formPermissoes
        };
      }
    } else {
      if(!finalSenha) return alert("Informe uma senha inicial!");
      newUsuarios.push({
        id: "user_" + Date.now(),
        hospitalId: formHospital,
        nome: formNome,
        email: formEmail.toLowerCase(),
        senha: finalSenha,
        nivel: formNivel,
        cargo: formCargo,
        permissoes: formPermissoes,
        ativo: true
      });
    }

    setUsuarios(newUsuarios);
    
    if (editIndex) {
      // Logic for editing would go here (e.g., PUT /api/usuario)
    } else {
      fetch('/api/usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: formHospital,
          nome: formNome,
          email: formEmail.toLowerCase(),
          senha: finalSenha,
          nivel: formNivel,
          cargo: formCargo,
          permissoes: formPermissoes,
          ativo: true
        })
      }).catch(console.error);
    }

    setIsModalOpen(false);
    alert("✅ Usuário salvo com sucesso!");
  };

  const excluirUsuario = (id: string) => {
    if(confirm("Tem certeza que deseja excluir este usuário?")) {
      const filtrados = usuarios.filter(u => u.id !== id);
      setUsuarios(filtrados);
      // DELETE request would go here
    }
  };

  const getCargoLabel = (val: string) => {
    for(const lvl in CARGOS_POR_NIVEL) {
      const c = CARGOS_POR_NIVEL[lvl].find(x => x.value === val);
      if(c) return c.label;
    }
    return val;
  };

  const getNivelData = (n: string) => {
    const data: any = {
      nivel1: { label: "Estratégico", icon: "la-crown" },
      nivel2: { label: "Tático", icon: "la-chalkboard" },
      nivel3: { label: "Operacional", icon: "la-stethoscope" },
      nivel4: { label: "Técnico", icon: "la-microscope" },
      nivel5: { label: "Apoio", icon: "la-headset" },
      nivel6: { label: "Infraestrutura", icon: "la-tools" },
    };
    return data[n] || { label: n, icon: "la-user" };
  };

  const usuariosFiltrados = filtroAtual === 'todos' ? usuarios : usuarios.filter(u => u.nivel === filtroAtual);

  return (
    <div className="conteudo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2><i className="las la-users"></i> Usuários do Sistema</h2>
          <p>Gerencie todos os colaboradores com seus respectivos níveis de acesso.</p>
        </div>
        <button className="btn btn-primary" onClick={() => abrirModal()} style={{ padding: '12px 24px' }}>
          <i className="las la-user-plus"></i> Novo Usuário
        </button>
      </div>

      <div className="filtro-cargos">
        {[
          { id: 'todos', label: 'Todos', icon: 'la-list-ul' },
          { id: 'nivel1', label: 'Estratégico', icon: 'la-crown' },
          { id: 'nivel2', label: 'Tático', icon: 'la-chalkboard' },
          { id: 'nivel3', label: 'Operacional', icon: 'la-stethoscope' },
          { id: 'nivel4', label: 'Técnico', icon: 'la-microscope' },
          { id: 'nivel5', label: 'Apoio', icon: 'la-headset' },
          { id: 'nivel6', label: 'Infraestrutura', icon: 'la-tools' }
        ].map(f => (
          <button 
            key={f.id} 
            className={`filtro-btn ${filtroAtual === f.id ? 'active' : ''}`}
            onClick={() => setFiltroAtual(f.id)}
          >
            <i className={`las ${f.icon}`}></i> {f.label}
          </button>
        ))}
      </div>

      <div className="lista-usuarios">
        {usuariosFiltrados.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nenhum usuário encontrado neste nível.</p>
        ) : (
          usuariosFiltrados.map(u => {
            const hosp = hospitais.find(h => h.id === u.hospitalId);
            const nData = getNivelData(u.nivel);
            return (
              <div className="usuario-item" key={u.id}>
                <div className="usuario-info">
                  <h4><i className="las la-user-circle" style={{ fontSize: '24px', color: '#1e3a8a' }}></i> {u.nome}</h4>
                  <p><i className="las la-envelope"></i> {u.email}</p>
                  <p><i className="las la-hospital"></i> {hosp ? hosp.nome : 'Hospital não encontrado'}</p>
                  <p><i className="las la-briefcase"></i> {getCargoLabel(u.cargo)}</p>
                  <span className={`badge-nivel badge-${u.nivel}`}>
                    <i className={`las ${nData.icon}`}></i> {nData.label}
                  </span>
                </div>
                <div className="usuario-acoes">
                  <button className="btn-editar" onClick={() => abrirModal(u.id)} title="Editar"><i className="las la-edit"></i></button>
                  <button className="btn-excluir" onClick={() => excluirUsuario(u.id)} title="Excluir"><i className="las la-trash"></i></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className={editIndex ? "las la-user-edit" : "las la-user-plus"}></i> {editIndex ? "Editar Usuário" : "Novo Usuário"}</h3>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid-modal">
                <div className="form-group full">
                  <label><i className="las la-hospital"></i> Hospital *</label>
                  <select value={formHospital} onChange={e => setFormHospital(e.target.value)}>
                    <option value="">Selecione o hospital...</option>
                    {hospitais.filter(h => h.ativo !== false).map(h => (
                      <option key={h.id} value={h.id}>{h.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label><i className="las la-user"></i> Nome completo *</label>
                  <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Nome completo" />
                </div>

                <div className="form-group">
                  <label><i className="las la-envelope"></i> E-mail *</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="E-mail" />
                </div>

                <div className="form-group full">
                  <label><i className="las la-lock"></i> Senha</label>
                  <input type="password" value={formSenha} onChange={e => setFormSenha(e.target.value)} placeholder={editIndex ? "Deixe em branco para não alterar" : "Senha inicial"} />
                </div>

                <div className="form-group">
                  <label><i className="las la-layer-group"></i> Nível Hierárquico *</label>
                  <select value={formNivel} onChange={e => handleChangeNivel(e.target.value)}>
                    <option value="">Selecione o nível</option>
                    <option value="nivel1">🏢 Nível Estratégico</option>
                    <option value="nivel2">📋 Nível Tático</option>
                    <option value="nivel3">🩺 Nível Operacional</option>
                    <option value="nivel4">🔬 Nível Técnico</option>
                    <option value="nivel5">📞 Nível Apoio</option>
                    <option value="nivel6">🔧 Nível Infraestrutura</option>
                  </select>
                  {formNivel && INFO_NIVEL[formNivel] && (
                    <div className="nivel-info">
                      <i className="las la-info-circle" style={{ fontSize: '16px' }}></i> {INFO_NIVEL[formNivel]}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label><i className="las la-briefcase"></i> Cargo *</label>
                  <select value={formCargo} onChange={e => setFormCargo(e.target.value)}>
                    <option value="">Selecione primeiro o nível</option>
                    {formNivel && CARGOS_POR_NIVEL[formNivel] && CARGOS_POR_NIVEL[formNivel].map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="permissoes">
                <h4><i className="las la-shield-alt"></i> Permissões de Acesso</h4>
                <div className="permissoes-grid">
                  {[
                    { key: 'perm_pacientes', label: 'Pacientes', icon: 'la-user-injured' },
                    { key: 'perm_agenda', label: 'Agenda', icon: 'la-calendar' },
                    { key: 'perm_receituario', label: 'Receituário', icon: 'la-file-prescription' },
                    { key: 'perm_recepcao', label: 'Recepção', icon: 'la-user-nurse' },
                    { key: 'perm_admin', label: 'Admin', icon: 'la-hospital' },
                    { key: 'perm_relatorios', label: 'Relatórios', icon: 'la-chart-line' },
                    { key: 'perm_prontuarios', label: 'Prontuários', icon: 'la-file-alt' },
                    { key: 'perm_financeiro', label: 'Financeiro', icon: 'la-coins' }
                  ].map(p => (
                    <label className="perm-item" key={p.key}>
                      <input 
                        type="checkbox" 
                        checked={formPermissoes[p.key as keyof Permissoes]} 
                        onChange={() => handlePermCheckbox(p.key as keyof Permissoes)} 
                      />
                      <i className={`las ${p.icon}`}></i> {p.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={salvarUsuario}><i className="las la-save"></i> Salvar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
