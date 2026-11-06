'use client';

import { useState, useEffect } from 'react';
import { ChartLine, Syringe, FileText, Image as ImageIcon } from 'lucide-react';

import { DocAtalho, DocCard, DocGrid, DocSection } from '@/components/ui/documentos';
import { PageHeader } from '@/components/ui';
import { urlGoogleSegura } from '../setores-ui';

interface Documento {
  id: string;
  nome: string;
  titulo: string;
  tipo: 'pdf' | 'imagem';
  driveId?: string; // Para futura integração com API do Google Drive
  arquivoLocal?: string;
}

interface DriveFile {
  name: string;
  webViewLink?: string;
  webContentLink?: string;
}

export default function BibliotecaPage() {
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [driveUnavailable, setDriveUnavailable] = useState(false);

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        const res = await fetch('/api/drive');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.files)) {
            setDriveFiles(data.files.filter((file: unknown): file is DriveFile => (
              typeof file === 'object' && file !== null &&
              'name' in file && typeof file.name === 'string'
            )));
          }
          setDriveUnavailable(data.configured === false);
        } else {
          setDriveUnavailable(true);
        }
      } catch (err) {
        console.error("Erro ao buscar arquivos do Drive", err);
        setDriveUnavailable(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDriveFiles();
  }, []);

  // Lista unificada de documentos
  const documentos: Documento[] = [
    { id: '1', nome: 'aspectos_pele.pdf', titulo: 'Aspectos Dermatológicos da Pele Negra', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_1' },
    { id: '2', nome: 'atlas_pele.pdf', titulo: 'Atlas Dermatológico Pele Negra e Parda - Inglês', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_2' },
    { id: '3', nome: 'protocolo_violencia.pdf', titulo: 'Protocolo de cuidados e enfrentamento da violência contra mulher', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_3' },
    { id: '4', nome: 'recomendacoes.pdf', titulo: 'Recomendações para o Diagnóstico e Tratamento das Vaginites', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_4' },
    { id: '5', nome: 'mapasmentaisinterpexames.pdf', titulo: 'Mapas Mentais - Interpretação de Exames', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_5' },
    { id: '6', nome: 'examelabcorrelacaoclinica1.pdf', titulo: 'Interpretação de Exames Laboratoriais e Correlação Clínica', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_6', arquivoLocal: 'examelabcorrelaçãoclinica1.pdf' },
    { id: '7', nome: 'Cuidado_com_a_populacao_de_rua.pdf', titulo: 'Cuidado com a população de rua', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_7', arquivoLocal: 'Cuidado_com_a_população_de_rua.pdf' },
    { id: '8', nome: 'Diretriz_Brasileira_de_Dislipidemias.pdf', titulo: 'Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose 2025', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_8', arquivoLocal: 'Diretriz_Brasileira_de_Dislipidemias_e_Prevencao_da_Aterosclerose_2025.pdf' },
    { id: '9', nome: 'Diretriz_Brasileira_Hipertensao_2025.pdf', titulo: 'Diretriz Brasileira Hipertensão 2025', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_9', arquivoLocal: 'Diretriz_Brasileira_Hipertensão_2025.pdf' },
    { id: '10', nome: 'Epilepsia_Guia_Pratico.pdf', titulo: 'Epilepsia - Guia Prático', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_10', arquivoLocal: 'Epilepsia_-_Guia Prático.pdf' },
    { id: '11', nome: 'GUIA_PES_DIABETICOS.pdf', titulo: 'Guia de Cuidado com os Pés para Pacientes Diabéticos', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_11', arquivoLocal: 'GUIA_DE_CUIDADO_COM_OS_PÉS_PARA_PACIENTES_DIABÉTICOS_PACIENTE.pdf' },
    { id: '12', nome: 'Infeccoes_Sexualmente_Transmissiveis_PCDT.pdf', titulo: 'Infecções Sexualmente Transmissíveis PCDT', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_12', arquivoLocal: 'Infecções_Sexualmente_Transmissíveis_PCDT.pdf' },
    { id: '13', nome: 'Manual_Gestacao_Alto_Risco.pdf', titulo: 'Manual Gestação Alto Risco', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_13', arquivoLocal: 'Manual_Gestação_Alto_Risco.pdf' },
    { id: '14', nome: 'Praticas_Cuidado_LGBTQIA+.pdf', titulo: 'Práticas de Cuidado LGBTQIA+', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_14', arquivoLocal: 'Práticas_de_Cuidado_LGBTQIA+.pdf' },
    { id: '15', nome: 'Protocolo_pessoas_Trans_2023.pdf', titulo: 'Protocolo Atendimento Pessoas Trans 2023', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_15', arquivoLocal: 'Protocolo_atendimento_pessoas_Trans_2023.pdf' },
    { id: '16', nome: 'TABELA_KDIGO.png', titulo: 'Tabela KDIGO', tipo: 'imagem', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_16' },
    { id: '17', nome: 'estrategia_antirracista.pdf', titulo: 'Estratégia Antirracista para a Saúde 2025', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_17' },
    { id: '18', nome: 'manual_oncologia.pdf', titulo: 'Manual de Oncologia para não Oncologistas', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_18' },
    { id: '19', nome: 'tabela_risco_cardiovascular.png', titulo: 'Tabela de Risco Cardiovascular', tipo: 'imagem', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_19' }
  ];

  const handleDriveAction = (doc: Documento, action: 'view' | 'download') => {
    const driveFile = driveFiles.find(f => f.name === doc.nome);
    
    const remoteUrl = urlGoogleSegura(action === 'download'
      ? driveFile?.webContentLink ?? driveFile?.webViewLink
      : driveFile?.webViewLink);

    if (remoteUrl) {
      window.open(remoteUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Suporte local seguro (offline-first para ambiente hospitalar)
    const filePath = doc.tipo === 'imagem' 
      ? (doc.nome === 'TABELA_KDIGO.png' || doc.nome === 'tabela_risco_cardiovascular.png' ? `/images/${doc.nome}` : `/docs/${doc.nome}`)
      : `/docs/${encodeURIComponent(doc.arquivoLocal ?? doc.nome)}`;

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
      <PageHeader icon="las la-book" title="Biblioteca" subtitle="Manuais, protocolos e referências técnicas" />

      <DocGrid>
        <DocAtalho href="/curvas-crescimento" icone={<ChartLine size={20} />} titulo="Curvas de crescimento" descricao="Tabelas OMS de crescimento infantil" />
        <DocAtalho href="/vacinacao" icone={<Syringe size={20} />} titulo="Calendários de vacinação" descricao="Calendários vacinais por faixa etária" />
      </DocGrid>

      <DocSection titulo="Documentos técnicos e protocolos">
        {loading && <p className="ui-doc-aviso" role="status">Verificando disponibilidade do acervo online…</p>}
        {!loading && driveUnavailable && (
          <p className="ui-doc-aviso" role="status">
            Acervo online indisponível no momento. Os documentos locais continuam disponíveis.
          </p>
        )}
        <DocGrid>
          {documentos.map((doc) => (
            <DocCard
              key={doc.id}
              icone={doc.tipo === 'imagem' ? <ImageIcon size={20} /> : <FileText size={20} />}
              titulo={doc.titulo}
              onVer={() => handleDriveAction(doc, 'view')}
              onBaixar={() => handleDriveAction(doc, 'download')}
            />
          ))}
        </DocGrid>
      </DocSection>
    </div>
  );
}
