'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Book, 
  ChartLine, 
  Syringe, 
  FileText, 
  Eye, 
  Download,
  Image as ImageIcon
} from 'lucide-react';

interface Documento {
  id: string;
  nome: string;
  titulo: string;
  tipo: 'pdf' | 'imagem';
  driveId?: string; // Para futura integração com API do Google Drive
  arquivoLocal?: string;
}

export default function BibliotecaPage() {
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    { id: '8', nome: 'Diretriz_Brasileira_de_Dislipidemias.pdf', titulo: 'Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose 2025', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_8' },
    { id: '9', nome: 'Diretriz_Brasileira_Hipertensao_2025.pdf', titulo: 'Diretriz Brasileira Hipertensão 2025', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_9' },
    { id: '10', nome: 'Epilepsia_Guia_Pratico.pdf', titulo: 'Epilepsia - Guia Prático', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_10', arquivoLocal: 'Epilepsia_-_Guia Prático.pdf' },
    { id: '11', nome: 'GUIA_PES_DIABETICOS.pdf', titulo: 'Guia de Cuidado com os Pés para Pacientes Diabéticos', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_11', arquivoLocal: 'GUIA_DE_CUIDADO_COM_OS_PÉS_PARA_PACIENTES_DIABÉTICOS_PACIENTE.pdf' },
    { id: '12', nome: 'Infeccoes_Sexualmente_Transmissiveis_PCDT.pdf', titulo: 'Infecções Sexualmente Transmissíveis PCDT', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_12', arquivoLocal: 'Infecções_Sexualmente_Transmissíveis_PCDT.pdf' },
    { id: '13', nome: 'Manual_Gestacao_Alto_Risco.pdf', titulo: 'Manual Gestação Alto Risco', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_13' },
    { id: '14', nome: 'Praticas_Cuidado_LGBTQIA+.pdf', titulo: 'Práticas de Cuidado LGBTQIA+', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_14', arquivoLocal: 'Práticas_de_Cuidado_LGBTQIA+.pdf' },
    { id: '15', nome: 'Protocolo_pessoas_Trans_2023.pdf', titulo: 'Protocolo Atendimento Pessoas Trans 2023', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_15', arquivoLocal: 'Protocolo_atendimento_pessoas_Trans_2023.pdf' },
    { id: '16', nome: 'TABELA_KDIGO.png', titulo: 'Tabela KDIGO', tipo: 'imagem', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_16' },
    { id: '17', nome: 'estrategia_antirracista.pdf', titulo: 'Estratégia Antirracista para a Saúde 2025', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_17' },
    { id: '18', nome: 'manual_oncologia.pdf', titulo: 'Manual de Oncologia para não Oncologistas', tipo: 'pdf', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_18' },
    { id: '19', nome: 'tabela_risco_cardiovascular.png', titulo: 'Tabela de Risco Cardiovascular', tipo: 'imagem', driveId: 'COLOQUE_O_ID_DO_DRIVE_AQUI_19' }
  ];

  const handleDriveAction = (doc: Documento, action: 'view' | 'download') => {
    const driveFile = driveFiles.find(f => f.name === doc.nome);
    
    if (driveFile) {
      if (action === 'download' && driveFile.webContentLink) {
        window.open(driveFile.webContentLink, '_blank');
      } else {
        window.open(driveFile.webViewLink, '_blank');
      }
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
      window.open(filePath, '_blank');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center gap-4 bg-gradient-to-r from-blue-900 to-blue-700 p-8 rounded-3xl shadow-lg text-white">
        <div className="bg-white/20 p-4 rounded-2xl">
          <Book className="w-10 h-10 text-blue-50" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca de Documentos</h1>
          <p className="text-blue-100 mt-1 font-medium">Manuais, protocolos e referências técnicas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/curvas-crescimento" className="group block">
          <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(30,58,138,0.1)] hover:-translate-y-1 flex items-center gap-6">
            <div className="bg-blue-50 p-5 rounded-2xl group-hover:bg-blue-600 transition-colors duration-300">
              <ChartLine className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">Curvas de Crescimento</h3>
              <p className="text-slate-500 mt-1">Tabelas OMS de crescimento infantil</p>
            </div>
          </div>
        </Link>

        <Link href="/vacinacao" className="group block">
          <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(30,58,138,0.1)] hover:-translate-y-1 flex items-center gap-6">
            <div className="bg-blue-50 p-5 rounded-2xl group-hover:bg-blue-600 transition-colors duration-300">
              <Syringe className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">Vacinas - Idades e Grupos</h3>
              <p className="text-slate-500 mt-1">Calendários vacinais por faixa etária</p>
            </div>
          </div>
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-slate-100">
          <FileText className="w-6 h-6 text-blue-800" />
          <h2 className="text-2xl font-bold text-slate-800">Documentos Técnicos e Protocolos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {documentos.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 flex flex-col">
              <div className="bg-slate-50 p-8 flex items-center justify-center border-b border-slate-100">
                {doc.tipo === 'imagem' ? (
                  <ImageIcon className="w-16 h-16 text-blue-300" strokeWidth={1.5} />
                ) : (
                  <FileText className="w-16 h-16 text-blue-300" strokeWidth={1.5} />
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h4 className="font-bold text-slate-800 text-[15px] leading-tight mb-2 line-clamp-3" title={doc.titulo}>
                  {doc.titulo}
                </h4>
                <div className="mt-auto pt-4 flex gap-2">
                  <button 
                    onClick={() => handleDriveAction(doc, 'view')}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 font-semibold py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                  <button 
                    onClick={() => handleDriveAction(doc, 'download')}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
