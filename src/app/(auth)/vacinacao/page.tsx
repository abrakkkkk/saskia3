'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { DocCard, DocGrid } from '@/components/ui/documentos';
import { PageHeader } from '@/components/ui';

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
    <div className="conteudo">
      <PageHeader icon="las la-syringe" title="Calendários de vacinação" subtitle="Consulta a calendários vacinais em PDF. Não registra doses aplicadas." />

      {driveIndisponivel && (
        <p role="status" className="ui-doc-aviso">
          O catálogo remoto não está disponível agora. Os documentos locais continuam acessíveis.
        </p>
      )}

      <DocGrid>
        {documentosVacinas.map((doc) => (
          <DocCard
            key={doc.id}
            icone={<FileText size={20} />}
            titulo={doc.titulo}
            nivel={2}
            onVer={() => handleDriveAction(doc, 'view')}
            onBaixar={() => handleDriveAction(doc, 'download')}
          />
        ))}
      </DocGrid>
    </div>
  );
}
