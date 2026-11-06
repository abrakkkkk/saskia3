'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader, Tabs } from '@/components/ui';
import { DocCard, DocGrid } from '@/components/ui/documentos';
import { urlGoogleSegura } from '../setores-ui';

const ABAS = [
  { id: 'meninas', label: 'Meninas' },
  { id: 'meninos', label: 'Meninos' },
] as const;

interface Curva {
  id: string;
  nome: string;
  titulo: string;
  localNome?: string;
  driveId?: string; // Para integração com API do Google Drive
}

const curvasMeninas: Curva[] = [
  { id: '1', nome: 'altura_meninas_0-5_percentil.pdf', titulo: 'Altura por Idade (0 a 5 anos) - Percentil', driveId: '' },
  { id: '2', nome: 'altura_meninas_0-5_zscore.pdf', titulo: 'Altura por Idade (0 a 5 anos) - Escore Z', driveId: '' },
  { id: '3', nome: 'altura_meninas_5-19_percentil.pdf', titulo: 'Altura por Idade (5 a 19 anos) - Percentil', driveId: '' },
  { id: '4', nome: 'altura_meninas_5-19_zscore.pdf', titulo: 'Altura por Idade (5 a 19 anos) - Escore Z', driveId: '' },
  { id: '5', nome: 'imc_meninas_0-5_escore_z.pdf', titulo: 'IMC por Idade (0 a 5 anos) - Escore Z', driveId: '' },
  { id: '6', nome: 'imc_meninas_5-19_percentil.pdf', titulo: 'IMC por Idade (5 a 19 anos) - Percentil', driveId: '' },
  { id: '7', nome: 'imc_meninas_5-19_zscore.pdf', titulo: 'IMC por Idade (5 a 19 anos) - Escore Z', driveId: '' },
  { id: '8', nome: 'perimetro_cefalico_meninas_0-5_percentil.pdf', titulo: 'Perímetro Cefálico (0 a 5 anos) - Percentil', driveId: '' },
  { id: '9', nome: 'perimetro_cefalico_meninas_0-5_zscore.pdf', titulo: 'Perímetro Cefálico (0 a 5 anos) - Escore Z', driveId: '' },
  { id: '10', nome: 'peso_meninas_0-5_percentil.pdf', titulo: 'Peso por Idade (0 a 5 anos) - Percentil', driveId: '' },
  { id: '11', nome: 'peso_meninas_5-10_percentil.pdf', titulo: 'Peso por Idade (5 a 10 anos) - Percentil', driveId: '' },
  { id: '12', nome: 'peso_meninas_5-10_zscore.pdf', titulo: 'Peso por Idade (5 a 10 anos) - Escore Z', driveId: '' },
];

const curvasMeninos: Curva[] = [
  { id: '13', nome: 'altura_meninos_0-5_percentil.pdf', titulo: 'Altura por Idade (0 a 5 anos) - Percentil', driveId: '' },
  { id: '14', nome: 'altura_meninos_0-5_zscore.pdf', titulo: 'Altura por Idade (0 a 5 anos) - Escore Z', driveId: '' },
  { id: '15', nome: 'altura_meninos_5-19_percentil.pdf', titulo: 'Altura por Idade (5 a 19 anos) - Percentil', driveId: '' },
  { id: '16', nome: 'altura_meninos_5-19_zscore.pdf', titulo: 'Altura por Idade (5 a 19 anos) - Escore Z', driveId: '' },
  { id: '17', nome: 'OMS._IMC_Meninos__de_0_a_5_anos._Escore_Z.pdf', titulo: 'IMC por Idade (0 a 5 anos) - Escore Z', driveId: '' },
  { id: '18', nome: 'imc_meninos_5-19_percentil.pdf', titulo: 'IMC por Idade (5 a 19 anos) - Percentil', driveId: '' },
  { id: '19', nome: 'imc_meninos_5-19_zscore.pdf', titulo: 'IMC por Idade (5 a 19 anos) - Escore Z', driveId: '' },
  { id: '20', nome: 'perimetro_cefalico_meninos_0-5_percentil.pdf', titulo: 'Perímetro Cefálico (0 a 5 anos) - Percentil', driveId: '' },
  { id: '21', nome: 'perimetro_cefalico_meninos_0-5_zscore.pdf', titulo: 'Perímetro Cefálico (0 a 5 anos) - Escore Z', driveId: '' },
  { id: '22', nome: 'peso_meninos_0-5_percentil.pdf', titulo: 'Peso por Idade (0 a 5 anos) - Percentil', driveId: '' },
  { id: '23', nome: 'peso_meninos_0-5_zscore.pdf', localNome: '\u007fpeso_meninos_0-5_zscore.pdf', titulo: 'Peso por Idade (0 a 5 anos) - Escore Z', driveId: '' },
  { id: '24', nome: 'peso_meninos_5-10_percentil.pdf', titulo: 'Peso por Idade (5 a 10 anos) - Percentil', driveId: '' },
  { id: '25', nome: 'peso_meninos_5-10_zscore.pdf', titulo: 'Peso por Idade (5 a 10 anos) - Escore Z', driveId: '' },
];

export default function CurvasCrescimentoPage() {
  const [abaAtiva, setAbaAtiva] = useState<'meninas' | 'meninos'>('meninas');
  const [driveFiles, setDriveFiles] = useState<Array<{ name?: string; webViewLink?: string; webContentLink?: string }>>([]);

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        const res = await fetch('/api/drive');
        if (res.ok) {
          const data = await res.json();
          if (data.files) {
            setDriveFiles(data.files);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar arquivos do Drive", err);
      }
    };
    fetchDriveFiles();
  }, []);

  const handleDriveAction = (curva: Curva, action: 'view' | 'download') => {
    const driveFile = driveFiles.find(f => f.name === curva.nome);
    
    const remoteUrl = urlGoogleSegura(action === 'download' ? driveFile?.webContentLink : driveFile?.webViewLink);
    if (remoteUrl) {
      window.open(remoteUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Suporte local seguro (offline-first para pediatria)
    const filePath = `/docs/${encodeURIComponent(curva.localNome ?? curva.nome)}`;

    if (action === 'download') {
      const a = document.createElement('a');
      a.href = filePath;
      a.download = curva.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(filePath, '_blank', 'noopener,noreferrer');
    }
  };

  const listaAtual = abaAtiva === 'meninas' ? curvasMeninas : curvasMeninos;

  return (
    <div className="conteudo">
      <PageHeader icon="las la-chart-line" title="Curvas de peso e crescimento" subtitle="Tabelas OMS de crescimento infantil" />

      <Tabs tabs={ABAS} active={abaAtiva} onChange={setAbaAtiva} label="Selecionar curva de crescimento" />

      <DocGrid>
        {listaAtual.map((curva) => (
          <DocCard
            key={curva.id}
            icone={<FileText size={20} />}
            titulo={curva.titulo}
            nivel={2}
            onVer={() => handleDriveAction(curva, 'view')}
            onBaixar={() => handleDriveAction(curva, 'download')}
          />
        ))}
      </DocGrid>
    </div>
  );
}
