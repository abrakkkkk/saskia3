'use client';
import { useEffect, useRef } from 'react';
import './curvas-meninos.css';

export default function CurvasMeninosPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Execute original JS logic
        const scriptEl = document.createElement('script');
        scriptEl.innerHTML = `

// DOCUMENTOS MENINOS COM NOMES SIMPLIFICADOS
const documentosMeninos = [
    { nome: "altura_meninos_0-5_percentil.pdf", titulo: "Altura para Idade - Meninos 0-5 anos (Percentil)" },
    { nome: "altura_meninos_0-5_zscore.pdf", titulo: "Altura para Idade - Meninos 0-5 anos (Z-score)" },
    { nome: "altura_meninos_5-19_percentil.pdf", titulo: "Altura para Idade - Meninos 5-19 anos (Percentil)" },
    { nome: "altura_meninos_5-19_zscore.pdf", titulo: "Altura para Idade - Meninos 5-19 anos (Z-score)" },
    { nome: "imc_meninos_5-19_percentil.pdf", titulo: "IMC para Idade - Meninos 5-19 anos (Percentil)" },
    { nome: "imc_meninos_5-19_zscore.pdf", titulo: "IMC para Idade - Meninos 5-19 anos (Z-score)" },
    { nome: "perimetro_cefalico_meninos_0-5_percentil.pdf", titulo: "Perímetro Cefálico - Meninos 0-5 anos (Percentil)" },
    { nome: "perimetro_cefalico_meninos_0-5_zscore.pdf", titulo: "Perímetro Cefálico - Meninos 0-5 anos (Z-score)" },
    { nome: "peso_meninos_0-5_percentil.pdf", titulo: "Peso para Idade - Meninos 0-5 anos (Percentil)" },
    { nome: "peso_meninos_0-5_zscore.pdf", titulo: "Peso para Idade - Meninos 0-5 anos (Z-score)" },
    { nome: "peso_meninos_5-10_percentil.pdf", titulo: "Peso para Idade - Meninos 5-10 anos (Percentil)" },
    { nome: "peso_meninos_5-10_zscore.pdf", titulo: "Peso para Idade - Meninos 5-10 anos (Z-score)" }
];

function renderizarDocumentos() {
    const container = document.getElementById("documentosGrid");
    let html = "";
    for (let i = 0; i < documentosMeninos.length; i++) {
        const doc = documentosMeninos[i];
        html += \`<div class="doc-card">
                    <div class="doc-preview"><i class="las la-file-pdf"></i></div>
                    <div class="doc-info">
                        <div class="doc-titulo"><strong>\${doc.titulo}</strong></div>
                        <div style="margin-top:12px;">
                            <button class="btn-doc btn-ver" onclick="visualizarPDF('\${doc.nome}')"><i class="las la-eye"></i> Ver</button>
                            <button class="btn-doc btn-baixar" onclick="baixarPDF('\${doc.nome}')"><i class="las la-download"></i> Baixar</button>
                        </div>
                    </div>
                </div>\`;
    }
    container.innerHTML = html;
}

function visualizarPDF(nome) {
    document.getElementById("pdfTitulo").innerHTML = nome;
    document.getElementById("pdfIframe").src = nome;
    document.getElementById("modalPdf").style.display = "flex";
}

function baixarPDF(nome) {
    const link = document.createElement('a');
    link.href = nome;
    link.download = nome;
    link.click();
}

function fecharModalPdf() { 
    document.getElementById("modalPdf").style.display = "none"; 
    document.getElementById("pdfIframe").src = ""; 
}

renderizarDocumentos();
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
<button class="btn-voltar" onclick="window.location.href='curvas-crescimento.html'"><i class="las la-arrow-left"></i> Voltar</button>
<h2><i class="las la-male"></i> Curvas de Crescimento - MENINOS</h2>
<div id="documentosGrid" class="documentos-grid"></div>
</div>
<div id="modalPdf" class="modal-pdf">
    <div class="modal-pdf-conteudo">
        <div class="modal-pdf-header"><span><i class="las la-file-pdf"></i> <span id="pdfTitulo">Visualizar PDF</span></span><button onclick="fecharModalPdf()" style="background:none; border:none; color:white; font-size:24px;">×</button></div>
        <div class="modal-pdf-body"><iframe id="pdfIframe" src=""></iframe></div>
    </div>
</div>` }} 
        />
    );
}
