'use client';
import { useEffect, useRef } from 'react';
import './admin-hospitais.css';

export default function AdminHospitaisPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Execute original JS logic
        const scriptEl = document.createElement('script');
        scriptEl.innerHTML = `
// ==================== FUNÇÕES DE DADOS ====================
function getHospitais() { return JSON.parse(localStorage.getItem("saskiaHospitais") || "[]"); }
function setHospitais(h) { localStorage.setItem("saskiaHospitais", JSON.stringify(h)); }
function getUsuarios() { return JSON.parse(localStorage.getItem("saskiaUsuarios") || "[]"); }
function setUsuarios(u) { localStorage.setItem("saskiaUsuarios", JSON.stringify(u)); }
function getFaturas() { return JSON.parse(localStorage.getItem("saskiaFaturas") || "[]"); }
function setFaturas(f) { localStorage.setItem("saskiaFaturas", JSON.stringify(f)); }
function logout() { localStorage.removeItem("saskiaSessao"); localStorage.removeItem("usuarioLogado"); window.location.href = "index.html"; }

const SENHA_MASTER = "admin123";
const planosValores = {
    "pref_grandes_capitais": 5000,
    "pref_metropolitanas": 3500,
    "pref_medio_porte": 2500,
    "pref_pequenas": 1200,
    "consultorio_individual": 149,
    "clinica_pequena": 399,
    "clinica_media": 799,
    "policlinica": 1499,
    "hospital_pequeno": 2499,
    "hospital_medio": 3999,
    "hospital_grande": 5999,
    "rede_hospitalar": 0,
    "filantropico": 0
};

function getNomePlano(valor) {
    const nomes = {
        "pref_grandes_capitais": "Grandes Capitais",
        "pref_metropolitanas": "Cidades Metropolitanas",
        "pref_medio_porte": "Cidades de Médio Porte",
        "pref_pequenas": "Cidades Pequenas",
        "consultorio_individual": "Consultório Individual",
        "clinica_pequena": "Clínica Pequena",
        "clinica_media": "Clínica Média",
        "policlinica": "Policlínica",
        "hospital_pequeno": "Hospital Pequeno Porte",
        "hospital_medio": "Hospital Médio Porte",
        "hospital_grande": "Hospital Grande Porte",
        "rede_hospitalar": "Rede Hospitalar",
        "filantropico": "🎁 Filantrópico"
    };
    return nomes[valor] || valor;
}

// ==================== VERIFICAÇÃO DE SENHA ====================
function verificarSenha() {
    const senhaDigitada = document.getElementById("senhaVerificacao").value;
    const erroMsg = document.getElementById("erroVerificacao");
    if (senhaDigitada === SENHA_MASTER) {
        document.getElementById("modalVerificacao").classList.remove("show");
        document.getElementById("adminContent").classList.remove("tela-bloqueada");
        listarTudo();
        const logs = JSON.parse(localStorage.getItem("saskiaAdminLogs") || "[]");
        logs.push({ acao: "ACESSO_ADMIN_HOSPITAIS", data: new Date().toISOString() });
        localStorage.setItem("saskiaAdminLogs", JSON.stringify(logs));
    } else {
        erroMsg.style.display = "block";
        document.getElementById("senhaVerificacao").value = "";
        document.getElementById("senhaVerificacao").focus();
    }
}

document.getElementById("adminContent").classList.add("tela-bloqueada");
document.getElementById("modalVerificacao").classList.add("show");
setTimeout(() => document.getElementById("senhaVerificacao").focus(), 500);

// ==================== CADASTRO DE HOSPITAL ====================
function cadastrarHospital() {
    const nome = document.getElementById("hospNome").value.trim();
    if (!nome) { alert("⚠️ Digite o nome do hospital!"); return; }
    const hospitais = getHospitais();
    if (hospitais.some(h => h.nome.toLowerCase() === nome.toLowerCase())) { alert("⚠️ Já existe um hospital com este nome!"); return; }
    hospitais.push({ id: "hosp_" + Date.now(), nome, cnpj: document.getElementById("hospCNPJ").value.trim(), endereco: document.getElementById("hospEndereco").value.trim(), telefone: document.getElementById("hospTelefone").value.trim(), dataCriacao: new Date().toISOString(), ativo: true });
    setHospitais(hospitais);
    ["hospNome","hospCNPJ","hospEndereco","hospTelefone"].forEach(id => document.getElementById(id).value = "");
    alert("✅ Hospital cadastrado com sucesso!");
    listarTudo();
}

// ==================== CADASTRO DE USUÁRIO ====================
function cadastrarUsuario() {
    const hospitalId = document.getElementById("userHospital").value;
    const nome = document.getElementById("userNome").value.trim();
    const email = document.getElementById("userEmail").value.trim();
    const senha = document.getElementById("userSenha").value || "123456";
    if (!hospitalId || !nome || !email) { alert("⚠️ Preencha hospital, nome e e-mail!"); return; }
    if (!email.includes('@') || !email.includes('.')) { alert("⚠️ Digite um e-mail válido!"); return; }
    const usuarios = getUsuarios();
    if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) { alert("⚠️ Já existe um usuário com este e-mail!"); return; }
    usuarios.push({ id: "user_" + Date.now(), hospitalId, nome, email: email.toLowerCase(), senha: senha, cargo: document.getElementById("userCargo").value, ativo: true, dataCadastro: new Date().toISOString() });
    setUsuarios(usuarios);
    ["userNome","userEmail"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("userSenha").value = "123456";
    alert("✅ Usuário cadastrado com sucesso!");
    listarTudo();
}

// ==================== FUNÇÕES FINANCEIRAS ====================
function atualizarValorPlano() {
    const plano = document.getElementById("fatPlano").value;
    const valor = planosValores[plano] || 0;
    document.getElementById("fatValor").value = valor;
    if (plano === "filantropico") {
        document.getElementById("fatTipoInst").value = "Filantrópico";
        alert("🎁 Plano Filantrópico selecionado! A fatura será gerada como CORTESIA (R\$ 0,00).");
    }
}

function verificarCortesia() {
    if (document.getElementById("fatTipoInst").value === "Filantrópico") {
        document.getElementById("fatValor").value = 0;
        document.getElementById("fatPlano").value = "filantropico";
        alert("🎁 Instituição Filantrópica! A fatura será gerada como CORTESIA (R\$ 0,00).");
    }
}

function carregarHospitaisFinanceiro() {
    const hospitais = getHospitais();
    document.getElementById("fatHospital").innerHTML = '<option value="">Selecione...</option>' + hospitais.filter(h => h.ativo).map(h => \`<option value="\${h.id}">\${h.nome}</option>\`).join('');
    document.getElementById("filtroHospitalFaturas").innerHTML = '<option value="todos">Todos os hospitais</option>' + hospitais.map(h => \`<option value="\${h.id}">\${h.nome}</option>\`).join('');
    document.getElementById("fatVencimento").value = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];
    document.getElementById("fatReferencia").value = new Date().toISOString().split('T')[0].substring(0, 7);
    document.getElementById("pgData").value = new Date().toISOString().split('T')[0];
}

function emitirFatura() {
    const hospitalId = document.getElementById("fatHospital").value;
    const plano = document.getElementById("fatPlano").value;
    const valor = parseFloat(document.getElementById("fatValor").value);
    const vencimento = document.getElementById("fatVencimento").value;
    const referencia = document.getElementById("fatReferencia").value;
    if (!hospitalId || !plano || !vencimento || !referencia) { alert("⚠️ Preencha hospital, plano, vencimento e referência!"); return; }
    const hospitais = getHospitais();
    const hospital = hospitais.find(h => h.id === hospitalId);
    const fatura = {
        id: "FAT-" + Date.now(),
        hospitalId,
        hospitalNome: hospital ? hospital.nome : "",
        plano: getNomePlano(plano),
        planoId: plano,
        valor,
        categoria: document.getElementById("fatCategoria").value,
        tipoInst: document.getElementById("fatTipoInst").value,
        vencimento,
        referencia,
        status: plano === "filantropico" || document.getElementById("fatTipoInst").value === "Filantrópico" ? "Cortesia" : "Pendente",
        dataEmissao: new Date().toISOString(),
        obs: document.getElementById("fatObs").value,
        pagamento: null
    };
    const faturas = getFaturas();
    faturas.push(fatura);
    setFaturas(faturas);
    ["fatObs"].forEach(id => document.getElementById(id).value = "");
    alert("✅ Fatura emitida com sucesso!");
    filtrarFaturasPorHospital();
}

function abrirModalPagamento(id) {
    const faturas = getFaturas();
    const f = faturas.find(ft => ft.id === id);
    if (!f) return;
    document.getElementById("pgFaturaId").value = id;
    document.getElementById("pgFaturaNum").innerHTML = f.id;
    document.getElementById("pgHospital").innerHTML = f.hospitalNome;
    document.getElementById("pgValor").innerHTML = "R\$ " + f.valor.toFixed(2);
    document.getElementById("pgData").value = new Date().toISOString().split('T')[0];
    document.getElementById("modalPagamento").style.display = "flex";
}

function confirmarPagamento() {
    const id = document.getElementById("pgFaturaId").value;
    const faturas = getFaturas();
    const f = faturas.find(ft => ft.id === id);
    if (!f) return;
    f.status = "Pago";
    f.pagamento = {
        data: document.getElementById("pgData").value,
        forma: document.getElementById("pgForma").value,
        comprovante: document.getElementById("pgComprovante").value,
        registradoPor: "Administrador",
        dataRegistro: new Date().toISOString()
    };
    setFaturas(faturas);
    document.getElementById("modalPagamento").style.display = "none";
    filtrarFaturasPorHospital();
    alert("✅ Pagamento registrado com sucesso!");
}

function excluirFatura(id) {
    if (!confirm("⚠️ Tem certeza que deseja EXCLUIR esta fatura?\\n\\nEsta ação não pode ser desfeita!")) return;
    if (!confirm("🔴 CONFIRMAÇÃO FINAL: Deseja realmente excluir esta fatura permanentemente?")) return;
    const faturas = getFaturas();
    const novasFaturas = faturas.filter(f => f.id !== id);
    setFaturas(novasFaturas);
    filtrarFaturasPorHospital();
    alert("🗑️ Fatura excluída com sucesso!");
}

function verRecibo(id) {
    const faturas = getFaturas();
    const f = faturas.find(ft => ft.id === id);
    if (!f || !f.pagamento) return;
    alert(\`📄 RECIBO\\n\\nFatura: \${f.id}\\nHospital: \${f.hospitalNome}\\nPlano: \${f.plano}\\nValor: R\$ \${f.valor.toFixed(2)}\\nPago em: \${new Date(f.pagamento.data + 'T00:00:00').toLocaleDateString('pt-BR')}\\nForma: \${f.pagamento.forma}\\nComprovante: \${f.pagamento.comprovante || 'N/I'}\`);
}

function filtrarFaturasPorHospital() {
    const hospitalId = document.getElementById("filtroHospitalFaturas")?.value || "todos";
    const faturas = getFaturas().slice().reverse();
    const lista = hospitalId === "todos" ? faturas : faturas.filter(f => f.hospitalId === hospitalId);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    lista.forEach(f => { if ((f.status === "Pendente" || f.status === "Vencido") && new Date(f.vencimento) < hoje) { f.status = "Vencido"; } });
    document.getElementById("tabelaFaturas").innerHTML = lista.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">Nenhuma fatura encontrada</td></tr>' : lista.map(f => {
        const statusBadge = f.status === "Pago" ? "badge-ativo" : f.status === "Cortesia" ? "badge-ativo" : f.status === "Vencido" ? "badge-inativo" : "badge-inativo";
        const statusLabel = f.status === "Pago" ? "✅ Pago" : f.status === "Cortesia" ? "🎁 Cortesia" : f.status === "Vencido" ? "❌ Vencido" : "⏳ Pendente";
        return \`<tr>
            <td><strong>\${f.id}</strong></td>
            <td>\${f.hospitalNome}</td>
            <td>\${f.plano}</td>
            <td><strong>R\$ \${f.valor.toFixed(2)}</strong></td>
            <td>\${new Date(f.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td><span class="badge \${statusBadge}">\${statusLabel}</span></td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
                \${f.status === 'Pendente' || f.status === 'Vencido' ? \`<button class="btn btn-success btn-sm" onclick="abrirModalPagamento('\${f.id}')"><i class="las la-credit-card"></i> Pagar</button>\` : ''}
                \${f.status === 'Pago' ? \`<button class="btn btn-info btn-sm" onclick="verRecibo('\${f.id}')"><i class="las la-receipt"></i> Recibo</button>\` : ''}
                <button class="btn btn-danger btn-sm" onclick="excluirFatura('\${f.id}')"><i class="las la-trash"></i> Excluir</button>
            </td>
        </tr>\`;
    }).join('');
}

// ==================== LISTAGEM ====================
function listarTudo() {
    const hospitais = getHospitais();
    const usuarios = getUsuarios();
    document.getElementById("tabelaHospitais").innerHTML = hospitais.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">Nenhum hospital cadastrado</td></tr>' : hospitais.map(h => { const qtdUsuarios = usuarios.filter(u => u.hospitalId === h.id).length; return \`<tr><td><strong>\${h.nome}</strong></td><td>\${h.cnpj || '-'}</td><td>\${h.endereco || '-'}</td><td>\${h.telefone || '-'}</td><td><span class="badge \${h.ativo ? 'badge-ativo' : 'badge-inativo'}"><i class="las la-\${h.ativo ? 'check' : 'times'}-circle"></i> \${h.ativo ? 'Ativo' : 'Inativo'}</span></td><td><span class="badge badge-info">\${qtdUsuarios} usuário(s)</span></td><td><button class="btn \${h.ativo ? 'btn-danger' : 'btn-success'} btn-sm" onclick="toggleHospital('\${h.id}')"><i class="las la-\${h.ativo ? 'ban' : 'check'}"></i> \${h.ativo ? 'Desativar' : 'Ativar'}</button></td></tr>\`; }).join('');
    document.getElementById("tabelaUsuarios").innerHTML = usuarios.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Nenhum usuário cadastrado</td></tr>' : usuarios.map(u => { const hosp = hospitais.find(h => h.id === u.hospitalId); return \`<tr><td><strong>\${u.nome}</strong></td><td>\${u.email}</td><td>\${formatarCargo(u.cargo)}</td><td>\${hosp ? hosp.nome : '<span style="color:#dc2626;">Não encontrado</span>'}</td><td><span class="badge \${u.ativo ? 'badge-ativo' : 'badge-inativo'}"><i class="las la-\${u.ativo ? 'check' : 'times'}-circle"></i> \${u.ativo ? 'Ativo' : 'Inativo'}</span></td><td><button class="btn \${u.ativo ? 'btn-danger' : 'btn-success'} btn-sm" onclick="toggleUsuario('\${u.id}')"><i class="las la-\${u.ativo ? 'ban' : 'check'}"></i> \${u.ativo ? 'Desativar' : 'Ativar'}</button></td></tr>\`; }).join('');
    document.getElementById("userHospital").innerHTML = '<option value="">Selecione o hospital...</option>' + hospitais.filter(h => h.ativo).map(h => \`<option value="\${h.id}">\${h.nome}</option>\`).join('');
    carregarHospitaisFinanceiro();
    filtrarFaturasPorHospital();
}

function formatarCargo(cargo) { const cargos = { "diretor_geral": "Diretor Geral", "medico_especialista": "Médico Especialista", "enfermeiro_assistencial": "Enfermeiro Assistencial", "recepcionista": "Recepcionista", "farmaceutico": "Farmacêutico", "tecnico_enfermagem": "Técnico de Enfermagem" }; return cargos[cargo] || cargo; }

function toggleHospital(id) { if (!confirm("Tem certeza que deseja alterar o status deste hospital?")) return; const hospitais = getHospitais(); const h = hospitais.find(hosp => hosp.id === id); if (h) { h.ativo = !h.ativo; setHospitais(hospitais); listarTudo(); } }
function toggleUsuario(id) { if (!confirm("Tem certeza que deseja alterar o status deste usuário?")) return; const usuarios = getUsuarios(); const u = usuarios.find(usr => usr.id === id); if (u) { u.ativo = !u.ativo; setUsuarios(usuarios); listarTudo(); } }

// ==================== INICIALIZAÇÃO ====================
const hospitais = getHospitais();
if (hospitais.length === 0) { setHospitais([{ id: "hosp_matriz", nome: "Saskia Saúde (Matriz)", cnpj: "00.000.000/0001-00", endereco: "R. Azevedo Bolão, 1369 - Parquelândia, Fortaleza - CE", telefone: "(85) 9 9822-8864", dataCriacao: new Date().toISOString(), ativo: true }]); }
const usuarios = getUsuarios();
if (usuarios.length === 0) { setUsuarios([{ id: "user_master", hospitalId: "hosp_matriz", nome: "Administrador Master", email: "admin@saskiasaude.com.br", senha: "admin123", cargo: "diretor_geral", ativo: true, dataCadastro: new Date().toISOString() }]); }

listarTudo();
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
<div class="admin-container" id="adminContent">

<div class="banner-admin">
<div>
<h1><i class="las la-hospital"></i> Gerenciar Hospitais</h1>
<p>Cadastre e gerencie os hospitais, usuários e licenças do sistema Saskia</p>
</div>
<div>
<button class="btn btn-warning" onclick="logout()"><i class="las la-sign-out-alt"></i> Sair</button>
</div>
</div>

<!-- ALERTA DE SEGURANÇA -->
<div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 14px; padding: 18px 20px; margin-bottom: 25px; display: flex; align-items: center; gap: 12px;">
<i class="las la-shield-alt" style="font-size: 32px; color: #f59e0b;"></i>
<div>
<strong style="color: #d97706;">Área Restrita - Acesso Controlado</strong>
<p style="color: #92400e; font-size: 13px; margin: 3px 0 0 0;">Todas as ações nesta página são registradas. Apenas administradores autorizados podem gerenciar hospitais, usuários e finanças.</p>
</div>
</div>

<!-- CADASTRAR HOSPITAL -->
<div class="form-panel">
<h3><i class="las la-plus-circle"></i> Cadastrar Novo Hospital</h3>
<div class="form-grid">
<div class="form-grupo"><label>Nome do Hospital *</label><input type="text" id="hospNome" placeholder="Ex: Hospital São Lucas"></div>
<div class="form-grupo"><label>CNPJ</label><input type="text" id="hospCNPJ" placeholder="00.000.000/0001-00"></div>
<div class="form-grupo"><label>Endereço</label><input type="text" id="hospEndereco" placeholder="Rua, número, bairro, cidade - UF"></div>
<div class="form-grupo"><label>Telefone</label><input type="text" id="hospTelefone" placeholder="(00) 0000-0000"></div>
</div>
<button class="btn btn-success" onclick="cadastrarHospital()" style="margin-top:15px;width:100%;justify-content:center;padding:14px;"><i class="las la-save"></i> Cadastrar Hospital</button>
</div>

<!-- CADASTRAR USUÁRIO -->
<div class="form-panel">
<h3><i class="las la-users"></i> Cadastrar Usuário no Hospital</h3>
<div class="form-grid">
<div class="form-grupo"><label>Hospital *</label><select id="userHospital"><option value="">Selecione...</option></select></div>
<div class="form-grupo"><label>Nome Completo *</label><input type="text" id="userNome" placeholder="Nome do profissional"></div>
<div class="form-grupo"><label>E-mail *</label><input type="email" id="userEmail" placeholder="email@hospital.com"></div>
<div class="form-grupo"><label>Senha</label><input type="password" id="userSenha" placeholder="Senha de acesso" value="123456"></div>
<div class="form-grupo"><label>Cargo</label><select id="userCargo">
<option value="diretor_geral">Diretor Geral (CEO)</option>
<option value="medico_especialista">Médico Especialista</option>
<option value="enfermeiro_assistencial">Enfermeiro Assistencial</option>
<option value="recepcionista">Recepcionista</option>
<option value="farmaceutico">Farmacêutico</option>
<option value="tecnico_enfermagem">Técnico de Enfermagem</option>
</select></div>
</div>
<button class="btn btn-primary" onclick="cadastrarUsuario()" style="margin-top:15px;width:100%;justify-content:center;padding:14px;"><i class="las la-user-plus"></i> Cadastrar Usuário</button>
</div>

<!-- SEÇÃO FINANCEIRA -->
<div class="form-panel">
<h3><i class="las la-coins"></i> Gestão Financeira de Licenças</h3>
<div class="form-grid">
<div class="form-grupo"><label>Hospital *</label><select id="fatHospital"><option value="">Selecione...</option></select></div>
<div class="form-grupo"><label>Plano *</label><select id="fatPlano" onchange="atualizarValorPlano()">
<option value="">Selecione o plano...</option>
<optgroup label="🏛️ Prefeituras e Órgãos Públicos">
<option value="pref_grandes_capitais">Grandes Capitais - R\$ 5.000/mês</option>
<option value="pref_metropolitanas">Cidades Metropolitanas - R\$ 3.500/mês</option>
<option value="pref_medio_porte">Cidades de Médio Porte - R\$ 2.500/mês</option>
<option value="pref_pequenas">Cidades Pequenas - R\$ 1.200/mês</option>
</optgroup>
<optgroup label="🏥 Clínicas e Consultórios">
<option value="consultorio_individual">Consultório Individual - R\$ 149/mês</option>
<option value="clinica_pequena">Clínica Pequena (até 5 prof.) - R\$ 399/mês</option>
<option value="clinica_media">Clínica Média (6-20 prof.) - R\$ 799/mês</option>
<option value="policlinica">Policlínica (+20 prof.) - R\$ 1.499/mês</option>
</optgroup>
<optgroup label="🏨 Hospitais e Unidades Hospitalares">
<option value="hospital_pequeno">Hospital Pequeno Porte (até 50 leitos) - R\$ 2.499/mês</option>
<option value="hospital_medio">Hospital Médio Porte (51-150 leitos) - R\$ 3.999/mês</option>
<option value="hospital_grande">Hospital Grande Porte (+150 leitos) - R\$ 5.999/mês</option>
<option value="rede_hospitalar">Rede Hospitalar - Sob consulta</option>
</optgroup>
<optgroup label="🎁 Instituições Filantrópicas">
<option value="filantropico">🎁 Filantrópico / Santa Casa - R\$ 0,00 (Cortesia)</option>
</optgroup>
</select></div>
<div class="form-grupo"><label>Valor (R\$)</label><input type="number" id="fatValor" step="0.01" min="0" value="0"></div>
<div class="form-grupo"><label>Data Vencimento *</label><input type="date" id="fatVencimento"></div>
<div class="form-grupo"><label>Mês Referência *</label><input type="month" id="fatReferencia"></div>
<div class="form-grupo"><label>Categoria</label><select id="fatCategoria"><option>Hospital</option><option>Clínica</option><option>Posto de Saúde</option><option>Laboratório</option><option>Prefeitura</option><option>Consultório</option></select></div>
<div class="form-grupo"><label>Tipo Instituição</label><select id="fatTipoInst" onchange="verificarCortesia()"><option value="Privado">Privado</option><option value="Público">Público</option><option value="Filantrópico">🎁 Filantrópico (Cortesia)</option></select></div>
<div class="form-grupo full"><label>Observações</label><textarea id="fatObs" rows="2"></textarea></div>
</div>
<button class="btn btn-success" onclick="emitirFatura()" style="margin-top:15px;width:100%;justify-content:center;padding:14px;"><i class="las la-save"></i> Emitir Fatura</button>
</div>

<!-- FATURAS EMITIDAS -->
<h3 class="section-title"><i class="las la-file-invoice"></i> Faturas Emitidas</h3>
<div class="search-box"><select id="filtroHospitalFaturas" onchange="filtrarFaturasPorHospital()"><option value="todos">Todos os hospitais</option></select></div>
<div style="background:white; border-radius:20px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.06);">
<table class="tabela">
<thead><tr><th>Fatura</th><th>Hospital</th><th>Plano</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
<tbody id="tabelaFaturas"></tbody>
</table>
</div>

<!-- HOSPITAIS CADASTRADOS -->
<h3 class="section-title" style="margin-top:30px;"><i class="las la-hospital"></i> Hospitais Cadastrados</h3>
<div style="background:white; border-radius:20px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.06);">
<table class="tabela">
<thead><tr><th>Nome</th><th>CNPJ</th><th>Endereço</th><th>Telefone</th><th>Status</th><th>Usuários</th><th>Ações</th></tr></thead>
<tbody id="tabelaHospitais"></tbody>
</table>
</div>

<!-- USUÁRIOS CADASTRADOS -->
<h3 class="section-title" style="margin-top:30px;"><i class="las la-users"></i> Usuários Cadastrados</h3>
<div style="background:white; border-radius:20px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.06);">
<table class="tabela">
<thead><tr><th>Nome</th><th>E-mail</th><th>Cargo</th><th>Hospital</th><th>Status</th><th>Ações</th></tr></thead>
<tbody id="tabelaUsuarios"></tbody>
</table>
</div>

</div>
</div>
<div class="modal-verificacao show" id="modalVerificacao">
<div class="modal-verificacao-content">
<div class="lock-icon" style="color:#f59e0b;"><i class="las la-lock"></i></div>
<h3>Verificação de Segurança</h3>
<p>Para acessar o gerenciamento, confirme sua identidade com a senha de administrador.</p>
<input type="password" id="senhaVerificacao" placeholder="Digite a senha master" onkeypress="if(event.key==='Enter')verificarSenha()">
<div class="erro-msg" id="erroVerificacao"><i class="las la-exclamation-triangle"></i> Senha incorreta!</div>
<button class="btn btn-primary" onclick="verificarSenha()" style="width:100%;justify-content:center;margin-bottom:10px;"><i class="las la-check-circle"></i> Verificar e Acessar</button>
<button class="btn-logout" onclick="logout()"><i class="las la-arrow-left"></i> Voltar para o Login</button>
</div>
</div>
<div class="modal-verificacao" id="modalPagamento" style="display:none;">
<div class="modal-verificacao-content">
<div class="lock-icon" style="color:#16a34a;"><i class="las la-credit-card"></i></div>
<h3>Registrar Pagamento</h3>
<input type="hidden" id="pgFaturaId">
<p><strong>Fatura:</strong> <span id="pgFaturaNum"></span></p>
<p><strong>Hospital:</strong> <span id="pgHospital"></span></p>
<p><strong>Valor:</strong> <span id="pgValor"></span></p>
<div class="form-grupo"><label>Data Pagamento</label><input type="date" id="pgData"></div>
<div class="form-grupo"><label>Forma Pagamento</label><select id="pgForma"><option>PIX</option><option>Boleto</option><option>Transferência</option><option>Cartão</option><option>Dinheiro</option></select></div>
<div class="form-grupo"><label>Comprovante</label><input type="text" id="pgComprovante" placeholder="Nº ou link"></div>
<button class="btn btn-success" onclick="confirmarPagamento()" style="width:100%;margin-top:10px;"><i class="las la-check-circle"></i> Confirmar Pagamento</button>
<button class="btn btn-danger" onclick="document.getElementById('modalPagamento').style.display='none'" style="width:100%;margin-top:5px;">Cancelar</button>
</div>
</div>` }} 
        />
    );
}
