'use client';

import { useEffect, useState } from 'react';
import './curvas-meninas.css';

const documentosMeninas = [
  { nome: 'altura_meninas_0-5_percentil.pdf', titulo: 'Altura para Idade - Meninas 0-5 anos (Percentil)' },
  { nome: 'altura_meninas_0-5_zscore.pdf', titulo: 'Altura para Idade - Meninas 0-5 anos (Z-score)' },
  { nome: 'altura_meninas_5-19_percentil.pdf', titulo: 'Altura para Idade - Meninas 5-19 anos (Percentil)' },
  { nome: 'altura_meninas_5-19_zscore.pdf', titulo: 'Altura para Idade - Meninas 5-19 anos (Z-score)' },
  { nome: 'imc_meninas_5-19_percentil.pdf', titulo: 'IMC para Idade - Meninas 5-19 anos (Percentil)' },
  { nome: 'imc_meninas_5-19_zscore.pdf', titulo: 'IMC para Idade - Meninas 5-19 anos (Z-score)' },
  { nome: 'imc_meninas_0-5_escore_z.pdf', titulo: 'IMC para Idade - Meninas 0-5 anos (Escore Z)' },
  { nome: 'perimetro_cefalico_meninas_0-5_percentil.pdf', titulo: 'Perímetro Cefálico - Meninas 0-5 anos (Percentil)' },
  { nome: 'perimetro_cefalico_meninas_0-5_zscore.pdf', titulo: 'Perímetro Cefálico - Meninas 0-5 anos (Z-score)' },
  { nome: 'peso_meninas_0-5_percentil.pdf', titulo: 'Peso para Idade - Meninas 0-5 anos (Percentil)' },
  { nome: 'peso_meninas_5-10_percentil.pdf', titulo: 'Peso para Idade - Meninas 5-10 anos (Percentil)' },
  { nome: 'peso_meninas_5-10_zscore.pdf', titulo: 'Peso para Idade - Meninas 5-10 anos (Z-score)' },
];

export default function CurvasMeninasPage() {
  const [documentoSelecionado, setDocumentoSelecionado] = useState<typeof documentosMeninas[number] | null>(null);

  useEffect(() => {
    if (!documentoSelecionado) return;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDocumentoSelecionado(null);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [documentoSelecionado]);

  const caminhoDocumento = (nome: string) => `/docs/${encodeURIComponent(nome)}`;

  return (
    <div className="migrated-page-container curvas-meninas-page">
      <div className="conteudo">
        <a className="btn-voltar" href="/curvas-crescimento">
          <i className="las la-arrow-left" aria-hidden="true" /> Voltar
        </a>
        <h2><i className="las la-female" aria-hidden="true" /> Curvas de Crescimento - MENINAS</h2>
        <div className="documentos-grid">
          {documentosMeninas.map(documento => (
            <article className="doc-card" key={documento.nome}>
              <div className="doc-preview" aria-hidden="true"><i className="las la-file-pdf" /></div>
              <div className="doc-info">
                <div className="doc-titulo"><strong>{documento.titulo}</strong></div>
                <div className="doc-actions">
                  <button className="btn-doc btn-ver" type="button" onClick={() => setDocumentoSelecionado(documento)}>
                    <i className="las la-eye" aria-hidden="true" /> Ver
                  </button>
                  <a className="btn-doc btn-baixar" href={caminhoDocumento(documento.nome)} download={documento.nome}>
                    <i className="las la-download" aria-hidden="true" /> Baixar
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {documentoSelecionado && (
        <div className="modal-pdf" onClick={() => setDocumentoSelecionado(null)}>
          <section
            className="modal-pdf-conteudo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdfTitulo"
            onClick={event => event.stopPropagation()}
          >
            <header className="modal-pdf-header">
              <span id="pdfTitulo"><i className="las la-file-pdf" aria-hidden="true" /> {documentoSelecionado.titulo}</span>
              <button
                type="button"
                onClick={() => setDocumentoSelecionado(null)}
                aria-label="Fechar visualização do documento"
                className="modal-pdf-close"
              >×</button>
            </header>
            <div className="modal-pdf-body">
              <iframe title={documentoSelecionado.titulo} src={caminhoDocumento(documentoSelecionado.nome)} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
