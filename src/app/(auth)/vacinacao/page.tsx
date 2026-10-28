'use client';

import { useState, useEffect } from 'react';
import {
  Syringe,
  FileText,
  Eye,
  Download
} from 'lucide-react';

interface VacinaDoc {
  id: string;
  nome: string;
  titulo: string;
  driveId?: string;
}

const documentosVacinas: VacinaDoc[] = [
  { id: '1', nome: "0_A_10_ANOS.pdf", titulo: "Vacinação - 0 a 10 anos", driveId: '' },
  { id: '2', nome: "10_A_19_ANOS.pdf", titulo: "Vacinação - 10 a 19 anos", driveId: '' },
  { id: '3', nome: "20_A_59_ANOS.pdf", titulo: "Vacinação - 20 a 59 anos", driveId: '' },
  { id: '4', nome: "60_ANOS_E_MAIORES.pdf", titulo: "Vacinação - 60 anos e maiores", driveId: '' },
  { id: '5', nome: "DM-PNEUMO-HEPATO-NEFRO-ESPLENO-IMUNO-HIV-ONCO-TRANSPLANTADOS-TCTH-ESPECIAIS.pdf", titulo: "Vacinação - Grupos Especiais", driveId: '' },
  { id: '6', nome: "GESTANTES.pdf", titulo: "Vacinação - Gestantes", driveId: '' },
  { id: '7', nome: "OCUPACIONAIS_POR_ÁREA_DE_ATUAÇÃO.pdf", titulo: "Vacinação - Ocupacionais", driveId: '' },
  { id: '8', nome: "PNEUMOCÓCICAS.pdf", titulo: "Vacinação - Pneumocócicas", driveId: '' },
  { id: '9', nome: "PRE-MATUROS.pdf", titulo: "Vacinação - Pré-maturos", driveId: '' },
  { id: '10', nome: "RN_AO_IDOSO.pdf", titulo: "Vacinação - Recém-nascido ao Idoso", driveId: '' },
  { id: '11', nome: "RN_AOS_19_ANOS.pdf", titulo: "Vacinação - Recém-nascido aos 19 anos", driveId: '' },
  { id: '12', nome: "VINTE_AOS_60+.pdf", titulo: "Vacinação - 20 aos 60+ anos", driveId: '' }
];

export default function VacinacaoPage() {
  const [driveFiles, setDriveFiles] = useState<Array<{
    name: string;
    webViewLink?: string;
    webContentLink?: string;
  }>>([]);
  const [driveIndisponivel, setDriveIndisponivel] = useState(false);

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        const res = await fetch('/api/drive');
        if (!res.ok) throw new Error('Drive indisponível');
        const data: unknown = await res.json();
        if (!data || typeof data !== 'object' || !('files' in data) || !Array.isArray(data.files)) {
          throw new Error('Resposta inválida do Drive');
        }
        setDriveFiles(data.files.filter((file): file is { name: string; webViewLink?: string; webContentLink?: string } => (
          Boolean(file) && typeof file === 'object' && 'name' in file && typeof file.name === 'string'
        )).map(file => ({
          name: file.name,
          webViewLink: 'webViewLink' in file && typeof file.webViewLink === 'string' ? file.webViewLink : undefined,
          webContentLink: 'webContentLink' in file && typeof file.webContentLink === 'string' ? file.webContentLink : undefined,
        })));
        setDriveIndisponivel('configured' in data && data.configured === false);
      } catch {
        setDriveFiles([]);
        setDriveIndisponivel(true);
      }
    };
    fetchDriveFiles();
  }, []);
  const handleDriveAction = (doc: VacinaDoc, action: 'view' | 'download') => {
    const driveFile = driveFiles.find(f => f.name === doc.nome);
    const remoteLink = driveFile && (action === 'download' ? driveFile.webContentLink : driveFile.webViewLink);
    let remoteUrl: URL | null = null;
    if (remoteLink) {
      try {
        const parsed = new URL(remoteLink);
        if (parsed.protocol === 'https:' && (parsed.hostname === 'drive.google.com'
          || parsed.hostname === 'docs.google.com' || parsed.hostname.endsWith('.googleusercontent.com'))) {
          remoteUrl = parsed;
        }
      } catch {
        remoteUrl = null;
      }
    }

    if (remoteUrl) {
      window.open(remoteUrl.href, '_blank', 'noopener,noreferrer');
      return;
    }

    // Suporte local seguro (offline-first para vacinação)
    const filePath = `/docs/${encodeURIComponent(doc.nome)}`;

    if (action === 'download') {
      const a = document.createElement('a');
      a.href = filePath;
      a.download = doc.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(filePath, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-900 to-blue-700 p-8 rounded-3xl shadow-lg text-white">
        <div className="bg-white/20 p-4 rounded-2xl">
          <Syringe className="w-10 h-10 text-blue-50" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vacinas - Idades e Grupos</h1>
          <p className="text-blue-100 mt-1 font-medium">Calendários vacinais por faixa etária</p>
        </div>
      </div>

      {driveIndisponivel && (
        <p role="status" className="text-sm text-slate-600">
          O catálogo remoto não está disponível agora. Os documentos locais continuam acessíveis.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {documentosVacinas.map((doc) => (
          <div key={doc.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 flex flex-col">
            <div className="bg-emerald-50 p-8 flex items-center justify-center border-b border-emerald-100">
              <FileText className="w-16 h-16 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h4 className="font-bold text-slate-800 text-[15px] leading-snug mb-2 line-clamp-3">
                {doc.titulo}
              </h4>
              <div className="mt-auto pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDriveAction(doc, 'view')}
                  aria-label={`Visualizar ${doc.titulo}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 font-semibold py-2.5 rounded-xl hover:bg-emerald-600 hover:text-white transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => handleDriveAction(doc, 'download')}
                  aria-label={`Baixar ${doc.titulo}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Baixar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
