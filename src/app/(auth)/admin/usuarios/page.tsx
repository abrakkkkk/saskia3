'use client';
import { useEffect, useRef } from 'react';
import './admin-usuarios.css';

export default function AdminUsuariosPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Execute original JS logic
        const scriptEl = document.createElement('script');
        scriptEl.innerHTML = `

// ==================== MULTI-TENANCY ====================
function getUsuarioLogado(){try{const u=localStorage.getItem("usuarioLogado");return u?JSON.parse(u):null;}catch(e){return null;}}
function getHospitalId(){const usuario=getUsuarioLogado();if(!usuario){window.location.href="/";return null;}return usuario.hospitalId||usuario.id||"hospital_001";}
function getDB(chave){const hid=getHospitalId();if(!hid)return[];return JSON.parse(localStorage.getItem(hid+"_"+chave)||"[]");}
function setDB(chave,dados){const hid=getHospitalId();if(!hid)return;localStorage.setItem(hid+"_"+chave,JSON.stringify(dados));}
function sair(){localStorage.removeItem("usuarioLogado");window.location.href="/";}

// ==================== USUÁRIOS GLOBAIS ====================
function getUsuariosGlobais(){return JSON.parse(localStorage.getItem("saskiaUsuarios")||"[]");}
function setUsuariosGlobais(u){localStorage.setItem("saskiaUsuarios",JSON.stringify(u));}
function getHospitais(){return JSON.parse(localStorage.getItem("saskiaHospitais")||"[]");}



let usuarios = getUsuariosGlobais();
let filtroAtual = "todos";

const cargosPorNivel = {
nivel1:[{value:"diretor_geral",label:"Diretor Geral (CEO)"},{value:"diretor_admin",label:"Diretor Administrativo"},{value:"diretor_tecnico",label:"Diretor Técnico/Clínico"},{value:"diretor_enfermagem",label:"Diretor de Enfermagem"}],
nivel2:[{value:"chefe_departamento",label:"Chefe de Departamento"},{value:"coordenador_unidade",label:"Coordenador de Unidade"},{value:"enfermeiro_supervisor",label:"Enfermeiro Supervisor"}],
nivel3:[{value:"medico_especialista",label:"Médico Especialista"},{value:"medico_plantonista",label:"Médico Plantonista"},{value:"enfermeiro_assistencial",label:"Enfermeiro Assistencial"},{value:"fisioterapeuta",label:"Fisioterapeuta"},{value:"nutricionista",label:"Nutricionista"},{value:"psicologo",label:"Psicólogo"},{value:"farmaceutico",label:"Farmacêutico"},{value:"assistente_social",label:"Assistente Social"}],
nivel4:[{value:"tecnico_enfermagem",label:"Técnico de Enfermagem"},{value:"tecnico_radiologia",label:"Técnico de Radiologia"},{value:"tecnico_laboratorio",label:"Técnico de Laboratório"},{value:"auxiliar_enfermagem",label:"Auxiliar de Enfermagem"}],
nivel5:[{value:"recepcionista",label:"Recepcionista"},{value:"faturista",label:"Faturista"},{value:"maqueiro",label:"Maqueiro"},{value:"auxiliar_farmacia",label:"Auxiliar de Farmácia"}],
nivel6:[{value:"cozinha_nutricao",label:"Cozinha e Nutrição"},{value:"manutencao",label:"Manutenção"},{value:"seguranca",label:"Segurança e Portaria"},{value:"higiene_limpeza",label:"Auxiliar de Higiene e Limpeza"}]
};

const infoNivel = {nivel1:"Alta gestão - Acesso total ao sistema.",nivel2:"Coordenação - Gerencia equipes e processos.",nivel3:"Assistência direta ao paciente.",nivel4:"Suporte assistencial sob supervisão.",nivel5:"Apoio administrativo e atendimento.",nivel6:"Infraestrutura, segurança e higiene."};

function inicializar(){listarUsuarios();}

function toggleSubmenu(id){const submenu=document.getElementById(id);const menuItem=event.currentTarget;if(submenu.style.display==="block"){submenu.style.display="none";menuItem.classList.remove("ativo");}else{submenu.style.display="block";menuItem.classList.add("ativo");}}

function carregarHospitaisSelect(){const hospitais=getHospitais();const select=document.getElementById("usuarioHospital");select.innerHTML='<option value="">Selecione o hospital...</option>'+hospitais.filter(h=>h.ativo).map(h=>\`<option value="\${h.id}">\${h.nome}</option>\`).join('');}

function carregarCargosPorNivel(){const nivel=document.getElementById("usuarioNivel").value;const cargoSelect=document.getElementById("usuarioCargo");const ni=document.getElementById("nivelInfo");if(nivel&&cargosPorNivel[nivel]){cargoSelect.innerHTML='<option value="">Selecione o cargo</option>';cargosPorNivel[nivel].forEach(c=>{cargoSelect.innerHTML+=\`<option value="\${c.value}">\${c.label}</option>\`;});ni.innerHTML=infoNivel[nivel]||"";carregarPermissoesPorNivel(nivel);}else{cargoSelect.innerHTML='<option value="">Selecione primeiro o nível</option>';ni.innerHTML="";}}

function carregarPermissoesPorNivel(nivel){["perm_pacientes","perm_agenda","perm_receituario","perm_recepcao","perm_admin","perm_relatorios","perm_prontuarios","perm_financeiro"].forEach(p=>document.getElementById(p).checked=false);if(nivel==="nivel1"){["perm_pacientes","perm_agenda","perm_receituario","perm_recepcao","perm_admin","perm_relatorios","perm_prontuarios","perm_financeiro"].forEach(p=>document.getElementById(p).checked=true);}else if(nivel==="nivel2"){["perm_pacientes","perm_agenda","perm_receituario","perm_recepcao","perm_relatorios","perm_prontuarios"].forEach(p=>document.getElementById(p).checked=true);}else if(nivel==="nivel3"){["perm_pacientes","perm_agenda","perm_receituario","perm_prontuarios"].forEach(p=>document.getElementById(p).checked=true);}else if(nivel==="nivel4"){["perm_pacientes","perm_agenda"].forEach(p=>document.getElementById(p).checked=true);}else if(nivel==="nivel5"){["perm_pacientes","perm_agenda","perm_recepcao"].forEach(p=>document.getElementById(p).checked=true);}}

function getBadgeClass(n){const c={nivel1:"badge-nivel1",nivel2:"badge-nivel2",nivel3:"badge-nivel3",nivel4:"badge-nivel4",nivel5:"badge-nivel5",nivel6:"badge-nivel6"};return c[n]||"";}
function getNivelLabel(n){const l={nivel1:"Estratégico",nivel2:"Tático",nivel3:"Operacional",nivel4:"Técnico",nivel5:"Apoio",nivel6:"Infraestrutura"};return l[n]||n;}
function getNivelIcon(n){const i={nivel1:'<i class="las la-crown"></i>',nivel2:'<i class="las la-chalkboard"></i>',nivel3:'<i class="las la-stethoscope"></i>',nivel4:'<i class="las la-microscope"></i>',nivel5:'<i class="las la-headset"></i>',nivel6:'<i class="las la-tools"></i>'};return i[n]||'<i class="las la-user"></i>';}
function getCargoLabel(c){for(let n in cargosPorNivel){const cargo=cargosPorNivel[n].find(ca=>ca.value===c);if(cargo)return cargo.label;}return c;}

function listarUsuarios(){const lista=document.getElementById("listaUsuarios");usuarios=getUsuariosGlobais();let uf=usuarios;if(filtroAtual!=="todos")uf=usuarios.filter(u=>u.nivel===filtroAtual);if(uf.length===0){lista.innerHTML="<p style='text-align:center;padding:30px;color:#94a3b8;'>Nenhum usuário cadastrado.</p>";return;}const hospitais=getHospitais();let html="";for(let i=0;i<uf.length;i++){const u=uf[i];const hospital=hospitais.find(h=>h.id===u.hospitalId);html+=\`<div class="usuario-item"><div class="usuario-info"><h4><i class="las la-user-circle"></i> \${u.nome}</h4><p><i class="las la-envelope"></i> \${u.email}</p><p><i class="las la-hospital"></i> \${hospital?hospital.nome:'Hospital não encontrado'}</p><p><i class="las la-briefcase"></i> \${getCargoLabel(u.cargo)}</p><span class="badge \${getBadgeClass(u.nivel)}">\${getNivelIcon(u.nivel)} \${getNivelLabel(u.nivel)}</span></div><div><button class="btn-editar" onclick="editarUsuario('\${u.id}')"><i class="las la-edit"></i></button><button class="btn-excluir" onclick="excluirUsuario('\${u.id}')"><i class="las la-trash"></i></button></div></div>\`;}lista.innerHTML=html;}

function filtrarPorNivel(nivel){filtroAtual=nivel;document.querySelectorAll('.filtro-btn').forEach(b=>b.classList.remove('active'));event.target.classList.add('active');listarUsuarios();}

function abrirModalUsuario(){document.getElementById("modalTituloUsuario").innerHTML='<i class="las la-user-plus"></i> Novo Usuário';document.getElementById("usuarioIndex").value="";document.getElementById("usuarioNome").value="";document.getElementById("usuarioEmail").value="";document.getElementById("usuarioSenha").value="";document.getElementById("usuarioNivel").value="";document.getElementById("usuarioCargo").innerHTML='<option value="">Selecione primeiro o nível</option>';document.getElementById("nivelInfo").innerHTML="";["perm_pacientes","perm_agenda","perm_receituario","perm_recepcao","perm_admin","perm_relatorios","perm_prontuarios","perm_financeiro"].forEach(p=>document.getElementById(p).checked=false);carregarHospitaisSelect();document.getElementById("modalUsuario").style.display="flex";}

function editarUsuario(id){const u=usuarios.find(usr=>usr.id===id);if(!u)return;document.getElementById("modalTituloUsuario").innerHTML='<i class="las la-user-edit"></i> Editar Usuário';document.getElementById("usuarioIndex").value=id;document.getElementById("usuarioNome").value=u.nome;document.getElementById("usuarioEmail").value=u.email;document.getElementById("usuarioSenha").value="";carregarHospitaisSelect();setTimeout(()=>{document.getElementById("usuarioHospital").value=u.hospitalId||"";},100);document.getElementById("usuarioNivel").value=u.nivel||"";carregarCargosPorNivel();setTimeout(()=>{document.getElementById("usuarioCargo").value=u.cargo||"";},150);setTimeout(()=>{["perm_pacientes","perm_agenda","perm_receituario","perm_recepcao","perm_admin","perm_relatorios","perm_prontuarios","perm_financeiro"].forEach(p=>{document.getElementById(p).checked=u.permissoes&&u.permissoes[p]||false;});},200);document.getElementById("modalUsuario").style.display="flex";}

function salvarUsuario(){const id=document.getElementById("usuarioIndex").value;const hospitalId=document.getElementById("usuarioHospital").value;const nome=document.getElementById("usuarioNome").value.trim();const email=document.getElementById("usuarioEmail").value.trim();const senha=document.getElementById("usuarioSenha").value;const nivel=document.getElementById("usuarioNivel").value;const cargo=document.getElementById("usuarioCargo").value;if(!hospitalId){alert("Selecione o hospital!");return;}if(!nome||!email){alert("Preencha nome e e-mail!");return;}if(!nivel||!cargo){alert("Selecione nível e cargo!");return;}const usuario={id:id||("user_"+Date.now()),hospitalId,nome,email:email.toLowerCase(),nivel,cargo,permissoes:{perm_pacientes:document.getElementById("perm_pacientes").checked,perm_agenda:document.getElementById("perm_agenda").checked,perm_receituario:document.getElementById("perm_receituario").checked,perm_recepcao:document.getElementById("perm_recepcao").checked,perm_admin:document.getElementById("perm_admin").checked,perm_relatorios:document.getElementById("perm_relatorios").checked,perm_prontuarios:document.getElementById("perm_prontuarios").checked,perm_financeiro:document.getElementById("perm_financeiro").checked},ativo:true,dataCadastro:new Date().toISOString()};if(senha){usuario.senha=senha;}else if(id){const existente=usuarios.find(u=>u.id===id);if(existente){usuario.senha=existente.senha;}else{alert("Informe uma senha!");return;}}else{alert("Informe uma senha!");return;}if(!id){usuarios.push(usuario);}else{const index=usuarios.findIndex(u=>u.id===id);if(index>=0){usuarios[index]=usuario;}else{usuarios.push(usuario);}}setUsuariosGlobais(usuarios);fecharModalUsuario();listarUsuarios();alert("✅ Usuário salvo com sucesso!");}

function excluirUsuario(id){if(confirm("Tem certeza que deseja excluir este usuário?")){usuarios=usuarios.filter(u=>u.id!==id);setUsuariosGlobais(usuarios);listarUsuarios();alert("Usuário excluído!");}}

function fecharModalUsuario(){document.getElementById("modalUsuario").style.display="none";}
`;
        document.body.appendChild(scriptEl);

        return () => {
            if (scriptEl.parentNode) {
                scriptEl.parentNode.removeChild(scriptEl);
            }
        };
    }, []);

    return (
        <div 
            className="migrated-page-container" 
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: `<div class="conteudo">
<h2><i class="las la-users"></i> Usuários do Sistema</h2>
<p>Gerencie todos os colaboradores com seus respectivos níveis de acesso.</p>
<button onclick="abrirModalUsuario()" style="margin-bottom:20px;padding:12px 24px;background:#1e3a8a;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;"><i class="las la-user-plus"></i> Novo Usuário</button>

<div class="filtro-cargos">
<button class="filtro-btn active" onclick="filtrarPorNivel('todos')"><i class="las la-list-ul"></i> Todos</button>
<button class="filtro-btn" onclick="filtrarPorNivel('nivel1')"><i class="las la-crown"></i> Estratégico</button>
<button class="filtro-btn" onclick="filtrarPorNivel('nivel2')"><i class="las la-chalkboard"></i> Tático</button>
<button class="filtro-btn" onclick="filtrarPorNivel('nivel3')"><i class="las la-stethoscope"></i> Operacional</button>
<button class="filtro-btn" onclick="filtrarPorNivel('nivel4')"><i class="las la-microscope"></i> Técnico</button>
<button class="filtro-btn" onclick="filtrarPorNivel('nivel5')"><i class="las la-headset"></i> Apoio</button>
<button class="filtro-btn" onclick="filtrarPorNivel('nivel6')"><i class="las la-tools"></i> Infraestrutura</button>
</div>

<div id="listaUsuarios"></div>
</div>
<div id="modalUsuario" class="modal">
<div class="modal-content">
<h3 id="modalTituloUsuario"><i class="las la-user-plus"></i> Novo Usuário</h3>
<input type="hidden" id="usuarioIndex">
<div class="form-group"><label><i class="las la-hospital"></i> Hospital *</label><select id="usuarioHospital"><option value="">Selecione o hospital...</option></select></div>
<div class="form-group"><label><i class="las la-user"></i> Nome completo *</label><input type="text" id="usuarioNome" placeholder="Nome completo"></div>
<div class="form-group"><label><i class="las la-envelope"></i> E-mail *</label><input type="email" id="usuarioEmail" placeholder="E-mail"></div>
<div class="form-group"><label><i class="las la-lock"></i> Senha</label><input type="password" id="usuarioSenha" placeholder="Senha (mínimo 4 caracteres)"></div>
<div class="form-group"><label><i class="las la-layer-group"></i> Nível Hierárquico *</label><select id="usuarioNivel" onchange="carregarCargosPorNivel()"><option value="">Selecione o nível</option><option value="nivel1">🏢 Nível Estratégico</option><option value="nivel2">📋 Nível Tático</option><option value="nivel3">🩺 Nível Operacional</option><option value="nivel4">🔬 Nível Técnico</option><option value="nivel5">📞 Nível Apoio</option><option value="nivel6">🔧 Nível Infraestrutura</option></select><div class="nivel-info" id="nivelInfo"></div></div>
<div class="form-group"><label><i class="las la-briefcase"></i> Cargo *</label><select id="usuarioCargo"><option value="">Selecione primeiro o nível</option></select></div>
<div class="permissoes"><h4><i class="las la-shield-alt"></i> Permissões</h4><div class="permissoes-grid">
<label class="perm-item"><input type="checkbox" id="perm_pacientes"> <i class="las la-user-injured"></i> Pacientes</label>
<label class="perm-item"><input type="checkbox" id="perm_agenda"> <i class="las la-calendar"></i> Agenda</label>
<label class="perm-item"><input type="checkbox" id="perm_receituario"> <i class="las la-file-prescription"></i> Receituário</label>
<label class="perm-item"><input type="checkbox" id="perm_recepcao"> <i class="las la-user-nurse"></i> Recepção</label>
<label class="perm-item"><input type="checkbox" id="perm_admin"> <i class="las la-hospital"></i> Admin</label>
<label class="perm-item"><input type="checkbox" id="perm_relatorios"> <i class="las la-chart-line"></i> Relatórios</label>
<label class="perm-item"><input type="checkbox" id="perm_prontuarios"> <i class="las la-file-alt"></i> Prontuários</label>
<label class="perm-item"><input type="checkbox" id="perm_financeiro"> <i class="las la-coins"></i> Financeiro</label>
</div></div>
<button onclick="salvarUsuario()" style="margin-top:15px;padding:12px;background:#16a34a;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;width:100%;"><i class="las la-save"></i> Salvar Usuário</button>
<button onclick="fecharModalUsuario()" style="margin-top:8px;padding:12px;background:#666;color:white;border:none;border-radius:8px;cursor:pointer;width:100%;"><i class="las la-times"></i> Cancelar</button>
</div>
</div>
<h3 id="modalTituloUsuario"><i class="las la-user-plus"></i> Novo Usuário</h3>` }} 
        />
    );
}
