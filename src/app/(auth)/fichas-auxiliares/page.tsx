'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  List, 
  Landmark, 
  University, 
  Pill, 
  UserCheck, 
  MoreHorizontal,
  Eye,
  Download,
  FileText,
  Activity,
  Brain,
  Dog,
  HeartPulse,
  Home,
  FileEdit,
  ClipboardCheck,
  Tablets,
  BookOpen
} from 'lucide-react';

interface Ficha {
  id: string;
  driveId?: string; // Para integração com API do Google Drive
  arquivo: string; // fallback para o nome se driveId não estiver presente
  titulo: string;
  instituicao: string;
  categoria: string;
  tags: string[];
  icone: any; // componente de ícone Lucide
}

const fichas: Ficha[] = [
  {
      id: '1',
      arquivo: "dole1.pdf",
      titulo: "Escore Internacional de Sintomas Prostáticos",
      instituicao: "UFRGS",
      categoria: "UFRGS",
      tags: ["Urologia", "Próstata", "Avaliação"],
      icone: UserCheck
  },
  {
      id: '2',
      arquivo: "reqmom.pdf",
      titulo: "Requisição de Mamografia",
      instituicao: "Saskia Saúde",
      categoria: "Atendimento",
      tags: ["Mamografia", "Saúde da Mulher", "Requisição"],
      icone: Activity
  },
  {
      id: '3',
      arquivo: "MSS1.pdf",
      titulo: "Hanseníase - Tabela de Avaliação Neurológica",
      instituicao: "Ministério da Saúde",
      categoria: "MS",
      tags: ["Hanseníase", "Neurologia", "Avaliação"],
      icone: Brain
  },
  {
      id: '4',
      arquivo: "MRPA.pdf",
      titulo: "Medição Residencial da Pressão Arterial",
      instituicao: "Saskia Saúde",
      categoria: "Atendimento",
      tags: ["Pressão Arterial", "Cardiologia", "MRPA"],
      icone: HeartPulse
  },
  {
      id: '5',
      arquivo: "mpmp.pdf",
      titulo: "Medicamentos e Insumos do Programa Farmácia Popular",
      instituicao: "Farmácia Popular",
      categoria: "Farmácia",
      tags: ["Farmácia Popular", "Medicamentos", "Insumos"],
      icone: Pill
  },
  {
      id: '6',
      arquivo: "Hanseniasev5.pdf",
      titulo: "Hanseníase v5 - Ficha de Avaliação",
      instituicao: "Ministério da Saúde",
      categoria: "MS",
      tags: ["Hanseníase", "Avaliação", "Protocolo"],
      icone: FileText
  },
  {
      id: '7',
      arquivo: "FLMEP1.pdf",
      titulo: "Formulário LME Padrão 1",
      instituicao: "Ministério da Saúde",
      categoria: "MS",
      tags: ["LME", "Medicamentos", "Formulário"],
      icone: FileText
  },
  {
      id: '8',
      arquivo: "FPVD1.pdf",
      titulo: "Ficha para Visitas Domiciliares",
      instituicao: "Saskia Saúde",
      categoria: "Atendimento",
      tags: ["Visita Domiciliar", "APS", "Saúde da Família"],
      icone: Home
  },
  {
      id: '9',
      arquivo: "FIDFCv5.pdf",
      titulo: "Ficha de Investigação Dengue e Febre de Chikungunya v5",
      instituicao: "Ministério da Saúde",
      categoria: "MS",
      tags: ["Dengue", "Chikungunya", "Vigilância"],
      icone: Activity
  },
  {
      id: '10',
      arquivo: "FAIs1.pdf",
      titulo: "Ficha de Atendimento Individual",
      instituicao: "Saskia Saúde",
      categoria: "Atendimento",
      tags: ["Atendimento", "Individual", "Prontuário"],
      icone: FileEdit
  },
  {
      id: '11',
      arquivo: "FAICOUs2.pdf",
      titulo: "Ficha de Atendimento Individual com Orientações de Uso",
      instituicao: "Saskia Saúde",
      categoria: "Atendimento",
      tags: ["Atendimento", "Orientações", "Individual"],
      icone: ClipboardCheck
  },
  {
      id: '12',
      arquivo: "MIt1.pdf",
      titulo: "Farmácia Popular - Medicamentos e Insumos",
      instituicao: "Farmácia Popular",
      categoria: "Farmácia",
      tags: ["Farmácia Popular", "Medicamentos", "Tabela"],
      icone: Tablets
  },
  {
      id: '13',
      arquivo: "DIDEC.pdf",
      titulo: "Diário de Cefaléias",
      instituicao: "Saskia Saúde",
      categoria: "Outros",
      tags: ["Cefaléia", "Diário", "Neurologia"],
      icone: BookOpen
  },
  {
      id: '14',
      arquivo: "TFPs3.pdf",
      titulo: "Como Tratar a Fascite Plantar",
      instituicao: "Saskia Saúde",
      categoria: "Outros",
      tags: ["Fascite Plantar", "Ortopedia", "Tratamento"],
      icone: Activity
  },
  {
      id: '15',
      arquivo: "AARHv2.pdf",
      titulo: "Atendimento Antirrábico Humano v2",
      instituicao: "Ministério da Saúde",
      categoria: "MS",
      tags: ["Raiva", "Antirrábico", "Protocolo"],
      icone: Dog
  },
  {
      id: '16',
      arquivo: "APACP.pdf",
      titulo: "APAC Preenchível",
      instituicao: "Ministério da Saúde",
      categoria: "MS",
      tags: ["APAC", "Autorização", "SUS"],
      icone: FileText
  }
];

export default function FichasAuxiliaresPage() {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
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

  const categoriasMenu = [
    { nome: 'Todas', icone: List },
    { nome: 'MS', icone: Landmark },
    { nome: 'UFRGS', icone: University },
    { nome: 'Farmácia', icone: Pill },
    { nome: 'Atendimento', icone: UserCheck },
    { nome: 'Outros', icone: MoreHorizontal }
  ];

  const fichasFiltradas = useMemo(() => {
    let filtradas = fichas;
    
    if (categoriaAtiva !== 'Todas') {
      filtradas = filtradas.filter(f => f.categoria === categoriaAtiva);
    }
    
    if (busca.trim()) {
      const t = busca.toLowerCase();
      filtradas = filtradas.filter(f => 
        f.titulo.toLowerCase().includes(t) || 
        f.instituicao.toLowerCase().includes(t) || 
        f.tags.some(tag => tag.toLowerCase().includes(t))
      );
    }
    
    return filtradas;
  }, [busca, categoriaAtiva]);

  const handleDriveAction = (ficha: Ficha, action: 'view' | 'download') => {
    const driveFile = driveFiles.find(f => f.name === ficha.arquivo);
    
    if (!driveFile) {
      alert(`Arquivo "${ficha.arquivo}" não encontrado no Google Drive.`);
      return;
    }
    
    if (action === 'download' && driveFile.webContentLink) {
      window.open(driveFile.webContentLink, '_blank');
    } else {
      window.open(driveFile.webViewLink, '_blank');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-8 shadow-xl text-white gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-300" />
            Fichas Auxiliares
          </h1>
          <p className="text-slate-300 mt-2 font-medium">Formulários, protocolos e documentos técnicos para download</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ficha por nome, instituição ou palavra-chave..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {categoriasMenu.map(cat => {
          const Icone = cat.icone;
          const ativo = categoriaAtiva === cat.nome;
          const count = cat.nome === 'Todas' ? fichas.length : fichas.filter(f => f.categoria === cat.nome).length;
          
          return (
            <button 
              key={cat.nome}
              onClick={() => setCategoriaAtiva(cat.nome)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 text-sm ${
                ativo 
                  ? 'bg-blue-700 text-white shadow-lg shadow-blue-200' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-sm'
              }`}
            >
              <Icone className="w-4 h-4" />
              {cat.nome}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ativo ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {fichasFiltradas.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-4">
            <Search className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhuma ficha encontrada</h3>
          <p className="text-slate-500">Tente outro termo de busca ou selecione outra categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fichasFiltradas.map(ficha => {
            const Icon = ficha.icone;
            return (
              <div key={ficha.id} className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(30,58,138,0.08)] hover:-translate-y-1 flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-700 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:scale-110 transition-transform duration-300 group-hover:bg-blue-600 group-hover:text-white">
                  <Icon className="w-7 h-7" />
                </div>
                
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">
                  {ficha.instituicao}
                </span>
                
                <h4 className="text-[15px] font-bold text-slate-800 leading-snug mb-4 flex-1">
                  {ficha.titulo}
                </h4>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {ficha.tags.map(tag => (
                    <span key={tag} className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-100">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => handleDriveAction(ficha, 'view')}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 font-semibold py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                  <button 
                    onClick={() => handleDriveAction(ficha, 'download')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 font-semibold py-2.5 rounded-xl hover:bg-green-600 hover:text-white transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
