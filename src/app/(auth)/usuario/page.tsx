'use client';
import { useEffect, useRef } from 'react';
import './usuario.css';

export default function UsuarioPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Execute original JS logic
        const scriptEl = document.createElement('script');
        scriptEl.innerHTML = `

let usuarios = [];
let filtroAtual = 'todos';

function carregarUsuarios() {
    const saved = localStorage.getItem("usuarios_sistema");
    if (saved) {
        usuarios = JSON.parse(saved);
    } else {
        usuarios = [
            { id: 1, nome: "Administrador Master", email: "admin@saskia.com", senha: "admin123", nivel: "admin", dataCadastro: new Date().toISOString() },
            { id: 2, nome: "Dr. Carlos Silva", email: "carlos@saskia.com", senha: "123456", nivel: "profissional", dataCadastro: new Date().toISOString() },
            { id: 3, nome: "Ana Recepção", email: "ana@saskia.com", senha: "123456", nivel: "recepcao", dataCadastro: new Date().toISOString() }
        ];
        salvarUsuarios();
    }
    atualizarStats();
    filtrarUsuarios(filtroAtual);
}

function salvarUsuarios() {
    localStorage.setItem("usuarios_sistema", JSON.stringify(usuarios));
}

function atualizarStats() {
    const admin = usuarios.filter(u => u.nivel === "admin").length;
    const profissional = usuarios.filter(u => u.nivel === "profissional").length;
    const recepcao = usuarios.filter(u => u.nivel === "recepcao").length;
    
    document.getElementById("totalAdmin").innerHTML = admin;
    document.getElementById("totalProfissionais").innerHTML = profissional;
    document.getElementById("totalRecepcaoUser").innerHTML = recepcao;
    document.getElementById("totalUsuarios").innerHTML = usuarios.length;
}

function renderizarUsuarios() {
    const tbody = document.getElementById("listaUsuarios");
    let usuariosFiltrados = usuarios;
    
    if (filtroAtual !== 'todos') {
        usuariosFiltrados = usuarios.filter(u => u.nivel === filtroAtual);
    }
    
    if (usuariosFiltrados.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="6" class="sem-dados">Nenhum usuário encontrado</td></tr>\`;
        return;
    }
    
    let html = "";
    for (let i = 0; i < usuariosFiltrados.length; i++) {
        const u = usuariosFiltrados[i];
        let nivelClass = "";
        let nivelNome = "";
        
        if (u.nivel === "admin") {
            nivelClass = "nivel-admin";
            nivelNome = "Administrador";
        } else if (u.nivel === "profissional") {
            nivelClass = "nivel-profissional";
            nivelNome = "Profissional de Saúde";
        } else {
            nivelClass = "nivel-recepcao";
            nivelNome = "Recepção";
        }
        
        const dataCadastro = u.dataCadastro ? new Date(u.dataCadastro).toLocaleDateString('pt-BR') : "-";
        
        html += \`
            <tr>
                <td><i class="las la-user-circle"></i> \${u.nome}</td>
                <td><i class="las la-envelope"></i> \${u.email}</td>
                <td><span class="badge-nivel \${nivelClass}">\${nivelNome}</span></td>
                <td>\${getCargoLabel(u.nivel)}</td>
                <td>\${dataCadastro}</td>
                <td>
                    <button class="btn-editar" onclick="editarUsuario(\${u.id})"><i class="las la-edit"></i></button>
                    <button class="btn-excluir" onclick="excluirUsuario(\${u.id})"><i class="las la-trash"></i></button>
                </td>
            </tr>
        \`;
    }
    tbody.innerHTML = html;
}

function getCargoLabel(nivel) {
    if (nivel === "admin") return "Gestor do Sistema";
    if (nivel === "profissional") return "Médico / Enfermeiro";
    return "Atendente / Recepcionista";
}

function filtrarUsuarios(filtro) {
    filtroAtual = filtro;
    document.querySelectorAll('.filtro-btn').forEach(btn => btn.classList.remove('ativo'));
    event.target.classList.add('ativo');
    renderizarUsuarios();
}

function abrirModalUsuario() {
    document.getElementById("usuarioId").value = "";
    document.getElementById("usuarioNome").value = "";
    document.getElementById("usuarioEmail").value = "";
    document.getElementById("usuarioSenha").value = "";
    document.getElementById("usuarioNivel").value = "profissional";
    document.getElementById("modalUsuario").style.display = "flex";
}

function fecharModalUsuario() {
    document.getElementById("modalUsuario").style.display = "none";
}

function editarUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (usuario) {
        document.getElementById("usuarioId").value = usuario.id;
        document.getElementById("usuarioNome").value = usuario.nome;
        document.getElementById("usuarioEmail").value = usuario.email;
        document.getElementById("usuarioSenha").value = "";
        document.getElementById("usuarioNivel").value = usuario.nivel;
        document.getElementById("modalUsuario").style.display = "flex";
    }
}

function salvarUsuario() {
    const id = document.getElementById("usuarioId").value;
    const nome = document.getElementById("usuarioNome").value;
    const email = document.getElementById("usuarioEmail").value;
    const senha = document.getElementById("usuarioSenha").value;
    const nivel = document.getElementById("usuarioNivel").value;
    
    if (!nome || !email) {
        alert("Preencha nome e e-mail!");
        return;
    }
    
    if (!id && !senha) {
        alert("Informe uma senha para o novo usuário!");
        return;
    }
    
    if (id) {
        const index = usuarios.findIndex(u => u.id == id);
        if (index !== -1) {
            usuarios[index].nome = nome;
            usuarios[index].email = email;
            usuarios[index].nivel = nivel;
            if (senha) usuarios[index].senha = senha;
        }
    } else {
        const novoId = usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id)) + 1 : 1;
        usuarios.push({
            id: novoId,
            nome: nome,
            email: email,
            senha: senha,
            nivel: nivel,
            dataCadastro: new Date().toISOString()
        });
    }
    
    salvarUsuarios();
    atualizarStats();
    renderizarUsuarios();
    fecharModalUsuario();
    alert("Usuário salvo com sucesso!");
}

function excluirUsuario(id) {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
        usuarios = usuarios.filter(u => u.id !== id);
        salvarUsuarios();
        atualizarStats();
        renderizarUsuarios();
        alert("Usuário excluído!");
    }
}
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

<div class="header-usuarios">
    <h2><i class="las la-users"></i> Usuários do Sistema</h2>
    <button class="btn-novo" onclick="abrirModalUsuario()">
        <i class="las la-user-plus"></i> Novo Usuário
    </button>
</div>

<!-- CARDS ESTATÍSTICOS -->
<div class="stats-usuarios">
    <div class="stat-card-user">
        <h4><i class="las la-crown"></i> Administradores</h4>
        <div class="numero" id="totalAdmin">0</div>
    </div>
    <div class="stat-card-user">
        <h4><i class="las la-stethoscope"></i> Profissionais</h4>
        <div class="numero" id="totalProfissionais">0</div>
    </div>
    <div class="stat-card-user">
        <h4><i class="las la-headset"></i> Recepção</h4>
        <div class="numero" id="totalRecepcaoUser">0</div>
    </div>
    <div class="stat-card-user">
        <h4><i class="las la-users"></i> Total</h4>
        <div class="numero" id="totalUsuarios">0</div>
    </div>
</div>

<!-- FILTROS -->
<div class="filtros-usuarios">
    <button class="filtro-btn ativo" onclick="filtrarUsuarios('todos')"><i class="las la-list-ul"></i> Todos</button>
    <button class="filtro-btn" onclick="filtrarUsuarios('admin')"><i class="las la-crown"></i> Administradores</button>
    <button class="filtro-btn" onclick="filtrarUsuarios('profissional')"><i class="las la-stethoscope"></i> Profissionais</button>
    <button class="filtro-btn" onclick="filtrarUsuarios('recepcao')"><i class="las la-headset"></i> Recepção</button>
</div>

<!-- TABELA DE USUÁRIOS -->
<div class="tabela-usuarios">
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
        <tbody id="listaUsuarios"></tbody>
    </table>
</div>

</div>
<div id="modalUsuario" class="modal-usuario">
    <div class="modal-content">
        <div class="modal-header">
            <span><i class="las la-user-plus"></i> Usuário</span>
            <button onclick="fecharModalUsuario()" style="background:none; border:none; color:white; font-size:24px;">×</button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="usuarioId">
            <label>Nome completo</label>
            <input type="text" id="usuarioNome" placeholder="Nome completo">
            <label>E-mail</label>
            <input type="email" id="usuarioEmail" placeholder="E-mail">
            <label>Senha</label>
            <input type="password" id="usuarioSenha" placeholder="Senha">
            <label>Nível de Acesso</label>
            <select id="usuarioNivel">
                <option value="admin">Administrador</option>
                <option value="profissional">Profissional de Saúde</option>
                <option value="recepcao">Recepção</option>
            </select>
            <button class="btn-salvar" onclick="salvarUsuario()">Salvar</button>
        </div>
    </div>
</div>` }} 
        />
    );
}
