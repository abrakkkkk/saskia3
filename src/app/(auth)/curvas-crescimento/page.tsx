'use client';

import { useState, useEffect } from 'react';
import { 
  ChartLine, 
  Baby, 
  FileText, 
  Eye, 
  Download 
} from 'lucide-react';
import './curvas-crescimento.css';

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
  const [driveFiles, setDriveFiles] = useState<any[]>([]);

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
    
    const remoteUrl = action === 'download' ? driveFile?.webContentLink : driveFile?.webViewLink;
    if (typeof remoteUrl === 'string') {
      try {
        const parsedUrl = new URL(remoteUrl);
        const hostPermitido = parsedUrl.hostname === 'google.com'
          || parsedUrl.hostname.endsWith('.google.com')
          || parsedUrl.hostname === 'googleusercontent.com'
          || parsedUrl.hostname.endsWith('.googleusercontent.com');
        if (parsedUrl.protocol === 'https:' && hostPermitido) {
          window.open(parsedUrl.href, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {
        // Link remoto inválido: segue para o arquivo local.
      }
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
      window.open(filePath, '_blank');
    }
  };

  const listaAtual = abaAtiva === 'meninas' ? curvasMeninas : curvasMeninos;

  return (
    <div className="curvas-page p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 bg-gradient-to-r from-blue-900 to-blue-700 p-5 sm:p-7 rounded-2xl shadow-lg text-white">
        <div aria-hidden="true" className="bg-white/20 p-3 rounded-xl shrink-0">
          <ChartLine className="w-8 h-8 sm:w-9 sm:h-9 text-blue-50" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight leading-tight">Curvas de Peso e Crescimento</h1>
          <p className="text-blue-100 mt-2 text-sm sm:text-base font-medium">Tabelas OMS de crescimento infantil</p>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm w-full mx-auto" role="group" aria-label="Selecionar curva de crescimento">
        <button
          type="button"
          aria-pressed={abaAtiva === 'meninas'}
          onClick={() => setAbaAtiva('meninas')}
          className={`flex-1 min-h-12 py-3 px-3 sm:px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
            abaAtiva === 'meninas' 
              ? 'bg-white text-pink-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Baby aria-hidden="true" className="w-5 h-5" /> Meninas
        </button>
        <button
          type="button"
          aria-pressed={abaAtiva === 'meninos'}
          onClick={() => setAbaAtiva('meninos')}
          className={`flex-1 min-h-12 py-3 px-3 sm:px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
            abaAtiva === 'meninos' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Baby aria-hidden="true" className="w-5 h-5" /> Meninos
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
        {listaAtual.map((curva) => (
          <div key={curva.id} className="curva-card bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex flex-col">
            <div aria-hidden="true" className={`py-6 flex items-center justify-center border-b border-slate-100 ${
              abaAtiva === 'meninas' ? 'bg-pink-50' : 'bg-blue-50'
            }`}>
              <FileText className={`w-12 h-12 ${
                abaAtiva === 'meninas' ? 'text-pink-300' : 'text-blue-300'
              }`} strokeWidth={1.5} />
            </div>
            <div className="p-4 sm:p-5 flex flex-col flex-1">
              <h2 className="font-bold text-slate-800 text-sm leading-snug mb-2 line-clamp-3">
                {curva.titulo}
              </h2>
              <div className="mt-auto pt-4 flex flex-col min-[360px]:flex-row gap-2">
                <button 
                  onClick={() => handleDriveAction(curva, 'view')}
                  className={`flex-1 min-h-11 flex items-center justify-center gap-2 font-semibold py-2.5 rounded-lg transition-colors text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    abaAtiva === 'meninas'
                      ? 'bg-pink-50 text-pink-700 hover:bg-pink-600 hover:text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <Eye aria-hidden="true" className="w-4 h-4" />
                  Ver
                </button>
                <button 
                  onClick={() => handleDriveAction(curva, 'download')}
                  className="flex-1 min-h-11 flex items-center justify-center gap-2 bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  <Download aria-hidden="true" className="w-4 h-4" />
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
