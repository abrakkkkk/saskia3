'use client';

import { useState, useEffect } from 'react';

// Tipagem para os arquivos que vêm da API do Google
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink: string;
}

export default function BibliotecaPage() {
  const [documentos, setDocumentos] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const urlPastaDrive = "https://drive.google.com/drive/folders/1a0gzCh2yfoCIHQtQMRp-AJXuCPTAmoP6?usp=drive_link";

  useEffect(() => {
    async function buscarDocumentos() {
      try {
        const res = await fetch('/api/drive');
        if (!res.ok) {
          throw new Error('Falha ao comunicar com o Google Drive.');
        }
        const data = await res.json();
        
        // O array de arquivos vem dentro de data.files
        if (data.files) {
          setDocumentos(data.files);
        } else {
          setDocumentos([]);
        }
      } catch (err: any) {
        console.error(err);
        setErro('Não foi possível carregar os documentos da nuvem neste momento.');
      } finally {
        setLoading(false);
      }
    }

    buscarDocumentos();
  }, []);

  // Função simples para formatar bytes em MB ou KB
  const formatarTamanho = (bytesStr?: string) => {
    if (!bytesStr) return 'Tamanho desconhecido';
    const bytes = parseInt(bytesStr, 10);
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' bytes';
  };

  // Ícone dinâmico baseado no tipo do arquivo
  const getIcone = (mimeType: string) => {
    if (mimeType.includes('pdf')) return { icone: 'las la-file-pdf', cor: '#ef4444', fundo: '#fef2f2' };
    if (mimeType.includes('word') || mimeType.includes('document')) return { icone: 'las la-file-word', cor: '#3b82f6', fundo: '#eff6ff' };
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return { icone: 'las la-file-excel', cor: '#10b981', fundo: '#ecfdf5' };
    if (mimeType.includes('image')) return { icone: 'las la-image', cor: '#8b5cf6', fundo: '#ede9fe' };
    return { icone: 'las la-file-alt', cor: '#64748b', fundo: '#f1f5f9' };
  };

  return (
    <div>
      <div className="page-header" style={{ borderBottom: 'none' }}>
        <div className="header-left">
          <h2><i className="las la-book-medical"></i> Biblioteca Digital</h2>
        </div>
      </div>



      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', color: '#1e293b' }}>Documentos Disponíveis</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" className="input-field" placeholder="Buscar documento..." style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid #cbd5e1', width: '250px' }} />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <i className="las la-circle-notch la-spin" style={{ fontSize: '48px', color: '#3b82f6', marginBottom: '15px' }}></i>
            <p>Sincronizando com o Google Drive...</p>
          </div>
        ) : erro ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#fef2f2', color: '#ef4444', borderRadius: '12px' }}>
            <i className="las la-exclamation-triangle" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
            <p>{erro}</p>
          </div>
        ) : documentos.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
            <i className="las la-folder-open" style={{ fontSize: '48px', marginBottom: '10px', color: '#cbd5e1' }}></i>
            <p>A pasta do Google Drive está vazia.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {documentos.map((doc) => {
              const estilo = getIcone(doc.mimeType);
              return (
                <div key={doc.id} style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer' }} className="hover-shadow">
                  
                  <div style={{ width: '50px', height: '50px', borderRadius: '10px', background: estilo.fundo, color: estilo.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                    <i className={estilo.icone}></i>
                  </div>
                  
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.name}>
                      {doc.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Tamanho: {formatarTamanho(doc.size)}</div>
                  </div>
                  
                  <div>
                    <button 
                      onClick={() => window.open(doc.webViewLink, '_blank')}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '1px solid #cbd5e1', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      title="Visualizar/Baixar Documento"
                    >
                      <i className="las la-download"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
