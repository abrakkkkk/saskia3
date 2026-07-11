'use client';
import { useEffect, useRef } from 'react';
import './admin-prontuarios.css';

export default function AdminProntuariosPage() {
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



let modelos = getDB("modelosProntuarios");
let camposTemp = [];

function toggleSubmenu(id){const submenu=document.getElementById(id);const menuItem=event.currentTarget;if(submenu.style.display==="block"){submenu.style.display="none";menuItem.classList.remove("ativo");}else{submenu.style.display="block";menuItem.classList.add("ativo");}}

function listarModelos(){const lista=document.getElementById("listaModelos");modelos=getDB("modelosProntuarios");if(modelos.length===0){lista.innerHTML="<p>Nenhum modelo cadastrado.</p>";return;}let html="";for(let i=0;i<modelos.length;i++){const m=modelos[i];let ch="";for(let j=0;j<m.campos.length;j++){ch+=\`<li><strong>\${m.campos[j].nome}</strong> (\${m.campos[j].tipo})</li>\`;}html+=\`<div class="modelo-item"><div class="modelo-header"><h4><i class="las la-file-alt"></i> \${m.titulo}</h4><div><button class="btn-editar" onclick="editarModelo(\${i})"><i class="las la-edit"></i></button><button class="btn-excluir" onclick="excluirModelo(\${i})"><i class="las la-trash"></i></button></div></div><div class="modelo-descricao">\${m.descricao||"Sem descrição"}</div><div class="modelo-campos"><strong>Campos:</strong><ul style="margin:5px 0 0 20px;">\${ch}</ul></div></div>\`;}lista.innerHTML=html;}

function abrirModalModelo(){document.getElementById("modalTituloModelo").innerText="Novo Modelo";document.getElementById("modeloIndex").value="";document.getElementById("modeloTitulo").value="";document.getElementById("modeloDescricao").value="";camposTemp=[];renderizarCampos();document.getElementById("modalModelo").style.display="flex";}

function editarModelo(index){const m=modelos[index];document.getElementById("modalTituloModelo").innerText="Editar Modelo";document.getElementById("modeloIndex").value=index;document.getElementById("modeloTitulo").value=m.titulo;document.getElementById("modeloDescricao").value=m.descricao||"";camposTemp=[...m.campos];renderizarCampos();document.getElementById("modalModelo").style.display="flex";}

function renderizarCampos(){const container=document.getElementById("listaCampos");if(camposTemp.length===0){container.innerHTML="<p style='color:#666;'>Nenhum campo adicionado.</p>";return;}let html="";for(let i=0;i<camposTemp.length;i++){const campo=camposTemp[i];html+=\`<div class="campo-item"><input type="text" placeholder="Nome do campo" value="\${campo.nome}" onchange="atualizarCampo(\${i},'nome',this.value)"><select onchange="atualizarCampo(\${i},'tipo',this.value)"><option value="texto" \${campo.tipo==="texto"?"selected":""}>Texto</option><option value="numero" \${campo.tipo==="numero"?"selected":""}>Número</option><option value="data" \${campo.tipo==="data"?"selected":""}>Data</option><option value="textarea" \${campo.tipo==="textarea"?"selected":""}>Texto Longo</option><option value="select" \${campo.tipo==="select"?"selected":""}>Seleção</option></select><button class="btn-remover-campo" onclick="removerCampo(\${i})"><i class="las la-trash"></i></button></div>\`;}container.innerHTML=html;}

function atualizarCampo(index,prop,valor){camposTemp[index][prop]=valor;}
function adicionarCampo(){camposTemp.push({nome:"Novo campo",tipo:"texto"});renderizarCampos();}
function removerCampo(index){camposTemp.splice(index,1);renderizarCampos();}

function salvarModelo(){const titulo=document.getElementById("modeloTitulo").value;const descricao=document.getElementById("modeloDescricao").value;const index=document.getElementById("modeloIndex").value;if(!titulo){alert("Informe o título!");return;}if(camposTemp.length===0){alert("Adicione pelo menos um campo!");return;}const modelo={titulo,descricao,campos:camposTemp};if(index===""){modelos.push(modelo);}else{modelos[parseInt(index)]=modelo;}setDB("modelosProntuarios",modelos);fecharModalModelo();listarModelos();alert("Modelo salvo!");}

function excluirModelo(index){if(confirm("Excluir este modelo?")){modelos.splice(index,1);setDB("modelosProntuarios",modelos);listarModelos();alert("Modelo excluído!");}}

function fecharModalModelo(){document.getElementById("modalModelo").style.display="none";}
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
<h2><i class="las la-file-alt"></i> Modelos de Prontuários</h2>
<p>Crie modelos personalizados para padronizar os registros clínicos.</p>
<button onclick="abrirModalModelo()" style="margin-bottom:20px;padding:12px 24px;background:#1e3a8a;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;"><i class="las la-plus"></i> Novo Modelo</button>
<div id="listaModelos"></div>
</div>
<div id="modalModelo" class="modal">
<div class="modal-content">
<h3 id="modalTituloModelo">Novo Modelo de Prontuário</h3>
<input type="hidden" id="modeloIndex">
<input type="text" id="modeloTitulo" placeholder="Título do modelo" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;">
<textarea id="modeloDescricao" placeholder="Descrição do modelo" rows="2" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;"></textarea>
<h4>Campos do Prontuário</h4>
<div id="listaCampos"></div>
<button class="btn-adicionar-campo" onclick="adicionarCampo()"><i class="las la-plus"></i> Adicionar Campo</button>
<button onclick="salvarModelo()" style="margin-top:15px;padding:10px 20px;background:#16a34a;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Salvar Modelo</button>
<button onclick="fecharModalModelo()" style="margin-top:10px;margin-left:5px;padding:10px 20px;background:#666;color:white;border:none;border-radius:6px;cursor:pointer;">Cancelar</button>
</div>
</div>
<h3 id="modalTituloModelo">Novo Modelo de Prontuário</h3>` }} 
        />
    );
}
