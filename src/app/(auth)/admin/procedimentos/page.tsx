'use client';
import { useEffect, useRef } from 'react';
import './admin-procedimentos.css';

export default function AdminProcedimentosPage() {
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



let procedimentos = getDB("procedimentos");

function toggleSubmenu(id){const submenu=document.getElementById(id);const menuItem=event.currentTarget;if(submenu.style.display==="block"){submenu.style.display="none";menuItem.classList.remove("ativo");}else{submenu.style.display="block";menuItem.classList.add("ativo");}}

function listarProcedimentos(){const lista=document.getElementById("listaProcedimentos");procedimentos=getDB("procedimentos");if(procedimentos.length===0){lista.innerHTML="<p>Nenhum procedimento cadastrado.</p>";return;}let html="";for(let i=0;i<procedimentos.length;i++){const p=procedimentos[i];html+=\`<div class="procedimento-item"><div class="procedimento-info"><h4>\${p.nome}</h4><p>\${p.descricao}</p><small>Área: \${p.area} | Valor: \${p.valor||"Não informado"}</small></div><div><button class="btn-editar" onclick="editarProcedimento(\${i})"><i class="las la-edit"></i></button><button class="btn-excluir" onclick="excluirProcedimento(\${i})"><i class="las la-trash"></i></button></div></div>\`;}lista.innerHTML=html;}

function abrirModalProcedimento(){document.getElementById("modalTitulo").innerText="Novo Procedimento";document.getElementById("procedimentoIndex").value="";document.getElementById("procedimentoNome").value="";document.getElementById("procedimentoDescricao").value="";document.getElementById("procedimentoValor").value="";document.getElementById("procedimentoArea").value="Enfermagem";document.getElementById("modalProcedimento").style.display="flex";}

function editarProcedimento(index){const p=procedimentos[index];document.getElementById("modalTitulo").innerText="Editar Procedimento";document.getElementById("procedimentoIndex").value=index;document.getElementById("procedimentoNome").value=p.nome;document.getElementById("procedimentoDescricao").value=p.descricao;document.getElementById("procedimentoValor").value=p.valor||"";document.getElementById("procedimentoArea").value=p.area;document.getElementById("modalProcedimento").style.display="flex";}

function salvarProcedimento(){const index=document.getElementById("procedimentoIndex").value;const p={nome:document.getElementById("procedimentoNome").value,descricao:document.getElementById("procedimentoDescricao").value,valor:document.getElementById("procedimentoValor").value,area:document.getElementById("procedimentoArea").value};if(!p.nome){alert("Informe o nome!");return;}if(index===""){procedimentos.push(p);}else{procedimentos[parseInt(index)]=p;}setDB("procedimentos",procedimentos);fecharModalProcedimento();listarProcedimentos();alert("Procedimento salvo!");}

function excluirProcedimento(index){if(confirm("Excluir este procedimento?")){procedimentos.splice(index,1);setDB("procedimentos",procedimentos);listarProcedimentos();alert("Procedimento excluído!");}}

function fecharModalProcedimento(){document.getElementById("modalProcedimento").style.display="none";}
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
<h2><i class="las la-syringe"></i> Procedimentos</h2>
<button onclick="abrirModalProcedimento()" style="margin-bottom:20px;padding:12px 24px;background:#1e3a8a;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;"><i class="las la-plus"></i> Novo Procedimento</button>
<div id="listaProcedimentos"></div>
</div>
<div id="modalProcedimento" class="modal">
<div class="modal-content">
<h3 id="modalTitulo">Novo Procedimento</h3>
<input type="hidden" id="procedimentoIndex">
<input type="text" id="procedimentoNome" placeholder="Nome do procedimento" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;">
<textarea id="procedimentoDescricao" placeholder="Descrição do procedimento" rows="3" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;"></textarea>
<input type="text" id="procedimentoValor" placeholder="Valor (opcional)" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;">
<select id="procedimentoArea" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;">
<option value="Enfermagem">Enfermagem</option><option value="Médico">Médico</option><option value="Exames">Exames</option><option value="Administrativo">Administrativo</option>
</select>
<button onclick="salvarProcedimento()" style="margin-top:10px;padding:10px 20px;background:#16a34a;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Salvar</button>
<button onclick="fecharModalProcedimento()" style="margin-top:10px;margin-left:5px;padding:10px 20px;background:#666;color:white;border:none;border-radius:6px;cursor:pointer;">Cancelar</button>
</div>
</div>
<h3 id="modalTitulo">Novo Procedimento</h3>` }} 
        />
    );
}
