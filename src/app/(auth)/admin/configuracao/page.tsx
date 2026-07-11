'use client';
import { useEffect, useRef } from 'react';
import './admin-configuracao.css';

export default function AdminConfiguracaoPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Execute original JS logic
        const scriptEl = document.createElement('script');
        scriptEl.innerHTML = `
function getUsuarioLogado(){try{const u=localStorage.getItem("usuarioLogado");return u?JSON.parse(u):null;}catch(e){return null;}}
function sair(){localStorage.removeItem("usuarioLogado");localStorage.removeItem("saskiaSessao");window.location.href="/";}
function getFaturas(){return JSON.parse(localStorage.getItem("saskiaFaturas")||"[]");}


let faturas = getFaturas();

function trocarTabFin(tab){
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('ativo'));
    document.querySelectorAll('.tab-conteudo').forEach(c=>c.classList.remove('ativo'));
    event.target.classList.add('ativo');
    document.getElementById('tab'+tab.charAt(0).toUpperCase()+tab.slice(1)).classList.add('ativo');
    if(tab==='faturas')listarFaturas();
    if(tab==='historico')listarHistorico();
}

function listarFaturas(){
    const termo=(document.getElementById("buscarFatura")?.value||"").toLowerCase();
    const status=document.getElementById("filtroStatusFin")?.value||"todos";
    let lista=faturas.slice().reverse();
    if(status!=="todos")lista=lista.filter(f=>f.status===status);
    if(termo)lista=lista.filter(f=>f.hospitalNome.toLowerCase().includes(termo)||f.plano.toLowerCase().includes(termo));
    const hoje=new Date();hoje.setHours(0,0,0,0);
    lista.forEach(f=>{if(f.status==="Pendente"&&new Date(f.vencimento)<hoje){f.status="Vencido";}});
    document.getElementById("tabelaFaturasBody").innerHTML=lista.length===0?'<tr><td colspan="9" style="text-align:center;padding:30px;">Nenhuma fatura encontrada</td></tr>':lista.map(f=>{
        const venc=new Date(f.vencimento+"T00:00:00");const hoje=new Date();hoje.setHours(0,0,0,0);
        const diasRestantes=Math.ceil((venc-hoje)/(1000*60*60*24));
        let classeLinha="";if(f.status==="Vencido"||(f.status==="Pendente"&&diasRestantes<0))classeLinha="vencido";else if(f.status==="Pendente"&&diasRestantes<=7)classeLinha="vencendo";
        const statusBadge=f.status==="Pago"?"badge-pago":f.status==="Cortesia"?"badge-cortesia":f.status==="Vencido"||diasRestantes<0?"badge-vencido":"badge-pendente";
        return\`<tr class="\${classeLinha}"><td><strong>\${f.id}</strong></td><td>\${f.hospitalNome}</td><td>\${f.plano}</td><td>\${f.categoria}</td><td>R\$ \${f.valor.toFixed(2)}</td><td>\${new Date(f.vencimento+'T00:00:00').toLocaleDateString('pt-BR')} \${f.status==='Pendente'&&diasRestantes>0?\`<br><small style="color:\${diasRestantes<=7?'#dc2626':'#16a34a'};">\${diasRestantes} dia(s)</small>\`:''}</td><td><span class="badge \${statusBadge}">\${f.status}</span></td><td><span class="badge \${f.tipoInst==='Privado'?'badge-info':f.tipoInst==='Público'?'badge-purple':'badge-cortesia'}">\${f.tipoInst}</span></td></tr>\`;
    }).join('');
    atualizarStats();
}

function listarHistorico(){
    const termo=(document.getElementById("buscarHistorico")?.value||"").toLowerCase();
    let lista=faturas.filter(f=>f.pagamento).slice().reverse();
    if(termo)lista=lista.filter(f=>f.hospitalNome.toLowerCase().includes(termo));
    document.getElementById("historicoPagamentos").innerHTML=lista.length===0?'<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="las la-history" style="font-size:48px;"></i><p>Nenhum pagamento registrado</p></div>':lista.map(f=>\`<div class="historico-card pago"><h4><i class="las la-check-circle"></i> \${f.hospitalNome} - \${f.plano}</h4><p><strong>Fatura:</strong> \${f.id} | <strong>Valor:</strong> R\$ \${f.valor.toFixed(2)} | <strong>Vencimento:</strong> \${new Date(f.vencimento+'T00:00:00').toLocaleDateString('pt-BR')}</p><p><strong>Pago em:</strong> \${new Date(f.pagamento.data+'T00:00:00').toLocaleDateString('pt-BR')} | <strong>Forma:</strong> \${f.pagamento.forma} | <strong>Comprovante:</strong> \${f.pagamento.comprovante||'N/I'}</p></div>\`).join('');
}

function atualizarStats(){
    const hoje=new Date();const mesAtual=hoje.getMonth()+1;
    document.getElementById("statTotalFaturas").innerHTML=faturas.length;
    document.getElementById("statPagas").innerHTML=faturas.filter(f=>f.status==="Pago"&&new Date(f.pagamento?.data).getMonth()+1===mesAtual).length;
    document.getElementById("statPendentes").innerHTML=faturas.filter(f=>f.status==="Pendente"||f.status==="Vencido").length;
    document.getElementById("statVencidas").innerHTML=faturas.filter(f=>{if(f.status==="Pago"||f.status==="Cortesia")return false;return new Date(f.vencimento)<new Date(new Date().toDateString());}).length;
    document.getElementById("statReceita").innerHTML="R\$ "+faturas.filter(f=>f.status==="Pago"&&new Date(f.pagamento?.data).getMonth()+1===mesAtual).reduce((s,f)=>s+f.valor,0).toFixed(2);
    document.getElementById("statHospitaisAtivos").innerHTML=[...new Set(faturas.filter(f=>f.status==="Pago"||f.status==="Cortesia").map(f=>f.hospitalId))].length;
}

function filtrarFaturas(){listarFaturas();}
function filtrarHistorico(){listarHistorico();}

const hoje=new Date();hoje.setHours(0,0,0,0);
faturas.forEach(f=>{if(f.status==="Pendente"&&new Date(f.vencimento)<hoje){f.status="Vencido";}});
listarFaturas();
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
<div class="fin-container">

<div class="banner-fin">
<div>
<h1><i class="las la-coins"></i> Painel Financeiro</h1>
<p>Visualização de licenças, pagamentos e status dos hospitais</p>
</div>
<div>
<button class="btn btn-info" onclick="window.print()"><i class="las la-print"></i> Imprimir Relatório</button>
</div>
</div>

<div class="stats-grid" id="statsGrid">
<div class="stat-card azul"><div class="stat-icon"><i class="las la-file-invoice"></i></div><div class="stat-valor" id="statTotalFaturas">0</div><div class="stat-label">Total de Faturas</div></div>
<div class="stat-card verde"><div class="stat-icon"><i class="las la-check-circle"></i></div><div class="stat-valor" id="statPagas">0</div><div class="stat-label">Pagas (Mês)</div></div>
<div class="stat-card amarelo"><div class="stat-icon"><i class="las la-clock"></i></div><div class="stat-valor" id="statPendentes">0</div><div class="stat-label">Pendentes</div></div>
<div class="stat-card vermelho"><div class="stat-icon"><i class="las la-exclamation-triangle"></i></div><div class="stat-valor" id="statVencidas">0</div><div class="stat-label">Vencidas</div></div>
<div class="stat-card verde"><div class="stat-icon"><i class="las la-money-bill"></i></div><div class="stat-valor" id="statReceita">R\$ 0</div><div class="stat-label">Receita (Mês)</div></div>
<div class="stat-card azul"><div class="stat-icon"><i class="las la-building"></i></div><div class="stat-valor" id="statHospitaisAtivos">0</div><div class="stat-label">Hospitais Ativos</div></div>
</div>

<div class="tabs-fin">
<button class="tab-btn ativo" onclick="trocarTabFin('faturas')"><i class="las la-file-invoice"></i> Faturas</button>
<button class="tab-btn" onclick="trocarTabFin('historico')"><i class="las la-history"></i> Histórico de Pagamentos</button>
<button class="tab-btn" onclick="trocarTabFin('planos')"><i class="las la-tags"></i> Planos</button>
</div>

<div class="tab-conteudo ativo" id="tabFaturas">
<div class="search-box">
<input type="text" id="buscarFatura" placeholder="Buscar por hospital, plano ou status..." onkeyup="filtrarFaturas()">
<select id="filtroStatusFin" onchange="filtrarFaturas()">
<option value="todos">Todos os Status</option>
<option value="Pago">✅ Pagos</option>
<option value="Pendente">⏳ Pendentes</option>
<option value="Vencido">❌ Vencidos</option>
<option value="Cortesia">🎁 Cortesia/Filantrópico</option>
</select>
</div>
<div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.06);">
<table class="tabela-fin">
<thead><tr><th>Fatura</th><th>Hospital</th><th>Plano</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Tipo</th></tr></thead>
<tbody id="tabelaFaturasBody"></tbody>
</table>
</div>
</div>

<div class="tab-conteudo" id="tabHistorico">
<div class="search-box"><input type="text" id="buscarHistorico" placeholder="Buscar por hospital..." onkeyup="filtrarHistorico()"></div>
<div id="historicoPagamentos"></div>
</div>

<div class="tab-conteudo" id="tabPlanos">
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
<div style="background:white;border-radius:16px;padding:25px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.06);border:2px solid #e2e8f0;">
<div style="font-size:48px;color:#1e3a8a;"><i class="las la-hospital"></i></div>
<h3 style="color:#0a1f44;">Plano Básico</h3>
<p style="color:#64748b;">Até 10 usuários<br>Módulos essenciais<br>Suporte por e-mail</p>
<div style="font-size:28px;font-weight:800;color:#1e3a8a;">R\$ 299<span style="font-size:14px;color:#94a3b8;">/mês</span></div>
</div>
<div style="background:white;border-radius:16px;padding:25px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.06);border:2px solid #f59e0b;">
<div style="font-size:48px;color:#f59e0b;"><i class="las la-star"></i></div>
<h3 style="color:#0a1f44;">Plano Premium ⭐</h3>
<p style="color:#64748b;">Até 50 usuários<br>Todos os módulos<br>Suporte prioritário</p>
<div style="font-size:28px;font-weight:800;color:#f59e0b;">R\$ 799<span style="font-size:14px;color:#94a3b8;">/mês</span></div>
</div>
<div style="background:white;border-radius:16px;padding:25px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.06);border:2px solid #7c3aed;">
<div style="font-size:48px;color:#7c3aed;"><i class="las la-crown"></i></div>
<h3 style="color:#0a1f44;">Plano Enterprise</h3>
<p style="color:#64748b;">Usuários ilimitados<br>Todos os módulos<br>Suporte 24/7</p>
<div style="font-size:28px;font-weight:800;color:#7c3aed;">R\$ 1.499<span style="font-size:14px;color:#94a3b8;">/mês</span></div>
</div>
</div>
</div>

</div>
</div>` }} 
        />
    );
}
