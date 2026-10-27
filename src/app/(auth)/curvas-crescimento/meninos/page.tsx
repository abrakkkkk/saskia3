'use client';

import { useEffect, useState } from 'react';
import './curvas-meninos.css';

interface DocumentoMenino {
  arquivo: string;
  nomeDownload?: string;
  titulo: string;
}

const documentosMeninos: DocumentoMenino[] = [
  { arquivo: 'altura_meninos_0-5_percentil.pdf', titulo: 'Altura para Idade - Meninos 0-5 anos (Percentil)' },
  { arquivo: 'altura_meninos_0-5_zscore.pdf', titulo: 'Altura para Idade - Meninos 0-5 anos (Z-score)' },
  { arquivo: 'altura_meninos_5-19_percentil.pdf', titulo: 'Altura para Idade - Meninos 5-19 anos (Percentil)' },
  { arquivo: 'altura_meninos_5-19_zscore.pdf', titulo: 'Altura para Idade - Meninos 5-19 anos (Z-score)' },
  { arquivo: 'imc_meninos_5-19_percentil.pdf', titulo: 'IMC para Idade - Meninos 5-19 anos (Percentil)' },
  { arquivo: 'imc_meninos_5-19_zscore.pdf', titulo: 'IMC para Idade - Meninos 5-19 anos (Z-score)' },
  { arquivo: 'OMS._IMC_Meninos__de_0_a_5_anos._Escore_Z.pdf', titulo: 'IMC para Idade - Meninos 0-5 anos (Escore Z)' },
  { arquivo: 'perimetro_cefalico_meninos_0-5_percentil.pdf', titulo: 'Perímetro Cefálico - Meninos 0-5 anos (Percentil)' },
  { arquivo: 'perimetro_cefalico_meninos_0-5_zscore.pdf', titulo: 'Perímetro Cefálico - Meninos 0-5 anos (Z-score)' },
  { arquivo: 'peso_meninos_0-5_percentil.pdf', titulo: 'Peso para Idade - Meninos 0-5 anos (Percentil)' },
  { arquivo: '\u007fpeso_meninos_0-5_zscore.pdf', nomeDownload: 'peso_meninos_0-5_zscore.pdf', titulo: 'Peso para Idade - Meninos 0-5 anos (Z-score)' },
  { arquivo: 'peso_meninos_5-10_percentil.pdf', titulo: 'Peso para Idade - Meninos 5-10 anos (Percentil)' },
  { arquivo: 'peso_meninos_5-10_zscore.pdf', titulo: 'Peso para Idade - Meninos 5-10 anos (Z-score)' },
];

export default function CurvasMeninosPage() {
  const [documentoSelecionado, setDocumentoSelecionado] = useState<DocumentoMenino | null>(null);

  useEffect(() => {
    if (!documentoSelecionado) return;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDocumentoSelecionado(null);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [documentoSelecionado]);

  const caminhoDocumento = (documento: DocumentoMenino) => `/docs/${encodeURIComponent(documento.arquivo)}`;

  return (
    <div className="migrated-page-container">
      <div className="conteudo">
        <a className="btn-voltar" href="/curvas-crescimento">
          <i className="las la-arrow-left" aria-hidden="true" /> Voltar
        </a>
        <h2><i className="las la-male" aria-hidden="true" /> Curvas de Crescimento - MENINOS</h2>
        <div className="documentos-grid">
          {documentosMeninos.map(documento => (
            <article className="doc-card" key={documento.arquivo}>
              <div className="doc-preview" aria-hidden="true"><i className="las la-file-pdf" /></div>
              <div className="doc-info">
                <div className="doc-titulo"><strong>{documento.titulo}</strong></div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn-doc btn-ver" type="button" onClick={() => setDocumentoSelecionado(documento)}>
                    <i className="las la-eye" aria-hidden="true" /> Ver
                  </button>
                  <a className="btn-doc btn-baixar" href={caminhoDocumento(documento)} download={documento.nomeDownload || documento.arquivo}>
                    <i className="las la-download" aria-hidden="true" /> Baixar
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {documentoSelecionado && (
        <div className="modal-pdf" style={{ display: 'flex' }} onClick={() => setDocumentoSelecionado(null)}>
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
                style={{ background: 'none', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer' }}
              >×</button>
            </header>
            <div className="modal-pdf-body">
              <iframe title={documentoSelecionado.titulo} src={caminhoDocumento(documentoSelecionado)} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
