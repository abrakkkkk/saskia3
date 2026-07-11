'use client';
import { useEffect, useRef } from 'react';
import './admin-config-dashboard.css';

export default function AdminConfigDashboardPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Execute original JS logic
        const scriptEl = document.createElement('script');
        scriptEl.innerHTML = `
// ==================== MULTI-TENANCY ====================
function getUsuarioLogado(){try{const u=localStorage.getItem("usuarioLogado");return u?JSON.parse(u):null;}catch(e){return null;}}
function sair(){localStorage.removeItem("usuarioLogado");localStorage.removeItem("saskiaSessao");window.location.href="/";}
function voltarDashboard(){window.location.href="dashboard.html";}


// ==================== VERIFICAÇÃO DE SENHA ====================
const SENHA_SUPORTE = "saskia2024";

function verificarSenha() {
    const senhaDigitada = document.getElementById("senhaVerificacao").value;
    const erroMsg = document.getElementById("erroVerificacao");
    
    if (senhaDigitada === SENHA_SUPORTE) {
        document.getElementById("modalVerificacao").classList.remove("show");
        document.getElementById("mainContent").classList.remove("tela-bloqueada");
        init();
    } else {
        erroMsg.style.display = "block";
        document.getElementById("senhaVerificacao").value = "";
        document.getElementById("senhaVerificacao").focus();
    }
}

// Bloquear tela até verificação
document.getElementById("mainContent").classList.add("tela-bloqueada");
document.getElementById("modalVerificacao").classList.add("show");
setTimeout(() => document.getElementById("senhaVerificacao").focus(), 500);

// ==================== CONFIGURAÇÕES ====================
const modulosConfig = [
    { id: "card_pacientes", nome: "Card - Pacientes", desc: "Link rápido para Pacientes", icone: "las la-user-injured", secao: "Cards de Navegação", categoria: "cards_nav" },
    { id: "card_agenda", nome: "Card - Agenda", desc: "Link rápido para Agenda", icone: "las la-calendar", secao: "Cards de Navegação", categoria: "cards_nav" },
    { id: "card_receituario", nome: "Card - Receituário", desc: "Link rápido para Receituário", icone: "las la-file-prescription", secao: "Cards de Navegação", categoria: "cards_nav" },
    { id: "card_recepcao", nome: "Card - Recepção", desc: "Link rápido para Recepção", icone: "las la-user-nurse", secao: "Cards de Navegação", categoria: "cards_nav" },
    { id: "contador_atendidos", nome: "Contador - Pacientes Atendidos", desc: "Mostra total de atendidos", icone: "las la-users", secao: "Contadores", categoria: "contadores" },
    { id: "contador_aguardando", nome: "Contador - Aguardando", desc: "Mostra pacientes aguardando", icone: "las la-hourglass-half", secao: "Contadores", categoria: "contadores" },
    { id: "contador_leitos_vermelha", nome: "Contador - Sala Vermelha", desc: "Leitos da sala vermelha", icone: "las la-door-open", secao: "Contadores", categoria: "contadores" },
    { id: "contador_leitos_amarela", nome: "Contador - Sala Amarela", desc: "Leitos da sala amarela", icone: "las la-door-closed", secao: "Contadores", categoria: "contadores" },
    { id: "contador_salas_cc", nome: "Contador - Salas Cirúrgicas", desc: "Salas do centro cirúrgico", icone: "las la-scalpel", secao: "Contadores", categoria: "contadores" },
    { id: "contador_leitos_uti", nome: "Contador - Leitos UTI", desc: "Leitos de UTI ocupados", icone: "las la-procedures", secao: "Contadores", categoria: "contadores" },
    { id: "contador_altas", nome: "Contador - Altas", desc: "Total de altas", icone: "las la-check-circle", secao: "Contadores", categoria: "contadores" },
    { id: "contador_evasao", nome: "Contador - Evasão", desc: "Total de evasões", icone: "las la-exclamation-triangle", secao: "Contadores", categoria: "contadores" },
    { id: "contador_transferencias", nome: "Contador - Transferências", desc: "Total de transferências", icone: "las la-truck", secao: "Contadores", categoria: "contadores" },
    { id: "contador_media_idade", nome: "Contador - Média Etária", desc: "Média de idade dos pacientes", icone: "las la-chart-bar", secao: "Contadores", categoria: "contadores" },
    { id: "contador_total", nome: "Contador - Total Geral", desc: "Total de pacientes cadastrados", icone: "las la-file-alt", secao: "Contadores", categoria: "contadores" },
    { id: "contador_obitos", nome: "Contador - Óbitos", desc: "Total de óbitos registrados", icone: "las la-cross", secao: "Contadores", categoria: "contadores" },
    { id: "cat_biblioteca", nome: "Categoria - Biblioteca", desc: "Acesso à biblioteca", icone: "las la-book", secao: "Categorias", categoria: "categorias" },
    { id: "cat_fichas", nome: "Categoria - Fichas Auxiliares", desc: "Formulários e anexos", icone: "las la-clipboard-list", secao: "Categorias", categoria: "categorias" },
    { id: "cat_utilitarios", nome: "Categoria - Utilitários", desc: "Ferramentas diversas", icone: "las la-tools", secao: "Categorias", categoria: "categorias" },
    { id: "cat_institucional", nome: "Categoria - Institucional", desc: "Sobre a instituição", icone: "las la-building", secao: "Categorias", categoria: "categorias" },
    { id: "cat_sobre", nome: "Categoria - Sobre Nós", desc: "Nossa história", icone: "las la-heart", secao: "Categorias", categoria: "categorias" },
    { id: "cat_feedback", nome: "Categoria - Feedback", desc: "Envie sua opinião", icone: "las la-comment-dots", secao: "Categorias", categoria: "categorias" },
    { id: "cat_privacidade", nome: "Categoria - Privacidade", desc: "Proteção de dados", icone: "las la-shield-alt", secao: "Categorias", categoria: "categorias" },
    { id: "cat_usuarios", nome: "Categoria - Usuários", desc: "Gerenciar colaboradores", icone: "las la-users", secao: "Categorias", categoria: "categorias" },
    { id: "cat_farmacia", nome: "Categoria - Farmácia", desc: "Controle de medicamentos", icone: "las la-prescription", secao: "Categorias", categoria: "categorias" },
    { id: "cat_obitos", nome: "Categoria - Óbitos", desc: "Registro e controle", icone: "las la-cross", secao: "Categorias", categoria: "categorias" },
    { id: "cat_ponto", nome: "Categoria - Ponto", desc: "Entrada e saída", icone: "las la-clock", secao: "Categorias", categoria: "categorias" },
    { id: "cat_almoxarifado", nome: "Categoria - Almoxarifado", desc: "Controle de estoque", icone: "las la-boxes", secao: "Categorias", categoria: "categorias" },
    { id: "cat_centro_cirurgico", nome: "Categoria - Centro Cirúrgico", desc: "Agendamento e salas", icone: "las la-scalpel", secao: "Categorias", categoria: "categorias" },
    { id: "cat_uti", nome: "Categoria - UTI", desc: "Gestão de leitos", icone: "las la-procedures", secao: "Categorias", categoria: "categorias" },
    { id: "cat_exames", nome: "Categoria - Exames", desc: "Laboratório e Imagem", icone: "las la-flask", secao: "Categorias", categoria: "categorias" },
    { id: "cat_ccih", nome: "Categoria - CCIH", desc: "Controle de Infecção", icone: "las la-shield-virus", secao: "Categorias", categoria: "categorias" },
    { id: "cat_banco_sangue", nome: "Categoria - Banco de Sangue", desc: "Hemoterapia", icone: "las la-tint", secao: "Categorias", categoria: "categorias" },
    { id: "cat_cssd", nome: "Categoria - CSSD", desc: "Esterilização", icone: "las la-pump-soap", secao: "Categorias", categoria: "categorias" },
    { id: "cat_servico_social", nome: "Categoria - Serviço Social", desc: "Atendimento social", icone: "las la-hands-helping", secao: "Categorias", categoria: "categorias" },
    { id: "cat_manutencao", nome: "Categoria - Manutenção", desc: "Predial e equipamentos", icone: "las la-tools", secao: "Categorias", categoria: "categorias" },
    { id: "cat_transporte", nome: "Categoria - Transporte", desc: "Remoção de pacientes", icone: "las la-ambulance", secao: "Categorias", categoria: "categorias" },
    { id: "cat_ouvidoria", nome: "Categoria - Ouvidoria", desc: "Manifestações", icone: "las la-headset", secao: "Categorias", categoria: "categorias" },
    { id: "cat_chat", nome: "Categoria - Chat Interno", desc: "Comunicação profissional", icone: "las la-comments", secao: "Categorias", categoria: "categorias" },
    { id: "cat_relatorios", nome: "Categoria - Relatórios", desc: "Indicadores gerenciais", icone: "las la-chart-bar", secao: "Categorias", categoria: "categorias" },
    { id: "grafico_status", nome: "Gráfico - Distribuição por Status", desc: "Gráfico de barras de status", icone: "las la-chart-pie", secao: "Gráficos", categoria: "graficos" },
    { id: "grafico_resumo_mes", nome: "Gráfico - Resumo do Mês", desc: "Total de pacientes no mês", icone: "las la-chart-line", secao: "Gráficos", categoria: "graficos" },
    { id: "btn_panico", nome: "Botão do Pânico", desc: "Acionar emergência", icone: "las la-exclamation-triangle", secao: "Emergência", categoria: "emergencia" },
    { id: "btn_pcr", nome: "Botão PCR", desc: "Alerta de parada cardiorrespiratória", icone: "las la-heartbeat", secao: "Emergência", categoria: "emergencia" }
];

function getConfig(){return JSON.parse(localStorage.getItem("saskiaConfigDashboard")||"{}");}
function setConfig(c){localStorage.setItem("saskiaConfigDashboard",JSON.stringify(c));}

function init(){
    const config = getConfig();
    const grid = document.getElementById("configGrid");
    const secoes = {};
    modulosConfig.forEach(m => {if(!secoes[m.secao])secoes[m.secao]=[];secoes[m.secao].push(m);});
    let html = '';
    for(let[secao,modulos]of Object.entries(secoes)){
        const ativosNaSecao = modulos.filter(m=>config[m.id]!==false).length;
        html+=\`<div class="config-section"><h3><i class="las la-folder"></i>\${secao}<span style="font-size:11px;color:#94a3b8;margin-left:8px;">(\${ativosNaSecao}/\${modulos.length} ativos)</span></h3><div class="toggle-list">\`;
        modulos.forEach(m=>{const ativo=config[m.id]!==false;html+=\`<label class="toggle-item"><div class="toggle-info"><i class="\${m.icone}"></i><div><span class="toggle-name">\${m.nome}</span><span class="toggle-desc">\${m.desc}</span></div></div><label class="switch"><input type="checkbox" id="\${m.id}" \${ativo?'checked':''} onchange="atualizarContador()"><span class="slider"></span></label></label>\`;});
        html+=\`</div></div>\`;
    }
    grid.innerHTML = html;
    atualizarContador();
}

function atualizarContador(){const total=modulosConfig.length;let ativos=0;modulosConfig.forEach(m=>{const el=document.getElementById(m.id);if(el&&el.checked)ativos++;if(!el)ativos++;});document.getElementById("contadorModulos").innerHTML=\`\${ativos} de \${total} módulos ativos\`;}

function salvarConfiguracao(){const config={};modulosConfig.forEach(m=>{const el=document.getElementById(m.id);config[m.id]=el?el.checked:true;});setConfig(config);alert("✅ Configuração salva com sucesso! O dashboard será atualizado na próxima carga.");}

function resetarConfiguracao(){if(confirm("⚠️ Tem certeza que deseja restaurar TODOS os módulos para o padrão (ativados)?")){localStorage.removeItem("saskiaConfigDashboard");init();alert("✅ Configuração restaurada para o padrão!");}}

function aplicarPerfil(perfil){
    const perfis={hospital:{desativar:[]},clinica:{desativar:["contador_leitos_vermelha","contador_leitos_amarela","contador_salas_cc","contador_leitos_uti","cat_centro_cirurgico","cat_uti","cat_ccih","cat_banco_sangue","cat_cssd","btn_panico","btn_pcr"]},consultorio:{desativar:["card_recepcao","contador_leitos_vermelha","contador_leitos_amarela","contador_salas_cc","contador_leitos_uti","contador_altas","contador_evasao","contador_transferencias","contador_obitos","cat_biblioteca","cat_fichas","cat_utilitarios","cat_institucional","cat_farmacia","cat_obitos","cat_ponto","cat_almoxarifado","cat_centro_cirurgico","cat_uti","cat_exames","cat_ccih","cat_banco_sangue","cat_cssd","cat_servico_social","cat_manutencao","cat_transporte","cat_ouvidoria","cat_relatorios","btn_panico","btn_pcr","grafico_status"]},upa:{desativar:["cat_biblioteca","cat_fichas","cat_ponto","cat_almoxarifado","cat_cssd","cat_servico_social","cat_manutencao","cat_transporte","cat_ouvidoria","cat_chat"]},todos:{desativar:[]},nenhum:{desativar:modulosConfig.map(m=>m.id)}};
    const p=perfis[perfil];if(!p)return;
    document.querySelectorAll('.perfil-btn').forEach(b=>b.classList.remove('ativo'));event.target.classList.add('ativo');
    if(perfil==='todos'){modulosConfig.forEach(m=>{const el=document.getElementById(m.id);if(el)el.checked=true;});}
    else if(perfil==='nenhum'){modulosConfig.forEach(m=>{const el=document.getElementById(m.id);if(el)el.checked=false;});}
    else{modulosConfig.forEach(m=>{const el=document.getElementById(m.id);if(el)el.checked=!p.desativar.includes(m.id);});}
    atualizarContador();
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
<div class="conf-container" id="mainContent">

<div class="banner-conf">
<div>
<h1><i class="las la-sliders-h"></i> Configurador do Dashboard</h1>
<p>Personalize quais módulos e cards ficarão visíveis para cada instituição</p>
</div>
<div style="display:flex;gap:10px;flex-wrap:wrap;">
<button class="btn btn-success" onclick="salvarConfiguracao()"><i class="las la-save"></i> Salvar Configuração</button>
<button class="btn btn-warning" onclick="resetarConfiguracao()"><i class="las la-undo"></i> Restaurar Padrão</button>
</div>
</div>

<!-- ALERTA DE ÁREA RESTRITA -->
<div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 14px; padding: 18px 20px; margin-bottom: 25px; display: flex; align-items: center; gap: 12px;">
<i class="las la-shield-alt" style="font-size: 32px; color: #f59e0b;"></i>
<div>
<strong style="color: #d97706;">⚠️ Área de Configuração Avançada</strong>
<p style="color: #92400e; font-size: 13px; margin: 3px 0 0 0;">Alterações aqui afetam diretamente a experiência do usuário final. Apenas a equipe de suporte autorizada deve modificar estas configurações.</p>
</div>
</div>

<!-- PERFIS RÁPIDOS -->
<div class="acoes-bar">
<div>
<strong style="color:#0a1f44;">Perfis Rápidos:</strong>
<div class="perfis-rapidos" style="margin-top:10px;margin-bottom:0;">
<button class="perfil-btn" onclick="aplicarPerfil('hospital')"><i class="las la-hospital"></i> Hospital Completo</button>
<button class="perfil-btn" onclick="aplicarPerfil('clinica')"><i class="las la-clinic-medical"></i> Clínica</button>
<button class="perfil-btn" onclick="aplicarPerfil('consultorio')"><i class="las la-user-md"></i> Consultório</button>
<button class="perfil-btn" onclick="aplicarPerfil('upa')"><i class="las la-ambulance"></i> UPA / Emergência</button>
<button class="perfil-btn" onclick="aplicarPerfil('todos')"><i class="las la-check-double"></i> Ativar Tudo</button>
<button class="perfil-btn" onclick="aplicarPerfil('nenhum')"><i class="las la-times-circle"></i> Desativar Tudo</button>
</div>
</div>
<span class="info-text"><i class="las la-info-circle"></i> <span id="contadorModulos">0 de 0 módulos ativos</span></span>
</div>

<!-- CONFIGURAÇÕES -->
<div class="config-grid" id="configGrid"></div>

</div>
</div>
<div class="modal-verificacao show" id="modalVerificacao">
<div class="modal-verificacao-content">
<div class="lock-icon"><i class="las la-lock"></i></div>
<h3>Verificação de Segurança</h3>
<p>Esta é uma área restrita da equipe de suporte. Digite a senha master para continuar.</p>
<input type="password" id="senhaVerificacao" placeholder="Digite a senha de suporte" onkeypress="if(event.key==='Enter')verificarSenha()">
<div class="erro-msg" id="erroVerificacao"><i class="las la-exclamation-triangle"></i> Senha incorreta! Tente novamente.</div>
<button class="btn btn-primary" onclick="verificarSenha()" style="width:100%;justify-content:center;margin-bottom:10px;"><i class="las la-check-circle"></i> Verificar e Acessar</button>
<button class="btn-logout" onclick="voltarDashboard()"><i class="las la-arrow-left"></i> Voltar para o Dashboard</button>
</div>
</div>` }} 
        />
    );
}
